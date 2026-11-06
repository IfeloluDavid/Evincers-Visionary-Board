import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createDynamoStore } from './dynamoStore.js';
import { handle } from './handler.js';

// Created once per cold start and reused across invocations.
const store = createDynamoStore(process.env.TABLE_NAME!);

export const handler = (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> =>
  handle(event, store);
