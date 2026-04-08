import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // If loading but we have a cached user, render children immediately
  // (the background auth check will correct if session expired)
  if (isLoading && !user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-slate)',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && user) {
    const hasRole = user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
