import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Store } from './store.js';
import type { Gratitude, Profile, Step, Vision } from './types.js';

/**
 * Single-table design
 *
 *   PK            SK                         item
 *   USER#<id>     VISION#<visionId>          Vision
 *   USER#<id>     STEP#<visionId>#<stepId>   Step
 *   USER#<id>     GRATITUDE#<id>             Gratitude journal entry
 *   USER#<id>     PROFILE                    Settings (reminder frequency)
 *
 *   GSI1 (only on visions shared with the church)
 *   GSI1PK = "SHARED", GSI1SK = <updatedAt>#<visionId>   -> Community feed
 *
 * IDs are time-sortable, so a Query on a partition returns items oldest-first.
 */
const userPk = (userId: string) => `USER#${userId}`;
const visionSk = (visionId: string) => `VISION#${visionId}`;
const stepSk = (visionId: string, stepId: string) => `STEP#${visionId}#${stepId}`;

const gratitudeSk = (id: string) => `GRATITUDE#${id}`;
const PROFILE_SK = 'PROFILE';

const KEY_FIELDS = ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'entity'] as const;

function strip<T>(item: Record<string, unknown>): T {
  const copy = { ...item };
  for (const f of KEY_FIELDS) delete copy[f];
  return copy as T;
}

/** Visions written before `horizon` existed are long-term goals. */
const toVision = (item: Record<string, unknown>): Vision => {
  const v = strip<Partial<Vision>>(item);
  return { ...v, horizon: v.horizon ?? 'long' } as Vision;
};

export function createDynamoStore(tableName: string, client?: DynamoDBDocumentClient): Store {
  const doc =
    client ??
    DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });

  async function queryAll(userId: string, skPrefix: string): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': userPk(userId), ':sk': skPrefix },
          ExclusiveStartKey: startKey,
        }),
      );
      items.push(...((res.Items ?? []) as Record<string, unknown>[]));
      startKey = res.LastEvaluatedKey;
    } while (startKey);
    return items;
  }

  async function getItem(pk: string, sk: string) {
    const res = await doc.send(new GetCommand({ TableName: tableName, Key: { PK: pk, SK: sk } }));
    return (res.Item as Record<string, unknown> | undefined) ?? null;
  }

  return {
    async listVisions(userId) {
      return (await queryAll(userId, 'VISION#')).map(toVision);
    },

    async getVision(userId, visionId) {
      const item = await getItem(userPk(userId), visionSk(visionId));
      return item ? toVision(item) : null;
    },

    async putVision(vision) {
      const item: Record<string, unknown> = {
        ...vision,
        PK: userPk(vision.userId),
        SK: visionSk(vision.id),
        entity: 'VISION',
      };
      // A full Put replaces the item, so dropping these attributes removes the
      // vision from the Community index when it goes back to private.
      if (vision.visibility === 'church') {
        item.GSI1PK = 'SHARED';
        item.GSI1SK = `${vision.updatedAt}#${vision.id}`;
      }
      await doc.send(new PutCommand({ TableName: tableName, Item: item }));
    },

    async deleteVision(userId, visionId) {
      const steps = await queryAll(userId, `STEP#${visionId}#`);
      const keys = steps.map((s) => ({ PK: s.PK as string, SK: s.SK as string }));
      for (let i = 0; i < keys.length; i += 25) {
        const chunk = keys.slice(i, i + 25);
        await doc.send(
          new BatchWriteCommand({
            RequestItems: { [tableName]: chunk.map((Key) => ({ DeleteRequest: { Key } })) },
          }),
        );
      }
      await doc.send(
        new DeleteCommand({ TableName: tableName, Key: { PK: userPk(userId), SK: visionSk(visionId) } }),
      );
    },

    async listSteps(userId, visionId) {
      return (await queryAll(userId, `STEP#${visionId}#`)).map((i) => strip<Step>(i));
    },

    async listAllSteps(userId) {
      return (await queryAll(userId, 'STEP#')).map((i) => strip<Step>(i));
    },

    async getStep(userId, visionId, stepId) {
      const item = await getItem(userPk(userId), stepSk(visionId, stepId));
      return item ? strip<Step>(item) : null;
    },

    async putStep(step) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...step, PK: userPk(step.userId), SK: stepSk(step.visionId, step.id), entity: 'STEP' },
        }),
      );
    },

    async deleteStep(userId, visionId, stepId) {
      await doc.send(
        new DeleteCommand({ TableName: tableName, Key: { PK: userPk(userId), SK: stepSk(visionId, stepId) } }),
      );
    },

    async getProfile(userId) {
      const item = await getItem(userPk(userId), PROFILE_SK);
      return item ? strip<Profile>(item) : null;
    },

    async putProfile(profile) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...profile, PK: userPk(profile.userId), SK: PROFILE_SK, entity: 'PROFILE' },
        }),
      );
    },

    async listGratitude(userId) {
      return (await queryAll(userId, 'GRATITUDE#')).map((i) => strip<Gratitude>(i));
    },

    async putGratitude(entry) {
      await doc.send(
        new PutCommand({
          TableName: tableName,
          Item: { ...entry, PK: userPk(entry.userId), SK: gratitudeSk(entry.id), entity: 'GRATITUDE' },
        }),
      );
    },

    async getGratitude(userId, id) {
      const item = await getItem(userPk(userId), gratitudeSk(id));
      return item ? strip<Gratitude>(item) : null;
    },

    async deleteGratitude(userId, id) {
      await doc.send(new DeleteCommand({ TableName: tableName, Key: { PK: userPk(userId), SK: gratitudeSk(id) } }));
    },

    async listShared(limit) {
      const res = await doc.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': 'SHARED' },
          ScanIndexForward: false,
          Limit: limit,
        }),
      );
      return ((res.Items ?? []) as Record<string, unknown>[]).map(toVision);
    },
  };
}
