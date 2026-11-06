// Mirrors backend/src/types.ts.

export type Category =
  | 'spiritual'
  | 'family'
  | 'health'
  | 'career'
  | 'finance'
  | 'ministry'
  | 'education'
  | 'other';
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
  Pick<Vision, 'title' | 'description' | 'category' | 'scripture' | 'targetDate' | 'status' | 'visibility'>
>;
export type StepInput = Partial<Pick<Step, 'title' | 'dueDate' | 'done'>>;
