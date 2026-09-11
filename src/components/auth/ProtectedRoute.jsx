import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageLoading } from '../common/LoadingSpinner';

export default function ProtectedRoute({
  children,
  allowedRoles = null,
  requireAdmin = false,
}) {
  const { isAuthenticated, loading, role, isAdmin, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no profile means the account is not provisioned for this
  // app. Deny access instead of silently granting it. (Redirecting to /login
  // would loop, since LoginPage bounces an authenticated user back here.)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Nincs hozzáférésed
          </h1>
          <p className="text-gray-600 mb-6">
            A fiókodhoz nem tartozik jogosultság ehhez a rendszerhez. Kérlek,
            lépj kapcsolatba az adminisztrátorral.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-pepper-red text-white rounded-lg hover:bg-red-700"
          >
            Kijelentkezés
          </button>
        </div>
      </div>
    );
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
