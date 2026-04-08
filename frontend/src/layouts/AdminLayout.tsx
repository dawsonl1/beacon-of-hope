import { useState, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AudioLines,
  Eye,
  HandHeart,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Inbox,
  MessageSquare,
  HomeIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SafehouseProvider, useSafehouse } from '../contexts/SafehouseContext';
import styles from './AdminLayout.module.css';

class PageErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin page error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'var(--font-body)', gap: '1rem' }}>
          <p style={{ color: 'var(--color-slate)', fontSize: '1.1rem' }}>This page failed to load.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/tasks', icon: CheckSquare, label: 'To-Do' },
      { to: '/admin/calendar', icon: Calendar, label: 'Calendar' },
      { to: '/admin/queue', icon: Inbox, label: 'Queue' },
    ],
  },
  {
    label: 'Cases',
    items: [
      { to: '/admin/caseload', icon: Users, label: 'Caseload' },
      { to: '/admin/incidents', icon: AlertTriangle, label: 'Incidents' },
      { to: '/admin/conferences', icon: MessageSquare, label: 'Conferences' },
      { to: '/admin/post-placement', icon: HomeIcon, label: 'Placed' },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/admin/recordings', icon: AudioLines, label: 'Recordings' },
      { to: '/admin/visitations', icon: Eye, label: 'Visitations' },
      { to: '/admin/donors', icon: HandHeart, label: 'Donors' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
      { to: '/admin/users', icon: Shield, label: 'Users' },
    ],
  },
];


function AdminLayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { safehouses, activeSafehouseId, setActiveSafehouseId, isAdmin } = useSafehouse();

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

          {/* Desktop nav: category hover dropdowns */}
          <nav className={styles.nav}>
            {navGroups.map(group => {
              const groupActive = group.items.some(item =>
                item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
              );
              return (
                <div key={group.label} className={styles.navGroup}>
                  <span className={`${styles.navGroupLabel} ${groupActive ? styles.navGroupLabelActive : ''}`}>
                    {group.label}
                  </span>
                  <div className={styles.navDropdown}>
                    {group.items.map(({ to, icon: Icon, label, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`
                        }
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className={styles.actions}>
            {safehouses.length > 0 && (
              <select
                className={styles.safehouseSelect}
                value={activeSafehouseId ?? ''}
                onChange={e => setActiveSafehouseId(e.target.value ? Number(e.target.value) : null)}
              >
                {isAdmin && <option value="">All Safehouses</option>}
                {safehouses.map(s => (
                  <option key={s.safehouseId} value={s.safehouseId}>
                    {s.safehouseCode} - {s.name}
                  </option>
                ))}
              </select>
            )}
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

      {/* Mobile nav: grouped sections — placed outside header to avoid backdrop-filter containment */}
      <nav className={`${styles.mobileNav} ${menuOpen ? styles.navOpen : ''}`}>
        {navGroups.map(group => (
          <div key={group.label} className={styles.mobileNavSection}>
            <span className={styles.mobileNavLabel}>{group.label}</span>
            {group.items.map(({ to, icon: Icon, label, end }) => (
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
          </div>
        ))}
      </nav>

      <main className={styles.content}>
        <PageErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Loading...
            </div>
          }>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <SafehouseProvider>
      <AdminLayoutInner />
    </SafehouseProvider>
  );
}
