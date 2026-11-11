import { Footprints, HandHeart, Mountain, Target, type LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { Sprig, Swoosh } from './Ornaments';

export interface PostcardContent {
  grateful: string[];
  immediate: string[];
  long: string[];
  steps: string[];
  /** e.g. "By November 2027…" */
  longHint: string;
}

const LINES = 3;

function Section({ icon: Icon, title, hint, lines }: { icon: LucideIcon; title: string; hint: string; lines: string[] }) {
  const shown = lines.slice(0, LINES);
  return (
    <section className="pc-sec">
      <div className="pc-band">
        <span className="pc-disc"><Icon aria-hidden /></span>
        <div>
          <h3>{title}</h3>
          <em>({hint})</em>
        </div>
      </div>
      <div className="pc-lines">
        {Array.from({ length: LINES }, (_, i) => (
          <div key={i} className="pc-line"><span>{shown[i] ?? ''}</span></div>
        ))}
      </div>
    </section>
  );
}

/**
 * A 3:2 card that scales with its container (all sizes are in container-width units), so the on-screen preview
 * and the printed page look identical. Two variants mirror the printed cards: the Visionary Postcard and the
 * Write-Up.
 */
export default function PostcardView({
  variant,
  name,
  content,
}: {
  variant: 'postcard' | 'writeup';
  name: string;
  content: PostcardContent;
}) {
  return (
    <div className="pc-frame">
      <article className={`postcard ${variant}`} aria-label={variant === 'postcard' ? 'My Visionary Postcard' : 'The Write-Up'}>
        <Swoosh className="pc-swoosh tr" />
        <Swoosh className="pc-swoosh bl" />
        {variant === 'writeup' && <Sprig className="pc-sprig tl" />}
        {variant === 'writeup' && <Sprig className="pc-sprig br" flip />}

        <header className="pc-head">
          <div className="pc-logo"><Logo /></div>
          {variant === 'postcard' ? (
            <div className="pc-title">
              <h2>My <span>Visionary</span> Postcard</h2>
              <p className="pc-quote">“Write the vision and make it plain…”</p>
              <p className="pc-ref">HABAKKUK 2:2</p>
            </div>
          ) : (
            <div className="pc-title">
              <h2>The Write-Up</h2>
              <p className="pc-tag">WHAT I WROTE. WHAT I LIVED. WHAT COMES NEXT.</p>
            </div>
          )}
        </header>

        {variant === 'writeup' && (
          <div className="pc-name"><span>My Name:</span><b>{name}</b></div>
        )}

        <div className="pc-grid">
          <Section icon={HandHeart} title="What I’m Grateful For" hint="This past year…" lines={content.grateful} />
          <Section icon={Target} title="My Immediate Goal" hint="In the next few weeks / months…" lines={content.immediate} />
          <Section icon={Mountain} title="My Long-Term Goal" hint={content.longHint} lines={content.long} />
          <Section icon={Footprints} title="The Steps I’m Taking" hint="To get there…" lines={content.steps} />
        </div>

        {variant === 'postcard' && <footer className="pc-foot"><span>Dream it. Plan it. Live it.</span></footer>}
        {variant === 'writeup' && <footer className="pc-foot small"><i>“Write the vision and make it plain…”</i> <b>HABAKKUK 2:2</b></footer>}
      </article>
    </div>
  );
}
