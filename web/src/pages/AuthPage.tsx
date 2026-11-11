import { useState, type FormEvent } from 'react';
import { CheckCircle2, Heart, Route as RouteIcon, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import * as auth from '../auth';
import { useAuth } from '../AuthContext';
import { Logo } from '../components/Logo';
import { Sprig, Swoosh } from '../components/Ornaments';
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
      <section className="auth-hero">
        <Swoosh className="hero-swoosh" />
        <Sprig className="hero-sprig" />
        <div className="hero-inner">
          <Logo onDark />
          <h2 className="hero-script">Dream it. Plan it. <span>Live it.</span></h2>
          <p className="lead">A place for every member of the church to write the vision, make it plain, and take the next step.</p>
          <ul>
            <li><span><Heart size={18} aria-hidden /></span> Record what you are grateful for</li>
            <li><span><CheckCircle2 size={18} aria-hidden /></span> Turn each vision into steps you can act on</li>
            <li><span><RouteIcon size={18} aria-hidden /></span> Climb your journey, level by level</li>
            <li><span><Users size={18} aria-hidden /></span> Be encouraged by the church community</li>
          </ul>
        </div>
      </section>

      <form className="auth-card stack" onSubmit={submit}>
        <h1 className="script-h">{TITLES[mode]}</h1>
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
