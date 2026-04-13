import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackRouteChange } from './visitBeacon';

// Component-level wrapper that fires a visit beacon on every React Router
// navigation. Mount once inside <BrowserRouter>.
export default function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    trackRouteChange(location.pathname);
  }, [location.pathname]);

  return null;
}
