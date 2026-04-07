import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>&#9670;</span>
          <span className={styles.logoText}>Beacon of Hope</span>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link to="/" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <a href="/#mission" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Our Mission
          </a>
          <Link to="/impact" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Impact
          </Link>
          <a href="/#involved" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Get Involved
          </a>
        </nav>

        <div className={styles.actions}>
          {isAuthenticated && user ? (
            <>
              <Link to={user.roles?.includes('Admin') || user.roles?.includes('Staff') ? '/admin' : '/donor'} className={styles.loginBtn}>
                <User size={16} />
                <span>{user.roles?.includes('Admin') || user.roles?.includes('Staff') ? 'Admin Dashboard' : user.firstName}</span>
              </Link>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className={styles.loginBtn}>
              <User size={16} />
              <span>Login</span>
            </Link>
          )}
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
  );
}
