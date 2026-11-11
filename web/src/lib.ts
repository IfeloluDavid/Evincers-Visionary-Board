import {
  BookOpen, Briefcase, Brain, Compass, GraduationCap, HandHeart, HeartHandshake, HeartPulse, House,
  Palette, Sparkles, Store, Wallet, type LucideIcon,
} from 'lucide-react';
import type { Category, Horizon, Status } from './types';

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; hint: string }> = {
  spiritual: { label: 'Spiritual growth', icon: BookOpen, hint: 'Prayer, the Word, devotion' },
  family: { label: 'Family & home', icon: House, hint: 'Marriage, children, parents' },
  relationships: { label: 'Relationships', icon: HeartHandshake, hint: 'Friendship, courtship, community' },
  health: { label: 'Health & wellbeing', icon: HeartPulse, hint: 'Body, fitness, rest' },
  mind: { label: 'Mind & emotions', icon: Brain, hint: 'Mindset, healing, peace' },
  career: { label: 'Work & calling', icon: Briefcase, hint: 'Career, skills, promotion' },
  business: { label: 'Business', icon: Store, hint: 'Start, grow or scale' },
  finance: { label: 'Finances', icon: Wallet, hint: 'Saving, giving, debt-freedom' },
  ministry: { label: 'Ministry & service', icon: HandHeart, hint: 'Serving church and community' },
  education: { label: 'Learning', icon: GraduationCap, hint: 'Study, certifications, reading' },
  creativity: { label: 'Creativity', icon: Palette, hint: 'Art, music, writing, design' },
  lifestyle: { label: 'Lifestyle & travel', icon: Compass, hint: 'Adventure, home, experiences' },
  other: { label: 'Other', icon: Sparkles, hint: 'Anything else on your heart' },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as Category[];

export const STATUS_LABEL: Record<Status, string> = {
  active: 'In progress',
  achieved: 'Achieved',
  paused: 'On hold',
};

export const HORIZON_META: Record<Horizon, { label: string; hint: string }> = {
  immediate: { label: 'Immediate goal', hint: 'In the next few weeks or months' },
  long: { label: 'Long-term goal', hint: 'A season or more away' },
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

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
