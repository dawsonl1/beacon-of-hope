import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, UserPlus, LogOut, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Header.module.css';

const SUBSCRIBED_KEY = 'newsletter_subscribed';
const DISMISSED_KEY = 'newsletter_dismissed';
const DISMISS_DAYS = 7;

function shouldShowNewsletter(): boolean {
  try {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return false;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return false;
    }
    return true;
  } catch {
    return true;
  }
}

function NewsletterBar({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    try { localStorage.setItem(SUBSCRIBED_KEY, '1'); } catch { /* noop */ }
    setTimeout(onHide, 2500);
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
    onHide();
  }

  if (!visible) return null;

  if (submitted) {
    return (
      <div className={styles.newsletterBar}>
        <div className={styles.newsletterInner}>
          <span className={styles.newsletterThanks}>Thanks for subscribing!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.newsletterBar}>
      <div className={styles.newsletterInner}>
        <div className={styles.newsletterLabel}>
          <Mail size={14} />
          <span>Get monthly impact updates</span>
        </div>
        <form className={styles.newsletterForm} onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.newsletterInput}
          />
          <button type="submit" className={styles.newsletterBtn} aria-label="Subscribe">
            <ArrowRight size={14} />
          </button>
        </form>
        <button
          className={styles.newsletterDismiss}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(shouldShowNewsletter);
  const { isAuthenticated, user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <>
    <NewsletterBar visible={showNewsletter} onHide={() => setShowNewsletter(false)} />
    <header className={`${styles.header} ${showNewsletter ? styles.headerWithBar : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>&#9670;</span>
          <span className={styles.logoText}>Beacon of Hope</span>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link to="/" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/#mission" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Our Mission
          </Link>
          <Link to="/impact" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Impact
          </Link>
          <Link to="/#involved" className={styles.navLink} onClick={() => setMenuOpen(false)}>
            Get Involved
          </Link>
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
            <>
              <Link to="/donate" className={styles.signupBtn}>
                <UserPlus size={16} />
                <span>Donate</span>
              </Link>
              <Link to="/login" className={styles.loginBtn}>
                <User size={16} />
                <span>Login</span>
              </Link>
            </>
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
    </>
  );
}
