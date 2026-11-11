import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import type { Store } from './store.js';
import { computeJourney } from './journey.js';
import { LIMITS, type Gratitude, type PublicVision, type Step, type Vision } from './types.js';
import { ApiError, parseGratitude, parseProfile, parseStep, parseVision } from './validate.js';
import { verseForDay } from './verses.js';

interface Ctx {
  store: Store;
  userId: string;
  email: string;
  ownerName: string;
  /** Whether the reminder emailer has been deployed (set by Terraform). */
  remindersConfigured: boolean;
  params: Record<string, string>;
  body: () => unknown;
}

type Handler = (ctx: Ctx) => Promise<{ status: number; body?: unknown }>;

/** Time-sortable id: base36 millis (zero-padded) + 8 random hex chars. */
export const newId = () => Date.now().toString(36).padStart(9, '0') + randomBytes(4).toString('hex');
const now = () => new Date().toISOString();
const ok = (body: unknown, status = 200) => ({ status, body });

async function requireVision(ctx: Ctx): Promise<Vision> {
  const vision = await ctx.store.getVision(ctx.userId, ctx.params.id!);
  if (!vision) throw new ApiError(404, 'Vision not found');
  return vision;
}

/** Recompute the denormalised progress counters after any step change. */
async function recount(ctx: Ctx, vision: Vision): Promise<Vision> {
  const steps = await ctx.store.listSteps(ctx.userId, vision.id);
  const updated: Vision = {
    ...vision,
    ownerName: ctx.ownerName,
    stepsTotal: steps.length,
    stepsDone: steps.filter((s) => s.done).length,
    updatedAt: now(),
  };
  await ctx.store.putVision(updated);
  return updated;
}

const byDueThenCreated = (a: Step, b: Step) =>
  (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.createdAt.localeCompare(b.createdAt);

// ---------------------------------------------------------------- visions

const listVisions: Handler = async (ctx) => {
  const visions = await ctx.store.listVisions(ctx.userId);
  visions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok({ visions });
};

const createVision: Handler = async (ctx) => {
  const input = parseVision(ctx.body(), 'create');
  const existing = await ctx.store.listVisions(ctx.userId);
  if (existing.length >= LIMITS.maxVisionsPerUser) {
    throw new ApiError(409, `You can have at most ${LIMITS.maxVisionsPerUser} visions`);
  }
  const ts = now();
  const status = input.status ?? 'active';
  const vision: Vision = {
    id: newId(),
    userId: ctx.userId,
    ownerName: ctx.ownerName,
    title: input.title!,
    description: input.description ?? '',
    category: input.category ?? 'other',
    scripture: input.scripture ?? '',
    targetDate: input.targetDate ?? null,
    status,
    visibility: input.visibility ?? 'private',
    horizon: input.horizon ?? 'long',
    stepsTotal: 0,
    stepsDone: 0,
    createdAt: ts,
    updatedAt: ts,
    achievedAt: status === 'achieved' ? ts : null,
  };
  await ctx.store.putVision(vision);
  return ok({ vision }, 201);
};

const getVision: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  const steps = await ctx.store.listSteps(ctx.userId, vision.id);
  steps.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return ok({ vision, steps });
};

const updateVision: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  const input = parseVision(ctx.body(), 'update');
  const ts = now();
  const status = input.status ?? vision.status;
  const updated: Vision = {
    ...vision,
    ownerName: ctx.ownerName,
    title: input.title ?? vision.title,
    description: input.description ?? vision.description,
    category: input.category ?? vision.category,
    scripture: input.scripture ?? vision.scripture,
    targetDate: input.targetDate === undefined ? vision.targetDate : input.targetDate,
    status,
    visibility: input.visibility ?? vision.visibility,
    horizon: input.horizon ?? vision.horizon,
    achievedAt: status === 'achieved' ? (vision.achievedAt ?? ts) : null,
    updatedAt: ts,
  };
  await ctx.store.putVision(updated);
  return ok({ vision: updated });
};

const deleteVision: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  await ctx.store.deleteVision(ctx.userId, vision.id);
  return { status: 204 };
};

// ------------------------------------------------------------------ steps

const createStep: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  const input = parseStep(ctx.body(), 'create');
  if (vision.stepsTotal >= LIMITS.maxStepsPerVision) {
    throw new ApiError(409, `A vision can have at most ${LIMITS.maxStepsPerVision} steps`);
  }
  const step: Step = {
    id: newId(),
    visionId: vision.id,
    userId: ctx.userId,
    title: input.title!,
    dueDate: input.dueDate ?? null,
    done: input.done ?? false,
    doneAt: input.done ? now() : null,
    createdAt: now(),
  };
  await ctx.store.putStep(step);
  const updated = await recount(ctx, vision);
  return ok({ step, vision: updated }, 201);
};

const updateStep: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  const step = await ctx.store.getStep(ctx.userId, vision.id, ctx.params.stepId!);
  if (!step) throw new ApiError(404, 'Step not found');
  const input = parseStep(ctx.body(), 'update');
  const done = input.done ?? step.done;
  const updated: Step = {
    ...step,
    title: input.title ?? step.title,
    dueDate: input.dueDate === undefined ? step.dueDate : input.dueDate,
    done,
    doneAt: done ? (step.doneAt ?? now()) : null,
  };
  await ctx.store.putStep(updated);
  const updatedVision = await recount(ctx, vision);
  return ok({ step: updated, vision: updatedVision });
};

const deleteStep: Handler = async (ctx) => {
  const vision = await requireVision(ctx);
  const step = await ctx.store.getStep(ctx.userId, vision.id, ctx.params.stepId!);
  if (!step) throw new ApiError(404, 'Step not found');
  await ctx.store.deleteStep(ctx.userId, vision.id, step.id);
  const updatedVision = await recount(ctx, vision);
  return ok({ vision: updatedVision });
};

