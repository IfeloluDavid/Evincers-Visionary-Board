import { describe, expect, it } from 'vitest';
import { computeJourney, LEVELS, XP } from '../src/journey.js';
import type { Gratitude, Step, Vision } from '../src/types.js';

const NOW = new Date('2026-11-11T10:00:00Z'); // a Wednesday

const vision = (over: Partial<Vision> = {}): Vision => ({
  id: 'v' + Math.random(),
  userId: 'u',
  ownerName: 'G',
  title: 'T',
  description: '',
  category: 'spiritual',
  scripture: '',
  targetDate: null,
  status: 'active',
  visibility: 'private',
  horizon: 'long',
  stepsTotal: 0,
  stepsDone: 0,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
  achievedAt: null,
  ...over,
});
const step = (doneAt: string | null, over: Partial<Step> = {}): Step => ({
  id: 's' + Math.random(),
  visionId: 'v',
  userId: 'u',
  title: 's',
  dueDate: null,
  done: doneAt !== null,
  doneAt,
  createdAt: '2020-01-01T00:00:00Z',
  ...over,
});
const thanks = (createdAt: string): Gratitude => ({ id: 'g' + Math.random(), userId: 'u', text: 't', createdAt });

describe('computeJourney', () => {
  it('starts everyone as a Dreamer with nothing earned', () => {
    const j = computeJourney({ visions: [], steps: [], gratitude: [], now: NOW });
    expect(j.xp).toBe(0);
    expect(j.level).toEqual({ level: 1, name: 'Dreamer' });
    expect(j.next).toEqual({ level: 2, name: 'Planner', xpNeeded: LEVELS[1].xp });
    expect(j.levelPct).toBe(0);
    expect(j.streakWeeks).toBe(0);
    expect(j.badges.filter((b) => b.earned)).toHaveLength(0);
  });

  it('awards xp, levels up and tracks badge progress', () => {
    const visions = [
      vision({ category: 'spiritual', visibility: 'church', stepsTotal: 5 }),
      vision({ category: 'family', status: 'achieved' }),
      vision({ category: 'career' }),
    ];
    const steps = Array.from({ length: 10 }, () => step('2026-11-10T09:00:00Z'));
    const j = computeJourney({ visions, steps, gratitude: [thanks('2026-11-09T09:00:00Z')], now: NOW });

    const expected = 3 * XP.visionWritten + 10 * XP.stepDone + 1 * XP.visionAchieved + 1 * XP.gratitude + 1 * XP.visionShared;
    expect(j.xp).toBe(expected);
    expect(j.level.name).toBe('Pathfinder'); // 60+100+150+5+10 = 325
    expect(j.next?.name).toBe('Overcomer');

    const earned = j.badges.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['written', 'plan', 'first-step', 'ten-steps', 'rounded', 'encourager', 'fulfilled']));
    expect(earned).not.toContain('fifty-steps');
    expect(j.badges.find((b) => b.id === 'grateful')?.progress).toEqual({ current: 1, target: 7 });
  });

  it('caps at the top level', () => {
    const steps = Array.from({ length: 120 }, () => step('2026-11-10T09:00:00Z'));
    const j = computeJourney({ visions: [], steps, gratitude: [], now: NOW });
    expect(j.level.name).toBe('Visionary');
    expect(j.next).toBeNull();
    expect(j.levelPct).toBe(100);
  });
});

describe('streaks (consecutive weeks with activity)', () => {
  const run = (dates: string[]) =>
    computeJourney({ visions: [], steps: [], gratitude: dates.map(thanks), now: NOW });

  it('counts consecutive weeks up to the current one', () => {
    const j = run(['2026-11-10T08:00:00Z', '2026-11-03T08:00:00Z', '2026-10-27T08:00:00Z']);
    expect(j.streakWeeks).toBe(3);
    expect(j.bestStreakWeeks).toBe(3);
  });

  it('keeps last week\'s streak alive until the week ends (grace)', () => {
    const j = run(['2026-11-05T08:00:00Z', '2026-10-29T08:00:00Z']); // nothing yet this week
    expect(j.streakWeeks).toBe(2);
  });

  it('breaks after a missed week but remembers the best run', () => {
    const j = run(['2026-11-10T08:00:00Z', '2026-10-13T08:00:00Z', '2026-10-06T08:00:00Z', '2026-09-29T08:00:00Z', '2026-09-22T08:00:00Z']);
    expect(j.streakWeeks).toBe(1);
    expect(j.bestStreakWeeks).toBe(4);
  });

  it('treats Sunday and the following Monday as different weeks', () => {
    const j = run(['2026-11-08T23:00:00Z', '2026-11-09T01:00:00Z']); // Sun then Mon
    expect(j.bestStreakWeeks).toBe(2);
  });
});
