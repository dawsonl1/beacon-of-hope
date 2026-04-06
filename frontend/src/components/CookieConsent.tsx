import { useState, useEffect } from 'react';
import styles from './CookieConsent.module.css';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie consent">
      <div className={styles.inner}>
        <p className={styles.text}>
          We use cookies to improve your experience and analyze site usage.
          See our{' '}
          <a href="/privacy" className={styles.link}>
            Privacy Policy
          </a>{' '}
          for details.
        </p>
        <div className={styles.buttons}>
          <button onClick={decline} className={styles.declineBtn}>
            Decline
          </button>
          <button onClick={accept} className={styles.acceptBtn}>
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
