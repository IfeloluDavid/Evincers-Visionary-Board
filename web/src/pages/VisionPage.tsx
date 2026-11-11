import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Footprints, Pencil, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import Band from '../components/Band';
import ProgressRing from '../components/ProgressRing';
import Trail from '../components/Trail';
import { useJourney } from '../JourneyContext';
import VisionForm from '../components/VisionForm';
import { CATEGORY_META, HORIZON_META, STATUS_LABEL, formatDay, percent, relativeDay } from '../lib';
import type { Step, Vision } from '../types';

export default function VisionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { refresh } = useJourney();
  const [vision, setVision] = useState<Vision | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.getVision(id);
      setVision(r.vision);
      setSteps(r.steps);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) {
    return (
      <div className="empty">
        <h2>Vision not found</h2>
        <Link to="/" className="btn primary">Back to my board</Link>
      </div>
    );
  }
  if (!vision) return <p className="muted">{error || 'Loading…'}</p>;

  const meta = CATEGORY_META[vision.category];
  const CatIcon = meta.icon;
  const pct = percent(vision.stepsDone, vision.stepsTotal);
  const due = vision.targetDate ? relativeDay(vision.targetDate) : null;
  const allDone = vision.stepsTotal > 0 && vision.stepsDone === vision.stepsTotal && vision.status === 'active';

  const guard = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
      void load();
    }
  };

  async function addStep(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    await guard(async () => {
      const r = await api.addStep(id, { title: newTitle, dueDate: newDue || null });
      setSteps((s) => [...s, r.step]);
      setVision(r.vision);
      setNewTitle('');
      setNewDue('');
    });
    setAdding(false);
  }

  const toggle = (s: Step) =>
    guard(async () => {
      setSteps((list) => list.map((x) => (x.id === s.id ? { ...x, done: !s.done } : x))); // optimistic
      const r = await api.updateStep(id, s.id, { done: !s.done });
      setSteps((list) => list.map((x) => (x.id === s.id ? r.step : x)));
      setVision(r.vision);
      if (!s.done) void refresh({ xp: 10 });
    });

  const saveStepTitle = (s: Step) =>
    guard(async () => {
      const title = draft.trim();
      setEditingStep(null);
      if (!title || title === s.title) return;
      const r = await api.updateStep(id, s.id, { title });
      setSteps((list) => list.map((x) => (x.id === s.id ? r.step : x)));
    });

  const removeStep = (s: Step) =>
    guard(async () => {
      setSteps((list) => list.filter((x) => x.id !== s.id));
      const r = await api.deleteStep(id, s.id);
      setVision(r.vision);
    });

  const markAchieved = () =>
    guard(async () => {
      setVision(await api.updateVision(id, { status: 'achieved' }));
      void refresh({ xp: 150 });
    });

  const removeVision = () =>
    guard(async () => {
      if (!window.confirm(`Delete "${vision.title}" and all of its steps? This cannot be undone.`)) return;
      await api.deleteVision(id);
      navigate('/');
    });

  return (
    <article className={`detail cat-${vision.category}`}>
      <Link to="/" className="back">← My board</Link>

      <header className="detail-head">
        <div>
          <span className="cat"><span className="cat-icon"><CatIcon size={18} aria-hidden /></span> {meta.label} · {HORIZON_META[vision.horizon].label}</span>
          <h1 className="vision-title">{vision.title}</h1>
          <div className="meta">
            <span className={`badge ${vision.status}`}>{STATUS_LABEL[vision.status]}</span>
            {vision.targetDate && (
              <span>
                Target {formatDay(vision.targetDate)}
                {due && vision.status === 'active' && <span className={`chip ${due.tone}`}>{due.text}</span>}
              </span>
            )}
            <span>{vision.visibility === 'church' ? 'Shared with the church' : 'Private'}</span>
          </div>
        </div>
        <ProgressRing value={pct} size={96} />
      </header>

      {vision.scripture && <blockquote className="scripture">{vision.scripture}</blockquote>}
      {vision.description && <p className="description">{vision.description}</p>}

      <div className="toolbar">
        <button className="btn" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden /> Edit</button>
        {vision.status !== 'achieved' ? (
          <button className="btn" onClick={() => void markAchieved()}>Mark achieved ✓</button>
        ) : (
          <button className="btn" onClick={() => void guard(async () => setVision(await api.updateVision(id, { status: 'active' })))}>
            Reopen
          </button>
        )}
        <button className="btn danger" onClick={() => void removeVision()}><Trash2 size={16} aria-hidden /> Delete</button>
      </div>

      {error && <p className="error banner" role="alert">{error}</p>}

      {allDone && (
        <div className="celebrate" role="status">
          Every step is done. Well done! <button className="link" onClick={() => void markAchieved()}>Mark this vision achieved</button>
        </div>
      )}

      <Trail steps={steps} title={vision.title} achieved={vision.status === 'achieved'} />

      <section className="steps" aria-label="Steps">
        <Band icon={Footprints} title="The Steps I'm Taking" hint="To get there…">
          <span className="count">{vision.stepsDone}/{vision.stepsTotal}</span>
        </Band>

        <form className="add-step" onSubmit={(e) => void addStep(e)}>
          <input
            required
            maxLength={200}
            placeholder="What's the next step?"
            aria-label="New step"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input type="date" aria-label="Due date (optional)" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          <button className="btn primary" disabled={adding}>Add</button>
        </form>

        {steps.length === 0 ? (
          <p className="muted pad">Break this vision into small, concrete steps you can act on this week.</p>
        ) : (
          <ul className="step-list">
            {steps.map((s) => {
              const sd = s.dueDate && !s.done ? relativeDay(s.dueDate) : null;
              return (
                <li key={s.id} className={s.done ? 'done' : ''}>
                  <input type="checkbox" checked={s.done} aria-label={`Mark "${s.title}" ${s.done ? 'not done' : 'done'}`} onChange={() => void toggle(s)} />
                  {editingStep === s.id ? (
                    <input
                      autoFocus
                      className="inline"
                      maxLength={200}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => void saveStepTitle(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveStepTitle(s);
                        if (e.key === 'Escape') setEditingStep(null);
                      }}
                    />
                  ) : (
                    <span className="step-title">{s.title}</span>
                  )}
                  {sd && <span className={`chip ${sd.tone}`}>{sd.text}</span>}
                  {s.done && s.doneAt && <small className="muted">Done {new Date(s.doneAt).toLocaleDateString()}</small>}
                  <span className="step-actions">
                    <button className="icon" aria-label={`Edit "${s.title}"`} onClick={() => { setEditingStep(s.id); setDraft(s.title); }}><Pencil size={15} aria-hidden /></button>
                    <button className="icon" aria-label={`Delete "${s.title}"`} onClick={() => void removeStep(s)}><X size={16} aria-hidden /></button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editing && (
        <VisionForm
          vision={vision}
          onClose={() => setEditing(false)}
          onSaved={(v) => {
            setVision(v);
            setEditing(false);
          }}
        />
      )}
    </article>
  );
}
