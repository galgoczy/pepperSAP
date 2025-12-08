import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoading } from '../common/LoadingSpinner';

export default function ProtectedRoute({
  children,
  allowedRoles = null,
  requireAdmin = false,
}) {
  const { isAuthenticated, loading, role, isAdmin, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile doesn't exist yet (database not set up), allow access
  // This is a development convenience - in production, profiles should always exist
  if (!profile) {
    console.warn('User profile not found - allowing access for development');
    return children;
  }

  // Check for admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check for allowed roles
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
