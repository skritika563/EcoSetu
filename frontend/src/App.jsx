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
const ScanScrapPage = lazy(() => import("@/pages/scan/ScanScrapPage"));

// Marketplace module — every authenticated role browses, buys AND sells here.
const MarketplaceBrowse = lazy(() => import("@/pages/marketplace/MarketplaceBrowse"));
const ProductDetailsPage = lazy(() => import("@/pages/marketplace/ProductDetailsPage"));
const WishlistPage = lazy(() => import("@/pages/marketplace/WishlistPage"));
const MyListingsPage = lazy(() => import("@/pages/marketplace/MyListingsPage"));
const ListingFormPage = lazy(() => import("@/pages/marketplace/ListingFormPage"));
const PurchasesPage = lazy(() => import("@/pages/marketplace/PurchasesPage"));
const OrdersReceivedPage = lazy(() => import("@/pages/marketplace/OrdersReceivedPage"));
const OrderDetailsPage = lazy(() => import("@/pages/marketplace/OrderDetailsPage"));
const MarketplaceMessages = lazy(() => import("@/pages/marketplace/MarketplaceMessages"));

// UserProfilePage is shared, not marketplace- or campaigns-specific — see
// its own header comment. Two routes below both render it.
const UserProfilePage = lazy(() => import("@/pages/common/UserProfilePage"));

// Campaigns module — every authenticated role (except admin) browses, joins
// AND volunteers here; only organization accounts (NGO/School/University —
// see User.organizationType) create and manage.
const CampaignsBrowse = lazy(() => import("@/pages/campaigns/CampaignsBrowse"));
const CampaignDetailsPage = lazy(() => import("@/pages/campaigns/CampaignDetailsPage"));
const MyParticipationPage = lazy(() => import("@/pages/campaigns/MyParticipationPage"));
const CertificatePage = lazy(() => import("@/pages/campaigns/CertificatePage"));
const MyCampaignsPage = lazy(() => import("@/pages/campaigns/MyCampaignsPage"));
const CampaignFormPage = lazy(() => import("@/pages/campaigns/CampaignFormPage"));
const CampaignManagePage = lazy(() => import("@/pages/campaigns/CampaignManagePage"));

