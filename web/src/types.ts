// Mirrors backend/src/types.ts.

export type Category =
  | 'spiritual'
  | 'family'
  | 'relationships'
  | 'health'
  | 'mind'
  | 'career'
  | 'business'
  | 'finance'
  | 'ministry'
  | 'education'
  | 'creativity'
  | 'lifestyle'
  | 'other';
export type Horizon = 'immediate' | 'long';
export type Reminders = 'weekly' | 'monthly' | 'off';
export type Status = 'active' | 'achieved' | 'paused';
export type Visibility = 'private' | 'church';

export interface Vision {
  id: string;
  ownerName: string;
  title: string;
  description: string;
  category: Category;
  scripture: string;
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

export type PublicVision = Vision & { mine: boolean };

export interface Step {
  id: string;
  visionId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

export interface UpcomingStep extends Step {
  visionTitle: string;
  category: Category;
}

export type VisionInput = Partial<
  Pick<Vision, 'title' | 'description' | 'category' | 'scripture' | 'targetDate' | 'status' | 'visibility' | 'horizon'>
>;
export type StepInput = Partial<Pick<Step, 'title' | 'dueDate' | 'done'>>;

export interface Gratitude {
  id: string;
  text: string;
  createdAt: string;
}

export interface Verse {
  text: string;
  ref: string;
}

export interface Me {
  name: string;
  email: string;
  reminders: Reminders;
  /** false until the reminder emailer is deployed and SES is set up. */
  remindersConfigured: boolean;
  verse: Verse;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  progress: { current: number; target: number };
}

export interface Journey {
  xp: number;
  level: { level: number; name: string };
  next: { level: number; name: string; xpNeeded: number } | null;
  levelPct: number;
  levels: { level: number; name: string; xp: number; reached: boolean }[];
  streakWeeks: number;
  bestStreakWeeks: number;
  stats: { visions: number; achieved: number; stepsDone: number; gratitude: number; areas: number; shared: number };
  badges: Badge[];
}
