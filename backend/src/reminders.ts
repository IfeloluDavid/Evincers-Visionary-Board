import { computeJourney } from './journey.js';
import type { Store } from './store.js';
import type { Step, Vision } from './types.js';
import { verseForWeek, type Verse } from './verses.js';

export interface Member {
  userId: string;
  email: string;
  name: string;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const NAVY = '#12285a';
const GOLD = '#c9962f';
const CREAM = '#fdf6e7';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const day = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export interface DigestInput {
  member: Member;
  visions: Vision[];
  steps: Step[];
  streakWeeks: number;
  now: Date;
  siteUrl: string;
  verse: Verse;
}

/** Build the check-in email: what is overdue, what is due this week, how each vision is doing. */
export function buildDigest(input: DigestInput): Email {
  const { member, visions, steps, streakWeeks, now, siteUrl, verse } = input;
  const first = member.name.split(' ')[0] || 'friend';
  const today = isoDay(now);
  const weekEnd = isoDay(addDays(now, 7));

  const active = visions.filter((v) => v.status === 'active');
  const activeIds = new Set(active.map((v) => v.id));
  const titleOf = new Map(visions.map((v) => [v.id, v.title]));
  const open = steps.filter((s) => !s.done && activeIds.has(s.visionId) && s.dueDate);
  const byDue = (a: Step, b: Step) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  const overdue = open.filter((s) => s.dueDate! < today).sort(byDue);
  const soon = open.filter((s) => s.dueDate! >= today && s.dueDate! <= weekEnd).sort(byDue);

  const intro =
    active.length === 0
      ? 'Your board is waiting. Take five minutes to write down one thing God has put on your heart.'
      : overdue.length > 0
        ? `${overdue.length} step${overdue.length === 1 ? ' needs' : 's need'} your attention. Small, steady steps still move you forward.`
        : soon.length > 0
          ? 'Here is what is coming up this week. You have got this.'
          : 'Nothing is due this week. A good moment to plan your next step.';

  const streak = streakWeeks >= 2 ? `You are on a ${streakWeeks}-week streak. Keep it going.` : '';

  const stepLine = (s: Step) => `${s.title} (${titleOf.get(s.visionId) ?? 'vision'}, ${day(s.dueDate!)})`;
  const visionLine = (v: Vision) => {
    const pct = v.stepsTotal === 0 ? 0 : Math.round((v.stepsDone / v.stepsTotal) * 100);
    return `${v.title}: ${pct}% (${v.stepsDone} of ${v.stepsTotal} steps)`;
  };

  // ---- plain text
  const text = [
    `Hi ${first},`,
    '',
    intro,
    ...(streak ? ['', streak] : []),
    ...(overdue.length ? ['', 'NEEDS ATTENTION', ...overdue.slice(0, 5).map((s) => `- ${stepLine(s)}`)] : []),
    ...(soon.length ? ['', 'DUE THIS WEEK', ...soon.slice(0, 5).map((s) => `- ${stepLine(s)}`)] : []),
    ...(active.length ? ['', 'YOUR VISIONS', ...active.slice(0, 6).map((v) => `- ${visionLine(v)}`)] : []),
    '',
    `"${verse.text}" - ${verse.ref}`,
    '',
    `Open your vision board: ${siteUrl}`,
    `Change how often you get these emails: ${siteUrl}/settings`,
  ].join('\n');

  // ---- html
  const list = (heading: string, color: string, items: string[]) =>
    items.length
      ? `<h3 style="margin:22px 0 6px;font:700 12px/1 Arial,sans-serif;letter-spacing:.08em;color:${color}">${heading}</h3>
         <ul style="margin:0;padding-left:18px;color:${NAVY};font:15px/1.6 Arial,sans-serif">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
      : '';

  const html = `<!doctype html><html><body style="margin:0;background:${CREAM};padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #eadcb9;border-radius:12px;overflow:hidden">
    <tr><td style="background:${NAVY};padding:22px 28px">
      <div style="color:#fff;font:700 20px Georgia,serif">Evincers</div>
      <div style="color:${GOLD};font:12px Arial,sans-serif;letter-spacing:.14em">VISION BOARD</div>
    </td></tr>
    <tr><td style="padding:26px 28px">
      <p style="margin:0 0 10px;color:${NAVY};font:700 22px Georgia,serif">Hi ${esc(first)},</p>
      <p style="margin:0;color:${NAVY};font:16px/1.6 Arial,sans-serif">${esc(intro)}</p>
      ${streak ? `<p style="margin:10px 0 0;color:${GOLD};font:700 15px Arial,sans-serif">${esc(streak)}</p>` : ''}
      ${list('NEEDS ATTENTION', '#b4372f', overdue.slice(0, 5).map((s) => esc(stepLine(s))))}
      ${list('DUE THIS WEEK', GOLD, soon.slice(0, 5).map((s) => esc(stepLine(s))))}
      ${list('YOUR VISIONS', NAVY, active.slice(0, 6).map((v) => esc(visionLine(v))))}
      <blockquote style="margin:26px 0 0;padding:4px 0 4px 14px;border-left:3px solid ${GOLD};color:${NAVY};font:italic 16px/1.6 Georgia,serif">
        &ldquo;${esc(verse.text)}&rdquo;<br><span style="font:12px Arial,sans-serif;letter-spacing:.08em;color:#6b7690">${esc(verse.ref.toUpperCase())}</span>
      </blockquote>
      <p style="margin:28px 0 0"><a href="${esc(siteUrl)}" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;font:700 15px Arial,sans-serif;padding:12px 22px;border-radius:8px">Open my vision board</a></p>
    </td></tr>
    <tr><td style="padding:16px 28px 24px;color:#6b7690;font:12px/1.5 Arial,sans-serif;border-top:1px solid #eadcb9">
      Dream it. Plan it. Live it.<br>
      <a href="${esc(siteUrl)}/settings" style="color:#6b7690">Change how often you get these emails</a>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return {
    to: member.email,
    subject: overdue.length ? `${first}, ${overdue.length} step${overdue.length === 1 ? '' : 's'} on your vision board need you` : `${first}, your vision check-in`,
    text,
    html,
  };
}

export interface RunDeps {
  members: () => AsyncIterable<Member>;
  store: Store;
  send: (email: Email) => Promise<void>;
  now: Date;
  siteUrl: string;
}

export interface RunResult {
  sent: number;
  skipped: number;
  failed: number;
}

/** Monthly subscribers are emailed on the first run of each month (days 1-7). */
export const isDueToday = (frequency: 'weekly' | 'monthly' | 'off', now: Date) =>
  frequency === 'weekly' || (frequency === 'monthly' && now.getUTCDate() <= 7);

export async function runReminders(deps: RunDeps): Promise<RunResult> {
  const result: RunResult = { sent: 0, skipped: 0, failed: 0 };
  const verse = verseForWeek(deps.now);

  for await (const member of deps.members()) {
    try {
      const profile = await deps.store.getProfile(member.userId);
      if (!isDueToday(profile?.reminders ?? 'weekly', deps.now)) {
        result.skipped++;
        continue;
      }
      const [visions, steps, gratitude] = await Promise.all([
        deps.store.listVisions(member.userId),
        deps.store.listAllSteps(member.userId),
        deps.store.listGratitude(member.userId),
      ]);
      const { streakWeeks } = computeJourney({ visions, steps, gratitude, now: deps.now });
      await deps.send(buildDigest({ member, visions, steps, streakWeeks, now: deps.now, siteUrl: deps.siteUrl, verse }));
      result.sent++;
    } catch (err) {
      // One bad address must not stop everyone else's reminder.
      console.error('Reminder failed for', member.userId, err);
      result.failed++;
    }
  }
  return result;
}
