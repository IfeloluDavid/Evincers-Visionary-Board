import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as auth from './auth';
import type { Session } from './auth';

interface AuthState {
  session: Session | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth
      .currentSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    auth.signOut();
    setSession(null);
  };

  return <Ctx.Provider value={{ session, loading, setSession, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
