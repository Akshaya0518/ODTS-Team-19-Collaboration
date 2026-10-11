import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader, EmptyState } from '../components/ui';
import { ROLE_HOME } from '../utils/status';

/**
 * Wraps pages that need a login and (optionally) a specific role.
 *   <Route element={<ProtectedRoute roles={['admin']} />}> ...admin pages... </Route>
 *
 * This only improves the user experience. Real protection is on the backend:
 * every API call checks the login cookie and the role again.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Loader full label="Checking your session…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        <EmptyState
          icon="🔒"
          title="You don't have access to this page"
          action={
            <Link className="btn btn-primary" to={ROLE_HOME[user.role]}>
              Go to my dashboard
            </Link>
          }
        >
          This page is for {roles.join(' / ')} accounts. You are signed in as a {user.role}.
        </EmptyState>
      </div>
    );
  }

  return children || <Outlet />;
}
