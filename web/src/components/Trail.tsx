import { Check, Flag, Mountain } from 'lucide-react';
import type { Step } from '../types';

const COLS = 5;
const GAP_X = 108;
const GAP_Y = 84;
const PAD = 54;
const MAX_STONES = 20;

/**
 * A vision's steps as stepping stones climbing to the summit. Every step is a stone; the first open one is "you are
 * here". With more than 20 steps, neighbouring steps are grouped so the map stays readable.
 */
export default function Trail({ steps, title, achieved }: { steps: Step[]; title: string; achieved: boolean }) {
  if (steps.length === 0) return null;

  const stones = Math.min(steps.length, MAX_STONES);
  const group = Math.ceil(steps.length / stones);
  const nodes = Array.from({ length: stones }, (_, i) => {
    const chunk = steps.slice(i * group, (i + 1) * group);
    return { done: chunk.every((s) => s.done), label: chunk.length > 1 ? `Steps ${i * group + 1}-${i * group + chunk.length}` : chunk[0]!.title };
  });
  const hereIdx = nodes.findIndex((n) => !n.done);

  const rows = Math.ceil((stones + 1) / COLS); // +1 for the summit
  const width = PAD * 2 + GAP_X * (COLS - 1);
  const height = PAD * 2 + GAP_Y * (rows - 1);

  const pos = (i: number) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x = PAD + (row % 2 === 0 ? col : COLS - 1 - col) * GAP_X;
    const y = height - PAD - row * GAP_Y - (col % 2 === 0 ? 0 : 10); // gentle wave
    return { x, y };
  };

  const points = Array.from({ length: stones + 1 }, (_, i) => pos(i));
  const segment = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const sameRow = Math.abs(a.y - b.y) < GAP_Y / 2;
    return sameRow
      ? `M${a.x} ${a.y}C${a.x + (b.x - a.x) / 2} ${a.y - 18} ${a.x + (b.x - a.x) / 2} ${b.y + 18} ${b.x} ${b.y}`
      : `M${a.x} ${a.y}C${a.x + (a.x < width / 2 ? -50 : 50)} ${a.y - 20} ${b.x + (b.x < width / 2 ? -50 : 50)} ${b.y + 20} ${b.x} ${b.y}`;
  };

  const doneCount = nodes.filter((n) => n.done).length;
  const summit = points[stones]!;

  return (
    <figure className="trail">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trail: ${doneCount} of ${stones} stones passed on the way to “${title}”`}>
        {points.slice(0, -1).map((p, i) => (
          <path
            key={i}
            d={segment(p, points[i + 1]!)}
            className={i < doneCount ? 'trail-path walked' : 'trail-path'}
            fill="none"
          />
        ))}

        {nodes.map((n, i) => {
          const { x, y } = points[i]!;
          const here = i === hereIdx;
          return (
            <g key={i} transform={`translate(${x} ${y})`} className={`stone ${n.done ? 'done' : ''} ${here ? 'here' : ''}`}>
              <title>{n.label}</title>
              {here && <circle r="22" className="pulse" />}
              <circle r="15" className="stone-disc" />
              {n.done ? <Check x={-8} y={-8} size={16} strokeWidth={3} className="stone-icon" /> : <text className="stone-num" textAnchor="middle" y="4.5">{i + 1}</text>}
            </g>
          );
        })}

        <g transform={`translate(${summit.x} ${summit.y})`} className={`summit ${achieved || hereIdx === -1 ? 'reached' : ''}`}>
          <title>{title}</title>
          <circle r="23" className="stone-disc" />
          {achieved || hereIdx === -1 ? <Flag x={-11} y={-11} size={22} className="stone-icon" /> : <Mountain x={-11} y={-11} size={22} className="stone-icon" />}
        </g>
      </svg>
      <figcaption>
        <strong>{doneCount}</strong> of {stones} stones crossed{hereIdx >= 0 && <> · next: <em>{nodes[hereIdx]!.label}</em></>}
      </figcaption>
    </figure>
  );
}
