export default function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const stroke = Math.max(6, size / 9);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${value}% complete`}
      className="ring"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="ring-bar"
      />
      {size >= 48 && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="ring-text" fontSize={size / 3.6}>
          {value}%
        </text>
      )}
    </svg>
  );
}
