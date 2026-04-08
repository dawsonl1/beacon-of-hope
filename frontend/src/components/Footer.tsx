import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { openPreferencesModal } = useCookieConsent();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.logoIcon}>&#9670;</span>
            <span className={styles.logoText}>Beacon of Hope</span>
            <p className={styles.tagline}>
              Restoring hope and rebuilding lives for survivors of abuse
              and trafficking in Guam.
            </p>
          </div>

          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Organization</h4>
              <Link to="/#mission">Our Mission</Link>
              <Link to="/#impact">Our Impact</Link>
              <Link to="/#involved">Get Involved</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Legal</h4>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <button className={styles.cookieBtn} onClick={openPreferencesModal}>
                Cookie Settings
              </button>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Connect</h4>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <Link to="/newsletter">Monthly Newsletter</Link>
              <p className={styles.dataNote}>*Data as of February 15, 2026</p>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copy}>
            &copy; {new Date().getFullYear()} Beacon of Hope. All rights reserved.
          </p>
          <p className={styles.madeWith}>
            Made with <Heart size={12} className={styles.heart} /> for those who need it most
          </p>
        </div>
      </div>
    </footer>
  );
}
