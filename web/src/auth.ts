import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from './config';

export interface Session {
  idToken: string;
  email: string;
  name: string;
}

/** Cognito errors carry a machine-readable `code`; keep it so the UI can branch on it. */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

const wrap = (err: unknown): AuthError => {
  const e = err as { code?: string; name?: string; message?: string };
  return new AuthError(e.message ?? 'Something went wrong', e.code ?? e.name ?? 'Unknown');
};

let pool: CognitoUserPool | null = null;
const getPool = () =>
  (pool ??= new CognitoUserPool({ UserPoolId: config().userPoolId, ClientId: config().userPoolClientId }));
const userFor = (email: string) => new CognitoUser({ Username: email.trim().toLowerCase(), Pool: getPool() });

function toSession(s: CognitoUserSession): Session {
  const p = s.getIdToken().payload as { email?: string; name?: string };
  return { idToken: s.getIdToken().getJwtToken(), email: p.email ?? '', name: p.name ?? p.email?.split('@')[0] ?? 'Friend' };
}

// ---------------------------------------------------------- dev mode (no AWS)

const DEV_KEY = 'vb-dev-session';
const devToken = (email: string, name: string) =>
  'dev.' + btoa(encodeURIComponent(JSON.stringify({ sub: 'dev-' + email.toLowerCase(), email, name })));

function readDev(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(DEV_KEY) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ public API

export async function signUp(email: string, password: string, name: string): Promise<void> {
  if (config().devMode) {
    localStorage.setItem(DEV_KEY + ':pending', JSON.stringify({ email, name }));
    return;
  }
  await new Promise<void>((resolve, reject) => {
    getPool().signUp(
      email.trim().toLowerCase(),
      password,
      [new CognitoUserAttribute({ Name: 'name', Value: name.trim() })],
      [],
      (err) => (err ? reject(wrap(err)) : resolve()),
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  if (config().devMode) return;
  await new Promise<void>((resolve, reject) => {
    userFor(email).confirmRegistration(code.trim(), true, (err) => (err ? reject(wrap(err)) : resolve()));
  });
}

export async function resendCode(email: string): Promise<void> {
  if (config().devMode) return;
  await new Promise<void>((resolve, reject) => {
    userFor(email).resendConfirmationCode((err) => (err ? reject(wrap(err)) : resolve()));
  });
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (config().devMode) {
    const pending = JSON.parse(localStorage.getItem(DEV_KEY + ':pending') ?? 'null') as { name?: string } | null;
    const name = pending?.name ?? email.split('@')[0] ?? 'Friend';
    const s: Session = { idToken: devToken(email, name), email, name };
    localStorage.setItem(DEV_KEY, JSON.stringify(s));
    return s;
  }
  return new Promise((resolve, reject) => {
    userFor(email).authenticateUser(
      new AuthenticationDetails({ Username: email.trim().toLowerCase(), Password: password }),
      {
        onSuccess: (s) => resolve(toSession(s)),
        onFailure: (err) => reject(wrap(err)),
        newPasswordRequired: () =>
          reject(new AuthError('Your account needs a new password. Use "Forgot password" to set one.', 'NewPasswordRequired')),
      },
    );
  });
}

/** Restores (and silently refreshes) the stored session, if any. */
export async function currentSession(): Promise<Session | null> {
  if (config().devMode) return readDev();
  const user = getPool().getCurrentUser();
  if (!user) return null;
  return new Promise((resolve) => {
    user.getSession((err: Error | null, s: CognitoUserSession | null) => resolve(err || !s?.isValid() ? null : toSession(s)));
  });
}

/** A fresh ID token for API calls (the SDK refreshes it when it is about to expire). */
export async function getIdToken(): Promise<string | null> {
  return (await currentSession())?.idToken ?? null;
}

export function signOut(): void {
  if (config().devMode) {
    localStorage.removeItem(DEV_KEY);
    return;
  }
  getPool().getCurrentUser()?.signOut();
}

export async function forgotPassword(email: string): Promise<void> {
  if (config().devMode) return;
  await new Promise<void>((resolve, reject) => {
    userFor(email).forgotPassword({ onSuccess: () => resolve(), onFailure: (e) => reject(wrap(e)) });
  });
}

export async function confirmNewPassword(email: string, code: string, password: string): Promise<void> {
  if (config().devMode) return;
  await new Promise<void>((resolve, reject) => {
    userFor(email).confirmPassword(code.trim(), password, { onSuccess: () => resolve(), onFailure: (e) => reject(wrap(e)) });
  });
}
