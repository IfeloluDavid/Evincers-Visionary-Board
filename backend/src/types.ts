export const CATEGORIES = [
  'spiritual',
  'family',
  'relationships',
  'health',
  'mind',
  'career',
  'business',
  'finance',
  'ministry',
  'education',
  'creativity',
  'lifestyle',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['active', 'achieved', 'paused'] as const;
export type Status = (typeof STATUSES)[number];

/** private = only the owner; church = visible to every signed-in member in the Community feed. */
export const VISIBILITIES = ['private', 'church'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** Mirrors the postcard: an immediate goal (next weeks/months) or a long-term one. */
export const HORIZONS = ['immediate', 'long'] as const;
export type Horizon = (typeof HORIZONS)[number];

export const REMINDER_FREQUENCIES = ['weekly', 'monthly', 'off'] as const;
export type ReminderFrequency = (typeof REMINDER_FREQUENCIES)[number];

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
  horizon: Horizon;
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
  maxGratitudeListed: 200,
} as const;

/** Per-member settings. Absent item = defaults (weekly reminders). */
export interface Profile {
  userId: string;
  reminders: ReminderFrequency;
  updatedAt: string;
}

/** A line in the member's gratitude journal ("What I'm grateful for"). */
export interface Gratitude {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}
