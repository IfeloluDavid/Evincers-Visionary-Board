import { Flame, Footprints, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Band from '../components/Band';
import ProgressRing from '../components/ProgressRing';
import VisionCard from '../components/VisionCard';
import VisionForm from '../components/VisionForm';
import { useJourney } from '../JourneyContext';
import { CATEGORY_META, CATEGORY_ORDER, STATUS_LABEL, greeting, percent, relativeDay } from '../lib';
import type { Category, Status, UpcomingStep, Vision } from '../types';

export default function Board() {
  const { session } = useAuth();
  const { journey, me, refresh } = useJourney();
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
    const active = (visions ?? []).filter((v) => v.status === 'active');
    const total = active.reduce((n, v) => n + v.stepsTotal, 0);
    const done = active.reduce((n, v) => n + v.stepsDone, 0);
    return { active: active.length, total, done };
  }, [visions]);

  const shown = (visions ?? []).filter(
    (v) => (status === 'all' || v.status === status) && (category === 'all' || v.category === category),
  );

  async function completeStep(s: UpcomingStep) {
    setUpcoming((list) => list.filter((x) => x.id !== s.id)); // optimistic
    try {
      await api.updateStep(s.visionId, s.id, { done: true });
      void refresh({ xp: 10 });
    } catch (err) {
      setError((err as Error).message);
    }
    void load();
  }

  const firstName = session?.name.split(' ')[0] ?? 'friend';

  return (
    <>
      <section className="welcome">
        <div className="welcome-main">
          <h1 className="script-title">
            {greeting()}, <span>{firstName}</span>
          </h1>
          {me?.verse && (
            <blockquote className="votd">
              <p>“{me.verse.text}”</p>
              <cite>{me.verse.ref}</cite>
            </blockquote>
          )}
        </div>

        <div className="welcome-side">
          {journey && (
            <Link to="/journey" className="level-chip" aria-label={`Level ${journey.level.level}, ${journey.level.name}. Open your journey.`}>
              <span className="level-num">{journey.level.level}</span>
              <span className="level-info">
                <strong>{journey.level.name}</strong>
                <span className="xpbar" role="img" aria-label={`${journey.levelPct}% to next level`}>
                  <span style={{ width: `${journey.levelPct}%` }} />
                </span>
                <small>{journey.next ? `${journey.next.xpNeeded} XP to ${journey.next.name}` : 'Top of the mountain'}</small>
              </span>
              {journey.streakWeeks > 0 && (
                <span className="level-streak"><Flame size={16} aria-hidden />{journey.streakWeeks}</span>
              )}
            </Link>
          )}
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden /> New vision
          </button>
        </div>
      </section>

      {error && <p className="error banner" role="alert">{error}</p>}

      {visions !== null && visions.length === 0 ? (
        <section className="empty">
          <h2 className="script-h">Write the vision</h2>
          <p>
            Start with one thing God has put on your heart: a habit, a calling, a family goal. Then break it into steps
            you can take this week.
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
                  <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                ))}
              </select>
              {stats.total > 0 && (
                <span className="overall muted">
                  <ProgressRing value={percent(stats.done, stats.total)} size={34} /> {stats.done}/{stats.total} steps
                </span>
              )}
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
            <Band icon={Footprints} title="Up next" hint="Your next steps" />
            {upcoming.length === 0 ? (
              <p className="muted">No open steps. Add steps to a vision and they will show up here.</p>
            ) : (
              <ul>
                {upcoming.slice(0, 6).map((s) => {
                  const due = s.dueDate ? relativeDay(s.dueDate) : null;
                  const Icon = CATEGORY_META[s.category].icon;
                  return (
                    <li key={s.id}>
                      <input type="checkbox" aria-label={`Mark "${s.title}" done`} onChange={() => void completeStep(s)} />
                      <div>
                        <span>{s.title}</span>
                        <small className="muted">
                          <Link to={`/vision/${s.visionId}`}><Icon size={13} aria-hidden /> {s.visionTitle}</Link>
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
            void refresh({ xp: 20 });
          }}
        />
      )}
    </>
  );
}