// Admin module — dedicated platform administration console.
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminUserDetails = lazy(() => import("@/pages/admin/AdminUserDetails"));
const AdminPickups = lazy(() => import("@/pages/admin/AdminPickups"));
const AdminPickupDetails = lazy(() => import("@/pages/admin/AdminPickupDetails"));
const AdminMarketplace = lazy(() => import("@/pages/admin/AdminMarketplace"));
const AdminCampaigns = lazy(() => import("@/pages/admin/AdminCampaigns"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminScrapRates = lazy(() => import("@/pages/admin/AdminScrapRates"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

/**
 * Home dashboard for a role.
 * Household and organization deliberately share one dashboard — they are the
 * same product with different content, not different applications.
 */
function RoleHome({ role }) {
  if (role === "collector") return <CollectorHome />;
  if (role === "admin") return <Navigate to="/admin" replace />;
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
            {/* "Profile settings" from the Navbar's user dropdown — same
                UserProfilePage as the marketplace/campaigns routes below,
                just with no :sellerId/:userId param, so it falls back to
                the signed-in user's own id and shows the Edit button. */}
            <Route path="/profile" element={<UserProfilePage />} />
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

          {/* Scan Scrap — standalone AI classification tool. Reachable from the
              "Scan Scrap" quick action (household/collector Home dashboards,
              see config/navigation.js's getQuickActions) AND from
              DashboardHero's "Scan my scrap" button, which household AND
              organization both see — so organization needs this route too
              even though it has no dedicated quick-action tile for it. */}
          <Route element={<ProtectedRoute allowedRoles={["household", "organization", "collector"]} />}>
            <Route path="/scan" element={<ScanScrapPage />} />
          </Route>

          {/* Marketplace — BUYING is open to every signed-in role (household,
              organization, collector). Admin has no marketplace surface and
              simply isn't routed here. */}
          <Route element={<ProtectedRoute allowedRoles={["household", "organization", "collector"]} />}>
            <Route path="/marketplace" element={<MarketplaceBrowse />} />
            <Route path="/marketplace/product/:productId" element={<ProductDetailsPage />} />
            <Route path="/marketplace/seller/:sellerId" element={<UserProfilePage />} />
            <Route path="/marketplace/wishlist" element={<WishlistPage />} />
            <Route path="/marketplace/purchases" element={<PurchasesPage />} />
            <Route path="/marketplace/purchases/:orderId" element={<OrderDetailsPage />} />
            <Route path="/marketplace/messages" element={<MarketplaceMessages />} />
          </Route>

          {/* Marketplace — SELLING is collector-only. Household/organization
              never reach these pages, even by direct URL — matches the
              backend's own role gate on every seller-side endpoint (see
              marketplaceRoutes.js's `sellerOnly`). */}
          <Route element={<ProtectedRoute allowedRoles={["collector"]} />}>
            <Route path="/marketplace/listings" element={<MyListingsPage />} />
            <Route path="/marketplace/listings/new" element={<ListingFormPage />} />
            <Route path="/marketplace/listings/:productId/edit" element={<ListingFormPage />} />
            {/* Same OrderDetailsPage as the buyer route above — it adapts to
                whether the viewer is the buyer or the seller, using the
                server-supplied viewerRole. Only the "orders received" list
                itself (seller-only) needs the role gate; the detail page is
                already scoped to the order's own two parties server-side. */}
            <Route path="/marketplace/orders" element={<OrdersReceivedPage />} />
            <Route path="/marketplace/orders/:orderId" element={<OrderDetailsPage />} />
          </Route>

          {/* Campaigns — BROWSING, JOINING and VOLUNTEERING are open to
              every non-admin role (household, organization, collector).
              Admin has no campaign surface and simply isn't routed here —
              hitting one of these URLs redirects it to its own dashboard,
              same as Marketplace's precedent. */}
          <Route element={<ProtectedRoute allowedRoles={["household", "organization", "collector"]} />}>
            <Route path="/campaigns" element={<CampaignsBrowse />} />
            <Route path="/campaigns/mine/participation" element={<MyParticipationPage />} />
            <Route path="/campaigns/:campaignId" element={<CampaignDetailsPage />} />
            <Route path="/campaigns/:campaignId/certificate" element={<CertificatePage />} />
            {/* Same shared page as the Marketplace seller route above — open
                to every non-admin role since the backend endpoint already is
                (see userRoutes.js), even though the only real linker today is
                CampaignManagePage's organizer-only Participants/Volunteers
                panel. */}
            <Route path="/campaigns/users/:userId" element={<UserProfilePage />} />
          </Route>

          {/* Campaigns — CREATING and MANAGING is organization-only
              (NGO/School/University). Household/collector never reach
              these pages, even by direct URL — matches the backend's own
              role gate on every organizer-side endpoint (see
              campaignRoutes.js's `organizerOnly`). */}
          <Route element={<ProtectedRoute allowedRoles={["organization"]} />}>
            <Route path="/campaigns/mine" element={<MyCampaignsPage />} />
            <Route path="/campaigns/new" element={<CampaignFormPage />} />
            <Route path="/campaigns/:campaignId/edit" element={<CampaignFormPage />} />
            <Route path="/campaigns/:campaignId/manage" element={<CampaignManagePage />} />
          </Route>

          {/* Role-scoped dashboards — derived from ROLE_META so routes and role
              metadata can never drift apart. */}
          {Object.entries(ROLE_META)
            .filter(([role]) => role !== "admin")
            .map(([role, meta]) => (
              <Route key={role} element={<ProtectedRoute allowedRoles={[role]} />}>
                <Route path={`${meta.home}/*`} element={<RoleHome role={role} />} />
              </Route>
            ))}
        </Route>

        {/* Admin Console — Dedicated Layout (AdminLayout), protected by admin role guard */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<AdminUserDetails />} />
            <Route path="/admin/pickups" element={<AdminPickups />} />
            <Route path="/admin/pickups/:id" element={<AdminPickupDetails />} />
            <Route path="/admin/marketplace" element={<AdminMarketplace />} />
            <Route path="/admin/campaigns" element={<AdminCampaigns />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/scrap-rates" element={<AdminScrapRates />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/audit-log" element={<AdminAuditLog />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

