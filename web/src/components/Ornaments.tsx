/** Decorative leaf sprig, echoing the postcard corners. */
export function Sprig({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  const leaf = 'M0 0C8 -13 26 -15 38 0C26 15 8 13 0 0Z';
  const leaves: [number, number, number, string][] = [
    [62, 150, -150, 'var(--orn-navy)'],
    [66, 120, -28, 'var(--orn-gold)'],
    [54, 92, -155, 'var(--orn-navy)'],
    [62, 64, -25, 'var(--orn-navy)'],
    [50, 38, -150, 'var(--orn-gold)'],
    [56, 12, -45, 'var(--orn-navy)'],
  ];
  return (
    <svg viewBox="0 0 120 190" className={className} aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M58 185C52 130 58 60 74 6" stroke="var(--orn-gold)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r, fill], i) => (
        <path key={i} d={leaf} transform={`translate(${x} ${y}) rotate(${r})`} fill={fill} opacity={0.95} />
      ))}
    </svg>
  );
}

/** Navy wave with a gold ribbon, used in the corners of the printable postcards and the sign-in hero. */
export function Swoosh({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 190" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M300 0V158C262 86 170 24 60 0Z" fill="var(--orn-navy)" />
      <path d="M300 56C254 22 190 4 118 0" stroke="var(--orn-gold)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M300 82C262 46 200 20 148 12" stroke="var(--orn-gold)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
