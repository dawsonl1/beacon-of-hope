// [SECURITY-10] Privacy — GDPR cookie consent: Fully functional cookie consent banner.
// Users can Accept All, Reject Non-Essential, or Manage Preferences (category-level toggles).
// When analytics cookies are revoked, Google Analytics cookies are actively deleted.
// This is NOT cosmetic — it controls actual cookie behavior. See CookieConsentContext.tsx.
import { useCookieConsent } from '../contexts/CookieConsentContext';
import styles from './CookieConsent.module.css';

export default function CookieConsent() {
  const { showBanner, updateConsent, openPreferencesModal } = useCookieConsent();

  if (!showBanner) return null;

  function acceptAll() {
    updateConsent({ analytics: true, functional: true });
  }

  function rejectNonEssential() {
    updateConsent({ analytics: false, functional: false });
  }

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie consent">
      <div className={styles.inner}>
        <p className={styles.text}>
          We use cookies to improve your experience and analyze site usage.
          See our{' '}
          <a href="/privacy-policy" className={styles.link}>
            Privacy Policy
          </a>{' '}
          for details.
        </p>
        <div className={styles.buttons}>
          <button onClick={rejectNonEssential} className={styles.declineBtn}>
            Reject Non-Essential
          </button>
          <button onClick={openPreferencesModal} className={styles.manageBtn}>
            Manage Preferences
          </button>
          <button onClick={acceptAll} className={styles.acceptBtn}>
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
