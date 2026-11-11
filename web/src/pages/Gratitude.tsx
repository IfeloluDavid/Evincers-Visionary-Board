import { Heart, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import Band from '../components/Band';
import { useJourney } from '../JourneyContext';
import type { Gratitude as Entry } from '../types';

const PROMPTS = ['A prayer God answered', 'Someone who helped me', 'Something God provided', 'A small joy today', 'A lesson I learned'];

export default function Gratitude() {
  const { journey, refresh } = useJourney();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.gratitude().then((r) => setEntries(r.entries)).catch((e: Error) => setError(e.message));
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const entry = await api.addGratitude(text);
      setEntries((list) => [entry, ...(list ?? [])]);
      setText('');
      void refresh({ xp: 5 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setEntries((list) => (list ?? []).filter((x) => x.id !== id));
    try {
      await api.deleteGratitude(id);
      void refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const groups = useMemo(() => {
    const out: { month: string; items: Entry[] }[] = [];
    for (const e of entries ?? []) {
      const month = new Date(e.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const last = out[out.length - 1];
      if (last?.month === month) last.items.push(e);
      else out.push({ month, items: [e] });
    }
    return out;
  }, [entries]);

  const badge = journey?.badges.find((b) => b.id === 'grateful');

  return (
    <>
      <header className="page-head">
        <h1 className="script-title">Gratitude <span>Journal</span></h1>
        <p className="muted">Before we plan what is next, we remember what God has already done.</p>
      </header>

      <section className="card-plain">
        <Band icon={Heart} title="What I'm Grateful For" hint="This past year…">
          {badge && !badge.earned && <span className="count">{badge.progress.current}/{badge.progress.target} for a badge</span>}
        </Band>
        <form className="grat-form" onSubmit={(e) => void add(e)}>
          <input
            required
            maxLength={300}
            aria-label="I am grateful for"
            placeholder="I'm grateful for…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn primary" disabled={busy}>Add</button>
        </form>
        <div className="prompts" aria-label="Need an idea?">
          {PROMPTS.map((p) => (
            <button key={p} type="button" className="chip-btn" onClick={() => setText((t) => (t ? t : p + ': '))}>{p}</button>
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {entries === null ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <section className="empty">
          <h2 className="script-h">Start with one</h2>
          <p>What is one thing you are thankful for today? It can be as small as a good night&rsquo;s sleep.</p>
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.month} className="grat-group">
            <h2 className="section-title">{g.month}</h2>
            <ul className="grat-list">
              {g.items.map((e) => (
                <li key={e.id}>
                  <Heart size={16} aria-hidden className="heart" />
                  <span>{e.text}</span>
                  <time className="muted tiny" dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time>
                  <button className="icon" aria-label={`Delete "${e.text}"`} onClick={() => void remove(e.id)}><X size={16} aria-hidden /></button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
