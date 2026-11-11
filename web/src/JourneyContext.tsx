import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from './api';
import { useToast } from './Toast';
import type { Journey, Me } from './types';

interface State {
  journey: Journey | null;
  me: Me | null;
  /** Re-read progress after something the member did; announces level-ups and new badges. */
  refresh: (opts?: { xp?: number }) => Promise<void>;
  setReminders: (r: Me['reminders']) => void;
}

const Ctx = createContext<State | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const last = useRef<Journey | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.journey().then((j) => {
      last.current = j;
      setJourney(j);
    }).catch(() => {});
  }, []);

  const refresh = useCallback<State['refresh']>(
    async (opts) => {
      try {
        const j = await api.journey();
        const prev = last.current;
        last.current = j;
        setJourney(j);
        if (!prev) return;
        if (j.level.level > prev.level.level) {
          toast({ kind: 'level', title: `Level up! You are now a ${j.level.name}`, body: `${j.xp} XP on your journey` });
        }
        const had = new Set(prev.badges.filter((b) => b.earned).map((b) => b.id));
        const fresh = j.badges.find((b) => b.earned && !had.has(b.id));
        if (fresh) toast({ kind: 'badge', title: `Badge earned: ${fresh.name}`, body: fresh.description });
        else if (opts?.xp && j.level.level === prev.level.level) toast({ kind: 'xp', title: `+${opts.xp} XP`, body: `${j.xp} XP total` });
      } catch {
        /* progress is a nicety; never block the member */
      }
    },
    [toast],
  );

  const setReminders = (reminders: Me['reminders']) => setMe((m) => (m ? { ...m, reminders } : m));

  return <Ctx.Provider value={{ journey, me, refresh, setReminders }}>{children}</Ctx.Provider>;
}

export function useJourney(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useJourney outside JourneyProvider');
  return v;
}
