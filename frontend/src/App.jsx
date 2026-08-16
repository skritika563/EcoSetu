/**
 * App.jsx — React Router configuration and top-level route structure.
 *
 * Route structure:
 *   /                   → Smart root: landing page for guests, Home dashboard
 *                         for authenticated users (admins go to /admin)
 *   /auth/login         → Login page
 *   /auth/register      → Multi-step signup
 *   /complete-profile   → Profile completion for Google auth users (full bleed)
 *
 *   Protected role routes (AppShell):
 *   /household/*        → Household Home dashboard
 *   /organization/*     → Organization Home dashboard
 *   /collector/*        → Collector Home dashboard
 *   /admin/*            → Admin (placeholder — built in the Admin module)
 *
 * The role-scoped routes render the same dashboards as `/` so existing links
 * and bookmarks keep working, while `/` stays the canonical Home.
 *
 * Security: roles are read from MongoDB (via backend), never from frontend state.
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META } from "@/config/roles";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AppShell from "@/components/shared/AppShell";
import PageLoader from "@/components/shared/PageLoader";
import SessionErrorScreen from "@/components/shared/SessionErrorScreen";
import "./App.css";

/* ─── Page imports ───────────────────────────────────────────────────────────
 * Every page is code-split: a visitor landing on the marketing page never
 * downloads the dashboards, and a signed-in user never downloads the auth
 * flows. AppShell holds the Suspense boundary, so the navbar and footer stay
 * mounted while a page chunk loads.
 */
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage"));
const CompleteProfilePage = lazy(() => import("@/pages/auth/CompleteProfilePage"));
const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const GeneralUserHome = lazy(() => import("@/pages/home/GeneralUserHome"));
const CollectorHome = lazy(() => import("@/pages/home/CollectorHome"));
const SustainabilityDashboard = lazy(() => import("@/pages/dashboard/SustainabilityDashboard"));

// Pickups module — household/organization booking + tracking, collector jobs.
const GeneralUserPickups = lazy(() => import("@/pages/pickups/GeneralUserPickups"));
const BookPickupPage = lazy(() => import("@/pages/pickups/BookPickupPage"));
const PickupDetailsPage = lazy(() => import("@/pages/pickups/PickupDetailsPage"));
const CollectorJobsPage = lazy(() => import("@/pages/pickups/CollectorJobsPage"));
const CollectorJobDetailsPage = lazy(() => import("@/pages/pickups/CollectorJobDetailsPage"));

/* ─── Admin placeholder — replaced by the Admin module ───────────────────── */
function AdminPlaceholder() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <span className="text-xl">🌿</span>
      </div>
      <h1 className="font-heading text-xl font-semibold text-foreground">Admin Dashboard</h1>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Welcome, {user?.name}. The admin console is built in a later module.
      </p>
    </div>
  );
}

/**
 * Home dashboard for a role.
 * Household and organization deliberately share one dashboard — they are the
 * same product with different content, not different applications.
 */
function RoleHome({ role }) {
  if (role === "collector") return <CollectorHome />;
  if (role === "admin") return <AdminPlaceholder />;
  return <GeneralUserHome />;
}

/* ─── Smart root ─────────────────────────────────────────────────────────── */
function AuthHome() {
  const { isAuthenticated, role, initializing, isFirebaseAuthenticated, sessionError } = useAuth();

  if (initializing) return <PageLoader />;

  // Signed in to Firebase but the profile (and therefore the role) is
  // unavailable — we can't route them anywhere, so explain and offer a way out.
  if (isFirebaseAuthenticated && sessionError) return <SessionErrorScreen />;

  if (isAuthenticated && role) {
    // Admins are not general users — keep them on their own surface.
    if (role === "admin") return <Navigate to={ROLE_META.admin.home} replace />;
    return <RoleHome role={role} />;
  }

  return <LandingPage />;
}

/* ─── App ────────────────────────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* Complete profile — full bleed, no AppShell (forced onboarding).
            Own Suspense boundary since it renders outside the shell. */}
        <Route
          path="/complete-profile"
          element={
            <Suspense fallback={<PageLoader />}>
              <CompleteProfilePage />
            </Suspense>
          }
        />

        {/* AppShell wrapped routes (Navbar + Footer + mobile bottom nav) */}
        <Route element={<AppShell />}>
          {/* Smart root: landing page or role Home dashboard */}
          <Route path="/" element={<AuthHome />} />

          {/* Public auth pages — inside AppShell for Navbar/Footer */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<SignupPage />} />

          {/* Sustainability dashboard — impact detail for any signed-in user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<SustainabilityDashboard />} />
          </Route>

          {/* Pickups — household/organization booking + tracking.
              `admin` is allowed through so it can render its own "coming
              soon" state (checked inside each page) rather than being
              silently bounced by the role guard. */}
          <Route element={<ProtectedRoute allowedRoles={["household", "organization", "admin"]} />}>
            <Route path="/pickups" element={<GeneralUserPickups />} />
            <Route path="/pickups/new" element={<BookPickupPage />} />
            <Route path="/pickups/:pickupId" element={<PickupDetailsPage />} />
          </Route>

          {/* Jobs — the collector's pickup-management surface. */}
          <Route element={<ProtectedRoute allowedRoles={["collector", "admin"]} />}>
            <Route path="/jobs" element={<CollectorJobsPage />} />
            <Route path="/jobs/:jobId" element={<CollectorJobDetailsPage />} />
          </Route>

          {/* Role-scoped dashboards — derived from ROLE_META so routes and role
              metadata can never drift apart. */}
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <Route key={role} element={<ProtectedRoute allowedRoles={[role]} />}>
              <Route path={`${meta.home}/*`} element={<RoleHome role={role} />} />
            </Route>
          ))}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
