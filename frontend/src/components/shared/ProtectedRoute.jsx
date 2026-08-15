/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Protected Route Component
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Route guard that requires authentication and optionally enforces roles.
 * Role comes from MongoDB (via backend), never from frontend state directly.
 *
 * Decision tree:
 *   Loading?              → Show branded PageLoader
 *   Firebase + needsProfile → redirect /complete-profile
 *   Not authenticated?    → redirect /login (saves return URL)
 *   Wrong role?           → redirect user's own dashboard
 *   ✅ Authorized          → render Outlet or children
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "@/components/shared/PageLoader";

const ROLE_HOME_ROUTES = {
  household:    "/household",
  organization: "/organization",
  collector:    "/collector",
  admin:        "/admin",
};

/**
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - Roles allowed on this route.
 *   If omitted, any authenticated user can access.
 * @param {React.ReactNode} [props.children] - Render children instead of Outlet.
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { role, isAuthenticated, isFirebaseAuthenticated, needsProfile, loading } = useAuth();
  const location = useLocation();

  // ── 1. Auth loading ──────────────────────────────────────────────────────
  if (loading) {
    return <PageLoader message="Loading your session…" />;
  }

  // ── 2. Firebase auth without MongoDB profile ────────────────────────────
  if (isFirebaseAuthenticated && needsProfile) {
    return <Navigate to="/complete-profile" state={{ from: location.pathname }} replace />;
  }

  // ── 3. Not authenticated ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ── 4. Role check ────────────────────────────────────────────────────────
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      const homeRoute = ROLE_HOME_ROUTES[role] || "/";
      return <Navigate to={homeRoute} replace />;
    }
  }

  // ── 5. Authorized ────────────────────────────────────────────────────────
  return children ?? <Outlet />;
};

export default ProtectedRoute;
