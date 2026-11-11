import type { Gratitude, Profile, Step, Vision } from './types.js';

/**
 * Persistence boundary. The Lambda uses the DynamoDB implementation
 * (dynamoStore.ts); tests use an in-memory one.
 */
export interface Store {
  listVisions(userId: string): Promise<Vision[]>;
  getVision(userId: string, visionId: string): Promise<Vision | null>;
  putVision(vision: Vision): Promise<void>;
  /** Deletes the vision and every step under it. */
  deleteVision(userId: string, visionId: string): Promise<void>;

  listSteps(userId: string, visionId: string): Promise<Step[]>;
  listAllSteps(userId: string): Promise<Step[]>;
  getStep(userId: string, visionId: string, stepId: string): Promise<Step | null>;
  putStep(step: Step): Promise<void>;
  deleteStep(userId: string, visionId: string, stepId: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | null>;
  putProfile(profile: Profile): Promise<void>;

  /** All gratitude entries, oldest first. */
  listGratitude(userId: string): Promise<Gratitude[]>;
  putGratitude(entry: Gratitude): Promise<void>;
  getGratitude(userId: string, id: string): Promise<Gratitude | null>;
  deleteGratitude(userId: string, id: string): Promise<void>;

  /** Visions with visibility === 'church', newest activity first. */
  listShared(limit: number): Promise<Vision[]>;
}
