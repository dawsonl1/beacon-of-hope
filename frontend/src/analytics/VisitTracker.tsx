import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackRouteChange } from './visitBeacon';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { deleteCookie } from '../utils/cookies';

// Component-level wrapper that fires a visit beacon on every React Router
// navigation. Mount once inside <BrowserRouter>.
//
// Gated behind the "analytics" cookie-consent category because the beacon
// collects a browser fingerprint + a first-party visitor UUID cookie, which
// qualifies as analytics tracking under GDPR/ePrivacy. Necessary-only users
// are invisible to the report.
export default function VisitTracker() {
  const location = useLocation();
  const { categories } = useCookieConsent();

  useEffect(() => {
    if (!categories.analytics) {
      // If analytics was just revoked, also drop our visitor-ID cookie.
      deleteCookie('boh_visitor_id');
      return;
    }
    trackRouteChange(location.pathname);
  }, [location.pathname, categories.analytics]);

  return null;
}
