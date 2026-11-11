import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Award, Check, Sparkles, TrendingUp } from 'lucide-react';

type Kind = 'info' | 'xp' | 'level' | 'badge';
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}

const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(Ctx);

const ICON = { info: Check, xp: TrendingUp, level: Sparkles, badge: Award } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = next.current++;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.kind === 'info' || t.kind === 'xp' ? 3000 : 5500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div key={t.id} className={`toast ${t.kind}`}>
              <Icon size={20} aria-hidden />
              <div>
                <strong>{t.title}</strong>
                {t.body && <span>{t.body}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
