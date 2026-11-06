import { Link } from 'react-router-dom';
import { CATEGORY_META, STATUS_LABEL, percent, relativeDay } from '../lib';
import type { PublicVision, Vision } from '../types';

export default function VisionCard({ vision, community = false }: { vision: Vision | PublicVision; community?: boolean }) {
  const meta = CATEGORY_META[vision.category];
  const pct = percent(vision.stepsDone, vision.stepsTotal);
  const due = vision.targetDate && vision.status === 'active' ? relativeDay(vision.targetDate) : null;
  const mine = 'mine' in vision && vision.mine;

  const body = (
    <>
      <div className="card-top">
        <span className="cat">
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </span>
        {vision.status !== 'active' && <span className={`badge ${vision.status}`}>{STATUS_LABEL[vision.status]}</span>}
      </div>
      <h3>{vision.title}</h3>
      {vision.description && <p className="desc">{vision.description}</p>}
      {vision.scripture && <blockquote>{vision.scripture}</blockquote>}

      <div className="progress" aria-label={`${pct}% complete`}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="card-foot">
        <span>
          {vision.stepsTotal === 0 ? 'No steps yet' : `${vision.stepsDone} of ${vision.stepsTotal} steps`}
        </span>
        {due ? <span className={`chip ${due.tone}`}>{due.text}</span> : null}
        {!community && (
          <span className="muted" title={vision.visibility === 'church' ? 'Shared with the church' : 'Only you can see this'}>
            {vision.visibility === 'church' ? '⛪ Shared' : '🔒 Private'}
          </span>
        )}
        {community && <span className="muted">{mine ? 'You' : vision.ownerName}</span>}
      </div>
    </>
  );

  const cls = `card cat-${vision.category}`;
  return community && !mine ? (
    <article className={cls}>{body}</article>
  ) : (
    <Link to={`/vision/${vision.id}`} className={cls}>
      {body}
    </Link>
  );
}
