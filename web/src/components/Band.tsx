import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Section heading in the style of the printed postcard: a navy icon disc on a warm pill. */
export default function Band({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="band">
      <span className="band-icon">
        <Icon size={22} aria-hidden />
      </span>
      <div className="band-text">
        <h2>{title}</h2>
        {hint && <em>{hint}</em>}
      </div>
      {children && <div className="band-extra">{children}</div>}
    </div>
  );
}
