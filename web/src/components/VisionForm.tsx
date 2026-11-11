import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { CATEGORY_META, CATEGORY_ORDER, HORIZON_META, STATUS_LABEL } from '../lib';
import type { Category, Horizon, Status, Vision, VisionInput, Visibility } from '../types';

interface Props {
  /** Pass a vision to edit it; omit to create a new one. */
  vision?: Vision;
  onClose: () => void;
  onSaved: (v: Vision) => void;
}

export default function VisionForm({ vision, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(vision?.title ?? '');
  const [category, setCategory] = useState<Category>(vision?.category ?? 'spiritual');
  const [horizon, setHorizon] = useState<Horizon>(vision?.horizon ?? 'long');
  const [description, setDescription] = useState(vision?.description ?? '');
  const [scripture, setScripture] = useState(vision?.scripture ?? '');
  const [targetDate, setTargetDate] = useState(vision?.targetDate ?? '');
  const [status, setStatus] = useState<Status>(vision?.status ?? 'active');
  const [visibility, setVisibility] = useState<Visibility>(vision?.visibility ?? 'private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const input: VisionInput = {
      title,
      category,
      horizon,
      description,
      scripture,
      targetDate: targetDate || null,
      visibility,
      ...(vision ? { status } : {}),
    };
    try {
      const saved = vision ? await api.updateVision(vision.id, input) : await api.createVision(input);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} onClick={(e) => e.target === dialog.current && onClose()}>
      <form onSubmit={submit} className="stack">
        <h2 className="script-h">{vision ? 'Edit vision' : 'Write the vision'}</h2>

        <label>
          What is the vision?
          <input
            required
            maxLength={120}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Read through the whole Bible this year"
          />
        </label>

        <fieldset className="field">
          <legend>Area of life</legend>
          <div className="pick-grid">
            {CATEGORY_ORDER.map((c) => {
              const Icon = CATEGORY_META[c].icon;
              return (
                <label key={c} className={`pick cat-${c} ${category === c ? 'on' : ''}`}>
                  <input type="radio" name="category" checked={category === c} onChange={() => setCategory(c)} />
                  <Icon size={18} aria-hidden />
                  <span>{CATEGORY_META[c].label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Time horizon</legend>
          <div className="seg">
            {(Object.keys(HORIZON_META) as Horizon[]).map((h) => (
              <label key={h} className={horizon === h ? 'on' : ''}>
                <input type="radio" name="horizon" checked={horizon === h} onChange={() => setHorizon(h)} />
                <strong>{HORIZON_META[h].label}</strong>
                <small>{HORIZON_META[h].hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Make it plain <span className="muted">(why does it matter?)</span></span>
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what it looks like when this is fulfilled."
          />
        </label>

        <label>
          <span>Anchor scripture or declaration <span className="muted">(optional)</span></span>
          <input maxLength={300} value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Philippians 4:13" />
        </label>

        <div className="row">
          <label>
            <span>Target date <span className="muted">(optional)</span></span>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </label>
          {vision && (
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="check">
          <input type="checkbox" checked={visibility === 'church'} onChange={(e) => setVisibility(e.target.checked ? 'church' : 'private')} />
          <span>
            Share with the church community
            <small className="muted">Others will see the title, description, scripture and progress. Your steps stay private.</small>
          </span>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : vision ? 'Save changes' : 'Add to my board'}</button>
        </div>
      </form>
    </dialog>
  );
}
