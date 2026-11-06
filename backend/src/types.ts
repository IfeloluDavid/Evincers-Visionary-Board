export const CATEGORIES = [
  'spiritual',
  'family',
  'health',
  'career',
  'finance',
  'ministry',
  'education',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['active', 'achieved', 'paused'] as const;
export type Status = (typeof STATUSES)[number];

/** private = only the owner; church = visible to every signed-in member in the Community feed. */
export const VISIBILITIES = ['private', 'church'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export interface Vision {
  id: string;
  userId: string;
  ownerName: string;
  title: string;
  description: string;
  category: Category;
  /** Anchor scripture / declaration for the vision (free text). */
  scripture: string;
  /** ISO date (YYYY-MM-DD) or null. */
  targetDate: string | null;
  status: Status;
  visibility: Visibility;
  stepsTotal: number;
  stepsDone: number;
  createdAt: string;
  updatedAt: string;
  achievedAt: string | null;
}

export interface Step {
  id: string;
  visionId: string;
  userId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

/** What other church members see in the Community feed (no userId, no steps). */
export type PublicVision = Omit<Vision, 'userId'> & { mine: boolean };

export const LIMITS = {
  maxVisionsPerUser: 100,
  maxStepsPerVision: 100,
  communityPageSize: 60,
} as const;