/** Open steps across all of the user's active visions, soonest due first. */
const upcomingSteps: Handler = async (ctx) => {
  const [visions, steps] = await Promise.all([
    ctx.store.listVisions(ctx.userId),
    ctx.store.listAllSteps(ctx.userId),
  ]);
  const active = new Map(visions.filter((v) => v.status === 'active').map((v) => [v.id, v]));
  const upcoming = steps
    .filter((s) => !s.done && active.has(s.visionId))
    .sort(byDueThenCreated)
    .slice(0, 12)
    .map((s) => ({ ...s, visionTitle: active.get(s.visionId)!.title, category: active.get(s.visionId)!.category }));
  return ok({ steps: upcoming });
};

// ------------------------------------------------- profile, gratitude, journey

const me: Handler = async (ctx) => {
  const profile = await ctx.store.getProfile(ctx.userId);
  return ok({
    name: ctx.ownerName,
    email: ctx.email,
    reminders: profile?.reminders ?? 'weekly',
    remindersConfigured: ctx.remindersConfigured,
    verse: verseForDay(new Date()),
  });
};

const updateMe: Handler = async (ctx) => {
  const input = parseProfile(ctx.body());
  const existing = await ctx.store.getProfile(ctx.userId);
  const profile = {
    userId: ctx.userId,
    reminders: input.reminders ?? existing?.reminders ?? 'weekly',
    updatedAt: now(),
  } as const;
  await ctx.store.putProfile(profile);
  return ok({ reminders: profile.reminders });
};

const listGratitude: Handler = async (ctx) => {
  const all = await ctx.store.listGratitude(ctx.userId);
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok({ entries: all.slice(0, LIMITS.maxGratitudeListed), total: all.length });
};

const createGratitude: Handler = async (ctx) => {
  const { text } = parseGratitude(ctx.body());
  const entry: Gratitude = { id: newId(), userId: ctx.userId, text, createdAt: now() };
  await ctx.store.putGratitude(entry);
  return ok({ entry }, 201);
};

const deleteGratitude: Handler = async (ctx) => {
  const entry = await ctx.store.getGratitude(ctx.userId, ctx.params.id!);
  if (!entry) throw new ApiError(404, 'Entry not found');
  await ctx.store.deleteGratitude(ctx.userId, entry.id);
  return { status: 204 };
};

const journey: Handler = async (ctx) => {
  const [visions, steps, gratitude] = await Promise.all([
    ctx.store.listVisions(ctx.userId),
    ctx.store.listAllSteps(ctx.userId),
    ctx.store.listGratitude(ctx.userId),
  ]);
  return ok({ journey: computeJourney({ visions, steps, gratitude, now: new Date() }) });
};

// -------------------------------------------------------------- community

const community: Handler = async (ctx) => {
  const shared = await ctx.store.listShared(LIMITS.communityPageSize);
  const visions: PublicVision[] = shared
    .filter((v) => v.visibility === 'church')
    .map(({ userId, ...rest }) => ({ ...rest, mine: userId === ctx.userId }));
  return ok({ visions });
};

// ----------------------------------------------------------------- router

const routes: Array<[method: string, pattern: string, handler: Handler]> = [
  ['GET', '/visions', listVisions],
  ['POST', '/visions', createVision],
  ['GET', '/visions/:id', getVision],
  ['PATCH', '/visions/:id', updateVision],
  ['DELETE', '/visions/:id', deleteVision],
  ['POST', '/visions/:id/steps', createStep],
  ['PATCH', '/visions/:id/steps/:stepId', updateStep],
  ['DELETE', '/visions/:id/steps/:stepId', deleteStep],
  ['GET', '/steps/upcoming', upcomingSteps],
  ['GET', '/community', community],
  ['GET', '/me', me],
  ['PATCH', '/me', updateMe],
  ['GET', '/journey', journey],
  ['GET', '/gratitude', listGratitude],
  ['POST', '/gratitude', createGratitude],
  ['DELETE', '/gratitude/:id', deleteGratitude],
];

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/');
  const s = path.split('/');
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(':')) params[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

const json = (status: number, body?: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode: status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function handle(
  event: APIGatewayProxyEventV2,
  store: Store,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // The JWT authorizer has already verified the token; we only read its claims.
    const claims = (event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, unknown> } } })
      .authorizer?.jwt?.claims;
    const userId = typeof claims?.sub === 'string' ? claims.sub : undefined;
    if (!userId) throw new ApiError(401, 'Unauthorized');
    const email = typeof claims?.email === 'string' ? claims.email : '';
    const ownerName = String(claims?.name ?? claims?.email ?? 'Church member').split('@')[0]!.slice(0, 60);

    const method = event.requestContext.http.method;
    const path = event.rawPath.replace(/\/+$/, '') || '/';

    for (const [m, pattern, handler] of routes) {
      if (m !== method) continue;
      const params = match(pattern, path);
      if (!params) continue;
      const result = await handler({
        store,
        userId,
        email,
        ownerName,
        remindersConfigured: process.env.REMINDERS_ENABLED === 'true',
        params,
        body: () => {
          if (!event.body) throw new ApiError(400, 'Request body is required');
          const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
          try {
            return JSON.parse(raw);
          } catch {
            throw new ApiError(400, 'Request body is not valid JSON');
          }
        },
      });
      return json(result.status, result.body);
    }
    throw new ApiError(404, 'Not found');
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('Unhandled error', err);
    return json(500, { error: 'Internal server error' });
  }
}
