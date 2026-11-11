import { Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import PostcardView, { type PostcardContent } from '../components/PostcardView';
import { formatDay } from '../lib';
import type { Gratitude, Step, Vision } from '../types';

/** Shown on the printed card when a long-term vision has no target date of its own. */
const DEFAULT_LONG_HINT = 'By November 2027…';

export default function Postcard() {
  const { session } = useAuth();
  const [variant, setVariant] = useState<'postcard' | 'writeup'>('postcard');
  const [blank, setBlank] = useState(false);
  const [visions, setVisions] = useState<Vision[] | null>(null);
  const [gratitude, setGratitude] = useState<Gratitude[]>([]);
  const [immediateId, setImmediateId] = useState('');
  const [longId, setLongId] = useState('');
  const [stepsBy, setStepsBy] = useState<Record<string, Step[]>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.listVisions(), api.gratitude()])
      .then(([v, g]) => {
        setVisions(v);
        setGratitude(g.entries);
        const active = v.filter((x) => x.status === 'active');
        // newest first from the API; the best default is the one most recently written for each horizon
        setImmediateId(active.find((x) => x.horizon === 'immediate')?.id ?? '');
        setLongId(active.find((x) => x.horizon === 'long')?.id ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  // Steps for the two chosen visions.
  useEffect(() => {
    for (const id of [immediateId, longId]) {
      if (!id || stepsBy[id]) continue;
      api.getVision(id).then((r) => setStepsBy((m) => ({ ...m, [id]: r.steps }))).catch(() => {});
    }
  }, [immediateId, longId, stepsBy]);

  const byId = useMemo(() => new Map((visions ?? []).map((v) => [v.id, v])), [visions]);
  const immediate = byId.get(immediateId);
  const long = byId.get(longId);

  const content: PostcardContent = useMemo(() => {
    if (blank) {
      return { grateful: [], immediate: [], long: [], steps: [], longHint: DEFAULT_LONG_HINT };
    }
    const describe = (v?: Vision) =>
      v ? [v.title, ...(v.targetDate ? [`By ${formatDay(v.targetDate)}`] : [])] : [];
    const all = [...(stepsBy[immediateId] ?? []), ...(stepsBy[longId] ?? [])];
    const stepLines =
      variant === 'writeup'
        ? [...all.filter((s) => s.done).map((s) => `✓ ${s.title}`), ...all.filter((s) => !s.done).map((s) => s.title)]
        : all.filter((s) => !s.done).map((s) => s.title);
    return {
      grateful: gratitude.slice(0, 3).map((g) => g.text),
      immediate: describe(immediate),
      long: describe(long),
      steps: stepLines,
      longHint: long?.targetDate ? `By ${new Date(long.targetDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}…` : DEFAULT_LONG_HINT,
    };
  }, [blank, variant, gratitude, immediate, long, stepsBy, immediateId, longId]);

  const options = (visions ?? []).filter((v) => v.status === 'active');

  return (
    <>
      <header className="page-head no-print">
        <h1 className="script-title">My <span>Postcard</span></h1>
        <p className="muted">
          Print your vision on a card for your wall, Bible or fridge. Fill it in from your board, or print it blank and
          write it by hand.
        </p>
      </header>

      {error && <p className="error banner no-print" role="alert">{error}</p>}

      <section className="pc-controls no-print" aria-label="Postcard options">
        <div className="seg compact" role="group" aria-label="Card type">
          <label className={variant === 'postcard' ? 'on' : ''}>
            <input type="radio" name="variant" checked={variant === 'postcard'} onChange={() => setVariant('postcard')} />
            <strong>Visionary Postcard</strong>
          </label>
          <label className={variant === 'writeup' ? 'on' : ''}>
            <input type="radio" name="variant" checked={variant === 'writeup'} onChange={() => setVariant('writeup')} />
            <strong>The Write-Up</strong>
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} />
          <span>Print blank, to handwrite</span>
        </label>

        {!blank && (
          <div className="row">
            <label>
              Immediate goal
              <select value={immediateId} onChange={(e) => setImmediateId(e.target.value)}>
                <option value="">None selected</option>
                {options.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            </label>
            <label>
              Long-term goal
              <select value={longId} onChange={(e) => setLongId(e.target.value)}>
                <option value="">None selected</option>
                {options.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            </label>
          </div>
        )}

        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={18} aria-hidden /> Print or save as PDF
        </button>
        <p className="muted tiny">Tip: in the print window choose “A5” or “Fit to page”, landscape, and turn on “Background graphics”.</p>
      </section>

      <div className="pc-wrap">
        <PostcardView variant={variant} name={session?.name ?? ''} content={content} />
      </div>
    </>
  );
}
