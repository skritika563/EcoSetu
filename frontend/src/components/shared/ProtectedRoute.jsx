/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Protected Route Component
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Route guard that requires authentication and optionally enforces roles.
 * Role comes from MongoDB (via backend), never from frontend state directly.
 *
 * Decision tree:
 *   Initializing?           → Show branded PageLoader
 *   Firebase + needsProfile → redirect /complete-profile
 *   Firebase + sessionError → show recovery screen (retry / sign out)
 *   Not authenticated?      → redirect /login (saves return URL)
 *   Wrong role?             → redirect user's own dashboard
 *   ✅ Authorized            → render Outlet or children
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleHome } from "@/config/roles";
import PageLoader from "@/components/shared/PageLoader";
import SessionErrorScreen from "@/components/shared/SessionErrorScreen";

/**
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - Roles allowed on this route.
 *   If omitted, any authenticated user can access.
 * @param {React.ReactNode} [props.children] - Render children instead of Outlet.
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const {
    role,
    isAuthenticated,
    isFirebaseAuthenticated,
    needsProfile,
    initializing,
    sessionError,
  } = useAuth();
  const location = useLocation();

  // ── 1. Restoring the session on load ─────────────────────────────────────
  if (initializing) {
    return <PageLoader message="Loading your session…" />;
  }

  // ── 2. Firebase auth without MongoDB profile ────────────────────────────
  if (isFirebaseAuthenticated && needsProfile) {
    return <Navigate to="/complete-profile" state={{ from: location.pathname }} replace />;
  }

  // ── 3. Session alive but profile unavailable — offer retry / sign out
  //       instead of silently bouncing to the login page ───────────────────
  if (isFirebaseAuthenticated && sessionError) {
    return <SessionErrorScreen />;
  }

  // ── 4. Not authenticated ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  // ── 5. Role check ────────────────────────────────────────────────────────
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getRoleHome(role)} replace />;
    }
  }

  // ── 6. Authorized ────────────────────────────────────────────────────────
  return children ?? <Outlet />;
};

export default ProtectedRoute;
