import { describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from '../dev/memoryStore.js';
import { buildDigest, isDueToday, runReminders, type Email, type Member } from '../src/reminders.js';
import type { Step, Vision } from '../src/types.js';
import { VERSES, verseForDay, verseForWeek } from '../src/verses.js';

const NOW = new Date('2026-11-09T07:00:00Z'); // Monday
const member: Member = { userId: 'u1', email: 'grace@example.org', name: 'Grace Adeyemi' };

const vision = (over: Partial<Vision> = {}): Vision => ({
  id: 'v1', userId: 'u1', ownerName: 'Grace', title: 'Read the Bible', description: '', category: 'spiritual',
  scripture: '', targetDate: null, status: 'active', visibility: 'private', horizon: 'long', stepsTotal: 4, stepsDone: 1,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', achievedAt: null, ...over,
});
const step = (title: string, dueDate: string | null, over: Partial<Step> = {}): Step => ({
  id: title, visionId: 'v1', userId: 'u1', title, dueDate, done: false, doneAt: null, createdAt: '2026-10-01T00:00:00Z', ...over,
});

const base = { member, streakWeeks: 0, now: NOW, siteUrl: 'https://vb.example.org', verse: VERSES[0]! };

describe('buildDigest', () => {
  it('separates overdue from this week and ignores done, undated, later and paused-vision steps', () => {
    const e = buildDigest({
      ...base,
      visions: [vision(), vision({ id: 'v2', title: 'Paused one', status: 'paused' })],
      steps: [
        step('Late one', '2026-11-01'),
        step('Due friday', '2026-11-13'),
        step('Far away', '2027-03-01'),
        step('No date', null),
        step('Finished', '2026-11-02', { done: true }),
        step('On paused', '2026-11-01', { visionId: 'v2' }),
      ],
    });
    expect(e.to).toBe('grace@example.org');
    expect(e.subject).toContain('1 step');
    expect(e.text).toContain('NEEDS ATTENTION');
    expect(e.text).toContain('Late one');
    expect(e.text).toContain('Due friday');
    for (const hidden of ['Far away', 'No date', 'Finished', 'On paused']) expect(e.text).not.toContain(hidden);
    expect(e.text).toContain('Read the Bible: 25% (1 of 4 steps)');
    expect(e.text).toContain('https://vb.example.org/settings');
  });

  it('nudges members with no visions to write their first one', () => {
    const e = buildDigest({ ...base, visions: [], steps: [] });
    expect(e.text).toContain('Take five minutes to write down');
    expect(e.subject).toBe('Grace, your vision check-in');
  });

  it('escapes member-written text in the HTML body (no injection)', () => {
    const e = buildDigest({
      ...base,
      member: { ...member, name: '<b>Grace</b>' },
      visions: [vision({ title: '<script>alert(1)</script>' })],
      steps: [step('<img src=x onerror=1>', '2026-11-10')],
    });
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('<img');
    expect(e.html).toContain('&lt;script&gt;');
    expect(e.html).toContain('&lt;img');
  });

  it('mentions a real streak only', () => {
    expect(buildDigest({ ...base, streakWeeks: 1, visions: [], steps: [] }).text).not.toContain('streak');
    expect(buildDigest({ ...base, streakWeeks: 5, visions: [], steps: [] }).text).toContain('5-week streak');
  });
});

describe('isDueToday', () => {
  it('weekly always, off never, monthly only in the first 7 days', () => {
    expect(isDueToday('weekly', NOW)).toBe(true);
    expect(isDueToday('off', NOW)).toBe(false);
    expect(isDueToday('monthly', NOW)).toBe(false); // Nov 9
    expect(isDueToday('monthly', new Date('2026-11-02T07:00:00Z'))).toBe(true);
  });
});

describe('runReminders', () => {
  async function* people(...m: Member[]) {
    for (const x of m) yield x;
  }

  it('emails everyone by default, honours opt-outs, and survives individual failures', async () => {
    const store = createMemoryStore();
    await store.putProfile({ userId: 'off', reminders: 'off', updatedAt: 'x' });
    await store.putProfile({ userId: 'monthly', reminders: 'monthly', updatedAt: 'x' });
    const sent: Email[] = [];
    const send = vi.fn(async (e: Email) => {
      if (e.to === 'bad@example.org') throw new Error('SES rejected');
      sent.push(e);
    });
    const mk = (id: string, to = `${id}@example.org`): Member => ({ userId: id, email: to, name: id });

    const result = await runReminders({
      members: () => people(mk('new'), mk('off'), mk('monthly'), mk('bad', 'bad@example.org'), mk('last')),
      store,
      send,
      now: NOW,
      siteUrl: 'https://vb.example.org',
    });

    expect(result).toEqual({ sent: 2, skipped: 2, failed: 1 });
    expect(sent.map((e) => e.to)).toEqual(['new@example.org', 'last@example.org']);
  });
});

describe('verses', () => {
  it('is deterministic per day and week, and always in range', () => {
    expect(verseForDay(NOW)).toEqual(verseForDay(new Date('2026-11-09T22:00:00Z')));
    expect(verseForDay(new Date('2026-11-10T01:00:00Z'))).not.toEqual(verseForDay(NOW));
    for (let i = 0; i < 400; i++) expect(verseForWeek(new Date(NOW.getTime() + i * 86_400_000)).text).toBeTruthy();
  });
});
