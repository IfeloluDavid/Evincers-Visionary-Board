import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import ProgressRing from '../components/ProgressRing';
import VisionCard from '../components/VisionCard';
import VisionForm from '../components/VisionForm';
import { CATEGORY_META, CATEGORY_ORDER, STATUS_LABEL, percent, relativeDay } from '../lib';
import type { Category, Status, UpcomingStep, Vision } from '../types';

export default function Board() {
  const { session } = useAuth();
  const [visions, setVisions] = useState<Vision[] | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingStep[]>([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<Status | 'all'>('active');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const [v, u] = await Promise.all([api.listVisions(), api.upcoming()]);
      setVisions(v);
      setUpcoming(u);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const all = visions ?? [];
    const active = all.filter((v) => v.status === 'active');
    const total = active.reduce((n, v) => n + v.stepsTotal, 0);
    const done = active.reduce((n, v) => n + v.stepsDone, 0);
    return { active: active.length, achieved: all.filter((v) => v.status === 'achieved').length, total, done };
  }, [visions]);

  const shown = (visions ?? []).filter(
    (v) => (status === 'all' || v.status === status) && (category === 'all' || v.category === category),
  );

  async function completeStep(s: UpcomingStep) {
    setUpcoming((list) => list.filter((x) => x.id !== s.id)); // optimistic
    try {
      await api.updateStep(s.visionId, s.id, { done: true });
    } catch (err) {
      setError((err as Error).message);
    }
    void load();
  }

  const firstName = session?.name.split(' ')[0] ?? 'friend';

  return (
    <>
      <section className="hero">
        <div>
          <h1>Hello, {firstName} 👋</h1>
          <p className="muted">
            {visions === null
              ? 'Loading your board…'
              : stats.active === 0
                ? 'Your board is waiting for its first vision.'
                : `${stats.active} active vision${stats.active === 1 ? '' : 's'} · ${stats.achieved} achieved`}
          </p>
        </div>
        {stats.total > 0 && (
          <div className="hero-progress">
            <ProgressRing value={percent(stats.done, stats.total)} size={72} />
            <span className="muted">{stats.done} of {stats.total} steps done</span>
          </div>
        )}
        <button className="btn primary" onClick={() => setCreating(true)}>＋ New vision</button>
      </section>

      {error && <p className="error banner" role="alert">{error}</p>}

      {visions !== null && visions.length === 0 ? (
        <section className="empty">
          <div className="empty-icon" aria-hidden>📜</div>
          <h2>Write the vision</h2>
          <p>
            Start with one thing God has put on your heart — a habit, a calling, a family goal. Then break it into steps
            you can actually take this week.
          </p>
          <button className="btn primary" onClick={() => setCreating(true)}>Write my first vision</button>
        </section>
      ) : (
        <div className="board-layout">
          <section aria-label="My visions">
            <div className="filters">
              <div className="chips" role="group" aria-label="Filter by status">
                {(['active', 'achieved', 'paused', 'all'] as const).map((s) => (
                  <button key={s} className={`chip-btn ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
                    {s === 'all' ? 'All' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <select aria-label="Filter by area of life" value={category} onChange={(e) => setCategory(e.target.value as Category | 'all')}>
                <option value="all">All areas</option>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
                ))}
              </select>
            </div>

            {visions === null ? (
              <p className="muted">Loading…</p>
            ) : shown.length === 0 ? (
              <p className="muted pad">No visions match these filters.</p>
            ) : (
              <div className="masonry">
                {shown.map((v) => (
                  <VisionCard key={v.id} vision={v} />
                ))}
              </div>
            )}
          </section>

          <aside className="upnext" aria-label="Up next">
            <h2>Up next</h2>
            {upcoming.length === 0 ? (
              <p className="muted">No open steps. Add steps to a vision and they will show up here.</p>
            ) : (
              <ul>
                {upcoming.map((s) => {
                  const due = s.dueDate ? relativeDay(s.dueDate) : null;
                  return (
                    <li key={s.id}>
                      <input
                        type="checkbox"
                        aria-label={`Mark "${s.title}" done`}
                        onChange={() => void completeStep(s)}
                      />
                      <div>
                        <span>{s.title}</span>
                        <small className="muted">
                          <Link to={`/vision/${s.visionId}`}>{CATEGORY_META[s.category].emoji} {s.visionTitle}</Link>
                          {due && <span className={`chip ${due.tone}`}>{due.text}</span>}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}

      {creating && (
        <VisionForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
    </>
  );
}
