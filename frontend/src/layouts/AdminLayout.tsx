import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AudioLines,
  Eye,
  HandHeart,
  BarChart3,
  Settings,
  LogOut,
  UserCircle,
} from 'lucide-react';
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
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <a href="/" className={styles.navItem}>
            <LogOut size={18} />
            <span>Logout</span>
          </a>
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>
            <UserCircle size={56} strokeWidth={1} />
          </div>
          <p className={styles.userName}>Joe Hernando</p>
          <p className={styles.userRole}>Admin</p>
          <button className={styles.editProfileBtn}>Edit Profile</button>
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
