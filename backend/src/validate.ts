import { CATEGORIES, STATUSES, VISIBILITIES } from './types.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown>;

export function asBody(raw: unknown): Body {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }
  return raw as Body;
}

function text(body: Body, key: string, max: number, required: boolean): string | undefined {
  const v = body[key];
  if (v === undefined) {
    if (required) throw new ApiError(400, `"${key}" is required`);
    return undefined;
  }
  if (typeof v !== 'string') throw new ApiError(400, `"${key}" must be a string`);
  const trimmed = v.trim();
  if (required && trimmed.length === 0) throw new ApiError(400, `"${key}" cannot be empty`);
  if (trimmed.length > max) throw new ApiError(400, `"${key}" must be at most ${max} characters`);
  return trimmed;
}

function oneOf<T extends string>(body: Body, key: string, allowed: readonly T[]): T | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new ApiError(400, `"${key}" must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

/** undefined = not provided, null = clear the date. */
function date(body: Body, key: string): string | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    throw new ApiError(400, `"${key}" must be a date in YYYY-MM-DD format`);
  }
  return v;
}

export interface VisionInput {
  title?: string;
  description?: string;
  category?: (typeof CATEGORIES)[number];
  scripture?: string;
  targetDate?: string | null;
  status?: (typeof STATUSES)[number];
  visibility?: (typeof VISIBILITIES)[number];
}

export function parseVision(raw: unknown, mode: 'create' | 'update'): VisionInput {
  const body = asBody(raw);
  const create = mode === 'create';
  const out: VisionInput = {
    title: text(body, 'title', 120, create),
    description: text(body, 'description', 2000, false),
    category: oneOf(body, 'category', CATEGORIES),
    scripture: text(body, 'scripture', 300, false),
    targetDate: date(body, 'targetDate'),
    status: oneOf(body, 'status', STATUSES),
    visibility: oneOf(body, 'visibility', VISIBILITIES),
  };
  return out;
}

export interface StepInput {
  title?: string;
  dueDate?: string | null;
  done?: boolean;
}

export function parseStep(raw: unknown, mode: 'create' | 'update'): StepInput {
  const body = asBody(raw);
  const out: StepInput = {
    title: text(body, 'title', 200, mode === 'create'),
    dueDate: date(body, 'dueDate'),
  };
  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') throw new ApiError(400, '"done" must be a boolean');
    out.done = body.done;
  }
  return out;
}
