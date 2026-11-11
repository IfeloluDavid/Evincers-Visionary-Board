import {
  Award, Check, Compass, Flag, Flame, Footprints, Heart, HandHeart, ListChecks, Lock, Mountain, PenLine, Trophy,
  TrendingUp, type LucideIcon,
} from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { useJourney } from '../JourneyContext';

const BADGE_ICON: Record<string, LucideIcon> = {
  written: PenLine,
  plan: ListChecks,
  'first-step': Footprints,
  'ten-steps': TrendingUp,
  'fifty-steps': Mountain,
  grateful: Heart,
  faithful: Flame,
  rounded: Compass,
  encourager: HandHeart,
  fulfilled: Trophy,
};

// Keep in sync with XP in backend/src/journey.ts.
const XP_RULES: [string, number][] = [
  ['Write a vision', 20],
  ['Finish a step', 10],
  ['Share a vision with the church', 10],
  ['Record something you are grateful for', 5],
  ['See a vision fulfilled', 150],
];

const W = 360;
const POS = [
  { x: 112, y: 628 },
  { x: 250, y: 520 },
  { x: 118, y: 410 },
  { x: 246, y: 300 },
  { x: 124, y: 190 },
  { x: 232, y: 82 },
];

const seg = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  `M${a.x} ${a.y}C${a.x} ${a.y - 62} ${b.x} ${b.y + 62} ${b.x} ${b.y}`;

export default function Journey() {
  const { journey: j } = useJourney();
  if (!j) return <p className="muted">Loading your journey…</p>;

  const here = j.level.level - 1;
  const earned = j.badges.filter((b) => b.earned).length;

  return (
    <>
      <header className="page-head">
        <h1 className="script-title">My <span>Journey</span></h1>
        <p className="muted">Every step you take, every vision you write and every thank-you you record moves you up the mountain.</p>
      </header>

      <div className="journey-layout">
        <div className="stack-lg">
          <section className="level-card">
            <div className="level-emblem" aria-hidden>
              <span>{j.level.level}</span>
            </div>
            <div>
              <p className="eyebrow">Level {j.level.level}</p>
              <h2>{j.level.name}</h2>
              <div className="xpbar big" role="img" aria-label={`${j.levelPct}% to the next level`}>
                <span style={{ width: `${j.levelPct}%` }} />
              </div>
              <p className="muted small">
                {j.xp} XP{j.next ? ` · ${j.next.xpNeeded} more to become a ${j.next.name}` : ' · you have reached the summit'}
              </p>
            </div>
          </section>

          <section className="stat-row" aria-label="Your numbers">
            <div className="stat streak-stat">
              <Flame size={22} aria-hidden />
              <strong>{j.streakWeeks}</strong>
              <span>week streak</span>
              <small>best {j.bestStreakWeeks}</small>
            </div>
            <div className="stat"><strong>{j.stats.stepsDone}</strong><span>steps done</span></div>
            <div className="stat"><strong>{j.stats.visions}</strong><span>visions</span></div>
            <div className="stat"><strong>{j.stats.gratitude}</strong><span>gratitudes</span></div>
          </section>

          <section>
            <h2 className="section-title">Badges <span className="muted">{earned} of {j.badges.length}</span></h2>
            <ul className="badges">
              {j.badges.map((b) => {
                const Icon = BADGE_ICON[b.id] ?? Award;
                const pct = Math.round((b.progress.current / b.progress.target) * 100);
                return (
                  <li key={b.id} className={b.earned ? 'earned' : ''}>
                    <span className="badge-disc">{b.earned ? <Icon size={24} aria-hidden /> : <Lock size={18} aria-hidden />}</span>
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.description}</small>
                      {!b.earned && (
                        <span className="mini-progress" role="img" aria-label={`${b.progress.current} of ${b.progress.target}`}>
                          <span style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="xp-rules">
            <h2 className="section-title">How you earn XP</h2>
            <ul>
              {XP_RULES.map(([what, xp]) => (
                <li key={what}><span>{what}</span><b>+{xp}</b></li>
              ))}
            </ul>
          </section>
        </div>

        <figure className="map" aria-label="Your journey map">
          <svg viewBox={`0 0 ${W} 700`} role="img" aria-label={`Journey map. You are a ${j.level.name}, level ${j.level.level} of ${j.levels.length}.`}>
            <path d="M0 700C70 650 40 600 110 585C180 570 300 590 360 540V700Z" className="hill" />
            {POS.slice(0, -1).map((p, i) => (
              <path key={i} d={seg(p, POS[i + 1]!)} className={`map-path ${i < here ? 'walked' : ''}`} fill="none" />
            ))}
            {j.levels.map((l, i) => {
              const p = POS[i]!;
              const right = p.x < W / 2;
              const current = i === here;
              return (
                <g key={l.level} transform={`translate(${p.x} ${p.y})`} className={`map-node ${l.reached ? 'reached' : ''} ${current ? 'current' : ''}`}>
                  {current && <circle r="34" className="pulse" />}
                  <circle r="25" className="node-disc" />
                  {l.reached && !current ? <Check x={-11} y={-11} size={22} strokeWidth={3} className="node-icon" /> : <text className="node-num" textAnchor="middle" y="7">{l.level}</text>}
                  <text x={right ? 40 : -40} y="-3" textAnchor={right ? 'start' : 'end'} className="node-name">{l.name}</text>
                  <text x={right ? 40 : -40} y="16" textAnchor={right ? 'start' : 'end'} className="node-xp">{l.xp} XP</text>
                  {current && (
                    <g transform="translate(-13 -62)" className="you">
                      <LogoMark size={26} />
                    </g>
                  )}
                </g>
              );
            })}
            <g transform={`translate(${POS[5]!.x + 2} ${POS[5]!.y - 70})`} className={`summit-flag ${j.levels[5]!.reached ? 'reached' : ''}`}>
              <Flag x={-14} y={-14} size={28} />
            </g>
          </svg>
          <figcaption>Dream it. Plan it. Live it.</figcaption>
        </figure>
      </div>
    </>
  );
}
