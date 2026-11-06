import { useEffect, useState } from 'react';
import { api } from '../api';
import VisionCard from '../components/VisionCard';
import type { PublicVision } from '../types';

export default function Community() {
  const [visions, setVisions] = useState<PublicVision[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.community().then(setVisions).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Church community</h1>
          <p className="muted">Visions members have chosen to share. Be encouraged, and pray for one another.</p>
        </div>
      </section>

      {error && <p className="error banner" role="alert">{error}</p>}

      {visions === null && !error ? (
        <p className="muted">Loading…</p>
      ) : visions?.length === 0 ? (
        <section className="empty">
          <div className="empty-icon" aria-hidden>⛪</div>
          <h2>Nothing shared yet</h2>
          <p>When members share a vision with the church, it appears here. Open one of yours and tick “Share with the church community” to be the first.</p>
        </section>
      ) : (
        <div className="masonry">
          {visions?.map((v) => (
            <VisionCard key={v.id} vision={v} community />
          ))}
        </div>
      )}
    </>
  );
}
