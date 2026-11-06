import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './pages/AuthPage';
import Board from './pages/Board';
import Community from './pages/Community';
import VisionPage from './pages/VisionPage';

function Shell() {
  const { session, loading, signOut } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Evincers Vision Board home">
          <span className="brand-mark" aria-hidden>★</span>
          <span>Evincers <b>Vision Board</b></span>
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>My board</NavLink>
          <NavLink to="/community">Community</NavLink>
        </nav>
        <div className="who">
          <span className="muted hide-sm">{session.name}</span>
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="foot muted">
        “Write the vision and make it plain on tablets, that he may run who reads it.” — Habakkuk 2:2
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<Shell />}>
            <Route index element={<Board />} />
            <Route path="vision/:id" element={<VisionPage />} />
            <Route path="community" element={<Community />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
