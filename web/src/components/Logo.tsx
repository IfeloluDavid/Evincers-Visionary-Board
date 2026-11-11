/**
 * The Evincers mark: a figure rising with arms lifted (gold head, navy leaf and crescent, gold stem).
 * Colours come from CSS variables so it works on light, dark and navy backgrounds.
 * To use the official artwork instead, replace the paths below with the paths from your logo SVG.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * (480 / 460)} viewBox="36 36 460 480" aria-hidden className="logo-mark">
      <circle cx="170" cy="201" r="47" fill="var(--logo-gold)" />
      <path d="M44 243C104 252 168 288 198 338L204 402C150 362 80 302 44 243Z" fill="var(--logo-navy)" />
      <path
        d="M479 137C384 150 292 202 238 290C206 344 206 432 289 502C250 424 254 342 301 272C346 206 402 166 479 137Z"
        fill="var(--logo-navy)"
      />
      <path d="M410 44C346 68 288 118 266 196C300 164 360 112 410 44Z" fill="var(--logo-gold)" />
      <path d="M268 190C250 240 225 285 192 340" stroke="var(--logo-gold)" strokeWidth="7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={`logo ${onDark ? 'on-dark' : ''}`}>
      <LogoMark size={34} />
      <span className="logo-text">
        <span className="logo-word">Evincers</span>
        <svg viewBox="0 0 120 8" className="logo-swoosh" aria-hidden preserveAspectRatio="none">
          <path d="M1 6.5C30 2 80 1 119 2" stroke="var(--logo-gold)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
        <span className="logo-sub">Vision Board</span>
      </span>
    </span>
  );
}
