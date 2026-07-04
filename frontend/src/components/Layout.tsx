import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GridIcon, UploadIcon, SearchIcon, UsersIcon, LogoutIcon } from './Icons';
import './Layout.css';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const initial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          <div>
            <div className="brand-name">OrderOps</div>
            <div className="brand-sub">Management Console</div>
          </div>
        </div>

        <nav className="nav">
          <span className="nav-label">Workspace</span>
          <NavLink to="/" end className="nav-link"><GridIcon /> Dashboard</NavLink>
          <NavLink to="/upload" className="nav-link"><UploadIcon /> Upload Orders</NavLink>
          <span className="nav-label">Lookup</span>
          <NavLink to="/orders" className="nav-link"><SearchIcon /> Orders</NavLink>
          <NavLink to="/customers" className="nav-link"><UsersIcon /> Customer Orders</NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="avatar">{initial}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="user-email">{user?.email}</div>
              <div className="faint text-sm">Signed in</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={handleSignOut}>
            <LogoutIcon width={17} height={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
