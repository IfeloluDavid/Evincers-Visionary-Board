import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import * as auth from '../auth';
import { useAuth } from '../AuthContext';
import { config } from '../config';

type Mode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  signin: 'Welcome back',
  signup: 'Create your account',
  confirm: 'Check your email',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
};

export default function AuthPage() {
  const { session, setSession } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (session) return <Navigate to="/" replace />;

  const go = (m: Mode) => {
    setMode(m);
    setError('');
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      switch (mode) {
        case 'signin':
          try {
            setSession(await auth.signIn(email, password));
          } catch (err) {
            if ((err as auth.AuthError).code === 'UserNotConfirmedException') {
              await auth.resendCode(email);
              setInfo('Your email is not confirmed yet. We sent you a new code.');
              go('confirm');
              return;
            }
            throw err;
          }
          break;
        case 'signup':
          await auth.signUp(email, password, name);
          setInfo(`We sent a verification code to ${email}.`);
          go('confirm');
          break;
        case 'confirm':
          await auth.confirmSignUp(email, code);
          setSession(await auth.signIn(email, password));
          break;
        case 'forgot':
          await auth.forgotPassword(email);
          setInfo(`If ${email} has an account, a reset code is on its way.`);
          go('reset');
          break;
        case 'reset':
          await auth.confirmNewPassword(email, code, password);
          setInfo('Password updated. Please sign in.');
          setPassword('');
          go('signin');
          break;
      }
    });
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero" aria-hidden>
        <div className="brand big"><span className="brand-mark">★</span> Evincers <b>Vision Board</b></div>
        <p className="lead">Write the vision. Make it plain. Take the next step.</p>
        <ul>
          <li>🕊️ Capture what God has put on your heart</li>
          <li>✅ Break each vision into actionable steps</li>
          <li>📈 Watch your progress grow, season by season</li>
          <li>⛪ Share with — and be inspired by — the church</li>
        </ul>
      </section>

      <form className="auth-card stack" onSubmit={submit}>
        <h1>{TITLES[mode]}</h1>
        {config().devMode && <p className="notice">Local dev mode — any email and password will work.</p>}
        {info && <p className="notice" role="status">{info}</p>}

        {mode === 'signup' && (
          <label>
            Your name
            <input required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        <label>
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={mode === 'confirm' || mode === 'reset'}
          />
        </label>

        {(mode === 'signin' || mode === 'signup' || mode === 'reset' || mode === 'confirm') && mode !== 'confirm' && (
          <label>
            {mode === 'reset' ? 'New password' : 'Password'}
            <input
              required
              type="password"
              minLength={mode === 'signin' ? undefined : 10}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode !== 'signin' && <small className="muted">At least 10 characters, with upper and lower case letters and a number.</small>}
          </label>
        )}

        {(mode === 'confirm' || mode === 'reset') && (
          <label>
            Verification code
            <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
        )}

        {mode === 'confirm' && (
          <label>
            Password <span className="muted">(to sign you in after confirming)</span>
            <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'One moment…' : { signin: 'Sign in', signup: 'Create account', confirm: 'Confirm & continue', forgot: 'Send reset code', reset: 'Update password' }[mode]}
        </button>

        <div className="auth-links">
          {mode === 'signin' && (
            <>
              <button type="button" className="link" onClick={() => go('signup')}>New here? Create an account</button>
              <button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button>
            </>
          )}
          {mode === 'confirm' && (
            <button type="button" className="link" onClick={() => void run(async () => { await auth.resendCode(email); setInfo('A new code is on its way.'); })}>
              Resend code
            </button>
          )}
          {mode !== 'signin' && (
            <button type="button" className="link" onClick={() => go('signin')}>Back to sign in</button>
          )}
        </div>
      </form>
    </div>
  );
}
