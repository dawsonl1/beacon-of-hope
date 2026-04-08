import { useState, Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AudioLines,
  Eye,
  HandHeart,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminLayout.module.css';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/caseload', icon: Users, label: 'Caseload' },
  { to: '/admin/recordings', icon: AudioLines, label: 'Recordings' },
  { to: '/admin/visitations', icon: Eye, label: 'Visitations' },
  { to: '/admin/donors', icon: HandHeart, label: 'Donors' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const displayRole = user?.roles?.[0] ?? 'Staff';

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.logo}>
            <span className={styles.logoIcon}>&#9670;</span>
            <span className={styles.logoText}>Beacon of Hope</span>
          </NavLink>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <span className={styles.roleBadge}>{displayRole}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
            <button
              className={styles.menuToggle}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading...
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
