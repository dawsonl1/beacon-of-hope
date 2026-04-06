import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <a href="#mission" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Our Mission
          </a>
          <a href="#impact" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Impact
          </a>
          <a href="#involved" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Get Involved
          </a>
        </nav>

        <div className={styles.actions}>
          <Link to="/login" className={styles.loginBtn}>
            <User size={16} />
            <span>Login</span>
          </Link>
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
