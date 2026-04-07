import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AudioLines,
  Eye,
  HandHeart,
  BarChart3,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminLayout.module.css';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard', end: true },
  { to: '/admin/caseload', icon: Users, label: 'Residents & Caseload' },
  { to: '/admin/recordings', icon: AudioLines, label: 'Process Recordings' },
  { to: '/admin/visitations', icon: Eye, label: 'Home Visitations' },
  { to: '/admin/donors', icon: HandHeart, label: 'Donors & Contributions' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : 'User';
  const displayRole = user?.roles?.[0] ?? 'Staff';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <NavLink to="/" className={styles.logo}>
            <span className={styles.logoIcon}>&#9670;</span>
            <span className={styles.logoText}>Beacon of Hope</span>
          </NavLink>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className={styles.navDivider} />
          <button onClick={handleLogout} className={styles.navItem} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>
            <UserCircle size={56} strokeWidth={1} />
          </div>
          <p className={styles.userName}>{displayName}</p>
          <p className={styles.userRole}>{displayRole}</p>
          <button className={styles.editProfileBtn} onClick={() => navigate('/admin')}>Dashboard</button>
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
