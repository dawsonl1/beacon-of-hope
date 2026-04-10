// [SECURITY-9] Privacy — Privacy policy link: Footer links to /privacy-policy on every page.
// [SECURITY-10] Privacy — Cookie consent: "Cookie Settings" button reopens the consent modal.
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { APP_TODAY } from '../constants';
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
              <h3 className={styles.linkGroupTitle}>Organization</h3>
              <Link to="/#mission">Our Mission</Link>
              <Link to="/#impact">Our Impact</Link>
              <Link to="/#involved">Get Involved</Link>
            </div>
            <div className={styles.linkGroup}>
              <h3 className={styles.linkGroupTitle}>Legal</h3>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <button className={styles.cookieBtn} onClick={openPreferencesModal}>
                Cookie Settings
              </button>
            </div>
            <div className={styles.linkGroup}>
              <h3 className={styles.linkGroupTitle}>Connect</h3>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <Link to="/newsletter">Monthly Newsletter</Link>
              <p className={styles.dataNote}>*Data as of February 16, 2026</p>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copy}>
            &copy; {new Date(APP_TODAY).getFullYear()} Beacon of Hope. All rights reserved.
          </p>
          <p className={styles.madeWith}>
            Made with <Heart size={12} className={styles.heart} /> for those who need it most
          </p>
        </div>
      </div>
    </footer>
  );
}
