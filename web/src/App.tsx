import { Flame, Heart, LayoutGrid, Mail, Route as RouteIcon, Users } from 'lucide-react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Logo } from './components/Logo';
import { JourneyProvider, useJourney } from './JourneyContext';
import AuthPage from './pages/AuthPage';
import Board from './pages/Board';
import Community from './pages/Community';
import Gratitude from './pages/Gratitude';
import Journey from './pages/Journey';
import Postcard from './pages/Postcard';
import Settings from './pages/Settings';
import VisionPage from './pages/VisionPage';
import { ToastProvider } from './Toast';

const NAV = [
  { to: '/', label: 'My board', icon: LayoutGrid, end: true },
  { to: '/journey', label: 'Journey', icon: RouteIcon },
  { to: '/gratitude', label: 'Gratitude', icon: Heart },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/postcard', label: 'Postcard', icon: Mail },
] as const;

function Frame() {
  const { session, signOut } = useAuth();
  const { journey } = useJourney();
  const initial = (session?.name ?? '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="topbar no-print">
        <NavLink to="/" className="brand" aria-label="Evincers Vision Board home">
          <Logo />
        </NavLink>
        <nav className="main-nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={'end' in item}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          {journey && journey.streakWeeks > 0 && (
            <span className="streak" title={`${journey.streakWeeks}-week streak`}>
              <Flame size={16} aria-hidden /> {journey.streakWeeks}
            </span>
          )}
          <NavLink to="/settings" className="avatar" title="Settings" aria-label="Settings">
            {initial}
          </NavLink>
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="foot no-print">
        <span className="script">Dream it. Plan it. Live it.</span>
        <span className="muted">“Write the vision and make it plain…” — Habakkuk 2:2</span>
      </footer>

      <nav className="tabbar no-print" aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item}>
            <item.icon size={22} aria-hidden />
            <span>{item.label.replace('My ', '')}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function Shell() {
  const { session, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <JourneyProvider>
      <Frame />
    </JourneyProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route element={<Shell />}>
              <Route index element={<Board />} />
              <Route path="vision/:id" element={<VisionPage />} />
              <Route path="journey" element={<Journey />} />
              <Route path="gratitude" element={<Gratitude />} />
              <Route path="community" element={<Community />} />
              <Route path="postcard" element={<Postcard />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
