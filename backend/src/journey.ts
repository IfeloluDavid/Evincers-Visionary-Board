import type { Gratitude, Step, Vision } from './types.js';

/** Points awarded for each kind of progress. Shown to members on the Journey page. */
export const XP = {
  visionWritten: 20,
  stepDone: 10,
  visionAchieved: 150,
  gratitude: 5,
  visionShared: 10,
} as const;

/** Dream it. Plan it. Live it. — the road from first idea to a life lived by vision. */
export const LEVELS = [
  { level: 1, name: 'Dreamer', xp: 0 },
  { level: 2, name: 'Planner', xp: 40 },
  { level: 3, name: 'Builder', xp: 120 },
  { level: 4, name: 'Pathfinder', xp: 300 },
  { level: 5, name: 'Overcomer', xp: 600 },
  { level: 6, name: 'Visionary', xp: 1000 },
] as const;

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
  /** 0-100 progress between the current level and the next. */
  levelPct: number;
  levels: { level: number; name: string; xp: number; reached: boolean }[];
  streakWeeks: number;
  bestStreakWeeks: number;
  stats: { visions: number; achieved: number; stepsDone: number; gratitude: number; areas: number; shared: number };
  badges: Badge[];
}

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `iso`, as epoch ms. */
function weekStart(iso: string | number | Date): number {
  const d = new Date(iso);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMonday);
}

/**
 * A "streak" is consecutive weeks with at least one act of faithfulness: writing a vision, finishing a step or
 * recording something you're grateful for. The current week gets a grace period: if you haven't acted yet this
 * week, last week's streak is still alive.
 */
function streaks(activity: string[], now: Date): { current: number; best: number } {
  const weeks = [...new Set(activity.map((a) => weekStart(a)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  weeks.forEach((w, i) => {
    run = i > 0 && w - weeks[i - 1]! === 7 * DAY ? run + 1 : 1;
    best = Math.max(best, run);
  });

  const set = new Set(weeks);
  const thisWeek = weekStart(now);
  let cursor = set.has(thisWeek) ? thisWeek : thisWeek - 7 * DAY;
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor -= 7 * DAY;
  }
  return { current, best };
}

export function computeJourney(input: {
  visions: Vision[];
  steps: Step[];
  gratitude: Gratitude[];
  now: Date;
}): Journey {
  const { visions, steps, gratitude, now } = input;
  const doneSteps = steps.filter((s) => s.done);
  const achieved = visions.filter((v) => v.status === 'achieved');
  const shared = visions.filter((v) => v.visibility === 'church');
  const areas = new Set(visions.map((v) => v.category)).size;

  const xp =
    visions.length * XP.visionWritten +
    doneSteps.length * XP.stepDone +
    achieved.length * XP.visionAchieved +
    gratitude.length * XP.gratitude +
    shared.length * XP.visionShared;

  const reached = LEVELS.filter((l) => xp >= l.xp);
  const current = reached[reached.length - 1]!;
  const nextLevel = LEVELS.find((l) => l.xp > xp) ?? null;
  const levelPct = nextLevel ? Math.round(((xp - current.xp) / (nextLevel.xp - current.xp)) * 100) : 100;

  const activity = [
    ...visions.map((v) => v.createdAt),
    ...doneSteps.map((s) => s.doneAt ?? s.createdAt),
    ...gratitude.map((g) => g.createdAt),
  ];
  const { current: streakWeeks, best: bestStreakWeeks } = streaks(activity, now);

  const badge = (id: string, name: string, description: string, current: number, target: number): Badge => ({
    id,
    name,
    description,
    earned: current >= target,
    progress: { current: Math.min(current, target), target },
  });

  const biggestPlan = Math.max(0, ...visions.map((v) => v.stepsTotal));

  return {
    xp,
    level: { level: current.level, name: current.name },
    next: nextLevel ? { level: nextLevel.level, name: nextLevel.name, xpNeeded: nextLevel.xp - xp } : null,
    levelPct,
    levels: LEVELS.map((l) => ({ ...l, reached: xp >= l.xp })),
    streakWeeks,
    bestStreakWeeks,
    stats: {
      visions: visions.length,
      achieved: achieved.length,
      stepsDone: doneSteps.length,
      gratitude: gratitude.length,
      areas,
      shared: shared.length,
    },
    badges: [
      badge('written', 'The Vision Is Written', 'Write your first vision', visions.length, 1),
      badge('plan', 'Plan Maker', 'Break one vision into 5 or more steps', biggestPlan, 5),
      badge('first-step', 'First Step', 'Complete your first step', doneSteps.length, 1),
      badge('ten-steps', 'Ten Steps Forward', 'Complete 10 steps', doneSteps.length, 10),
      badge('fifty-steps', 'Fifty Strong', 'Complete 50 steps', doneSteps.length, 50),
      badge('grateful', 'Grateful Heart', 'Record 7 things you are grateful for', gratitude.length, 7),
      badge('faithful', 'Faithful', 'Keep a 4-week streak', bestStreakWeeks, 4),
      badge('rounded', 'Well-Rounded', 'Have visions in 3 different areas of life', areas, 3),
      badge('encourager', 'Encourager', 'Share a vision with the church', shared.length, 1),
      badge('fulfilled', 'Vision Fulfilled', 'Mark a vision as achieved', achieved.length, 1),
    ],
  };
}
