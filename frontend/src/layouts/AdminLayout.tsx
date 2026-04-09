import { useState, useRef, useEffect, Suspense, Component } from 'react';
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
  AlertTriangle,
  Inbox,
  MessageSquare,
  HomeIcon,
  ChevronDown,
  Check,
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

const homeLink: NavItem = { to: '/admin', icon: LayoutDashboard, label: 'Home', end: true };

const navGroups: NavGroup[] = [
  {
    label: 'Cases',
    items: [
      { to: '/admin/caseload', icon: Users, label: 'Caseload' },
      { to: '/admin/queue', icon: Inbox, label: 'Queue' },
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
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
      { to: '/admin/donors', icon: HandHeart, label: 'Donors' },
      { to: '/admin/users', icon: Shield, label: 'Users' },
    ],
  },
];


function SafehouseDropdown({
  safehouses,
  activeSafehouseId,
  setActiveSafehouseId,
  isAdmin,
}: {
  safehouses: { safehouseId: number; safehouseCode: string; name: string }[];
  activeSafehouseId: number | null;
  setActiveSafehouseId: (id: number | null) => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeLabel = activeSafehouseId
    ? safehouses.find(s => s.safehouseId === activeSafehouseId)
      ? `${safehouses.find(s => s.safehouseId === activeSafehouseId)!.safehouseCode} - ${safehouses.find(s => s.safehouseId === activeSafehouseId)!.name}`
      : 'All Safehouses'
    : 'All Safehouses';

  return (
    <div className={styles.shDropdown} ref={ref}>
      <button
        className={`${styles.shDropdownBtn} ${open ? styles.shDropdownBtnOpen : ''}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className={styles.shDropdownLabel}>{activeLabel}</span>
        <ChevronDown size={14} className={`${styles.shDropdownChevron} ${open ? styles.shDropdownChevronOpen : ''}`} />
      </button>
      {open && (
        <div className={styles.shDropdownMenu}>
          {isAdmin && (
            <button
              className={`${styles.shDropdownItem} ${activeSafehouseId === null ? styles.shDropdownItemActive : ''}`}
              onClick={() => { setActiveSafehouseId(null); setOpen(false); }}
              type="button"
            >
              <span>All Safehouses</span>
              {activeSafehouseId === null && <Check size={14} />}
            </button>
          )}
          {safehouses.map(s => (
            <button
              key={s.safehouseId}
              className={`${styles.shDropdownItem} ${activeSafehouseId === s.safehouseId ? styles.shDropdownItemActive : ''}`}
              onClick={() => { setActiveSafehouseId(s.safehouseId); setOpen(false); }}
              type="button"
            >
              <span>{s.safehouseCode} - {s.name}</span>
              {activeSafehouseId === s.safehouseId && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

          {/* Desktop nav: Home link + category hover dropdowns */}
          <nav className={styles.nav}>
            <NavLink
              to={homeLink.to}
              end={homeLink.end}
              className={({ isActive }) =>
                `${styles.homeLink} ${isActive ? styles.homeLinkActive : ''}`
              }
            >
              <homeLink.icon size={15} />
              <span>{homeLink.label}</span>
            </NavLink>
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
              <SafehouseDropdown
                safehouses={safehouses}
                activeSafehouseId={activeSafehouseId}
                setActiveSafehouseId={setActiveSafehouseId}
                isAdmin={isAdmin}
              />
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
        <NavLink
          to={homeLink.to}
          end={homeLink.end}
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
          onClick={() => setMenuOpen(false)}
        >
          <homeLink.icon size={16} />
          <span>{homeLink.label}</span>
        </NavLink>
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
