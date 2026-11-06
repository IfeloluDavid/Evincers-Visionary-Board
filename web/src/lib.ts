import type { Category, Status } from './types';

export const CATEGORY_META: Record<Category, { label: string; emoji: string; hint: string }> = {
  spiritual: { label: 'Spiritual growth', emoji: '🕊️', hint: 'Prayer, the Word, devotion' },
  family: { label: 'Family & relationships', emoji: '🏡', hint: 'Marriage, children, friendships' },
  health: { label: 'Health & wellbeing', emoji: '🌿', hint: 'Body, mind, rest' },
  career: { label: 'Work & calling', emoji: '💼', hint: 'Career, business, skills' },
  finance: { label: 'Finances & stewardship', emoji: '🪙', hint: 'Saving, giving, debt-freedom' },
  ministry: { label: 'Ministry & service', emoji: '🙌', hint: 'Serving church and community' },
  education: { label: 'Learning', emoji: '📖', hint: 'Study, certifications, reading' },
  other: { label: 'Other', emoji: '✨', hint: 'Anything else God has put on your heart' },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as Category[];

export const STATUS_LABEL: Record<Status, string> = {
  active: 'In progress',
  achieved: 'Achieved',
  paused: 'On hold',
};

/** Parse a YYYY-MM-DD string as a local date (new Date('2027-01-01') would be UTC). */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function formatDay(iso: string): string {
  return parseDay(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDay(iso).getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(iso: string): { text: string; tone: 'late' | 'soon' | 'ok' } {
  const d = daysUntil(iso);
  if (d < 0) return { text: `${-d} day${d === -1 ? '' : 's'} overdue`, tone: 'late' };
  if (d === 0) return { text: 'Due today', tone: 'soon' };
  if (d === 1) return { text: 'Due tomorrow', tone: 'soon' };
  if (d <= 7) return { text: `Due in ${d} days`, tone: 'soon' };
  if (d < 60) return { text: `${d} days left`, tone: 'ok' };
  return { text: `${Math.round(d / 30)} months left`, tone: 'ok' };
}

export const percent = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));
