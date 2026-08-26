/**
 * useDashboardData — loads everything the Home dashboard needs for the
 * signed-in user.
 *
 * REAL as of the full-stack integration pass: `impact`, `upcomingPickup`
 * (household/organization) and `today`/`nextJob`/`weeklyEarnings`/
 * `categoryBreakdown` (collector) all come from GET /api/analytics/dashboard;
 * `activity` is now also real, built from the signed-in user's own recent
 * Pickup documents (see lib/pickupActivity.js) — it used to be a fully
 * canned feed that would claim "Pickup completed +₹268 by Ramesh Kumar" no
 * matter what the user had actually done, including right after scheduling
 * a brand-new pickup.
 *
 * `marketplace` and `campaigns` are both REAL now, since the Marketplace
 * and Campaigns modules landed — the previews show actual listings from
 * /api/marketplace/products and actual drives from /api/campaigns (or the
 * organizer's own via /api/campaigns/mine).
 *
 * Returns { data, loading, error, refetch }.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { getPickupsForRole, getJobsForCollector } from "@/services/pickupService";
import { getProducts } from "@/services/productService";
import * as campaignService from "@/services/campaignService";
import { pickupToActivityItem } from "@/lib/pickupActivity";

/** Home only ever shows 3 — organizers see their own, everyone else sees nearby active/upcoming drives. */
const getCampaignsPreview = async (role) => {
  if (role === "organization") {
    const campaigns = await campaignService.getMyCampaigns();
    return campaigns.slice(0, 3);
  }
  if (role === "admin") return [];
  const { campaigns } = await campaignService.getCampaigns({ sort: "starting-soon", limit: 3 });
  return campaigns;
};

const fetchDashboard = async (role) => {
  const isCollector = role === "collector";

  const [dashboardResponse, pickups, marketplace, campaigns] = await Promise.all([
    api.get("/analytics/dashboard"),
    // These three are nice-to-haves — never block the whole dashboard on
    // any one of them, so a marketplace/campaign hiccup can't take Home down.
    (isCollector ? getJobsForCollector() : getPickupsForRole(role)).catch(() => []),
    getProducts({ limit: 4, sort: "newest" }).catch(() => ({ products: [] })),
    getCampaignsPreview(role).catch(() => []),
  ]);
  const dashboard = dashboardResponse.data.data;

  if (!dashboard) {
    throw new Error(`No dashboard data available for role "${role}".`);
  }

  const activity = [...pickups]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((pickup) => pickupToActivityItem(pickup, { asCollector: isCollector }));

  return {
    ...dashboard,
    marketplace: marketplace.products ?? [],
    campaigns,
    activity,
  };
};

export const useDashboardData = () => {
  const { role } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guards against a resolved request writing state after unmount or after the
  // role changed mid-flight.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchDashboard(role);
      if (requestRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Dashboard load failed:", err);
      setError(err.message || "Failed to load dashboard data.");
      setData(null);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    // Fetch-on-mount. `loading` already starts true and `error` already starts
    // null, so the synchronous writes inside load() are no-ops on first render
    // and cannot cascade — the lint rule can't distinguish this from a genuine
    // render loop. On a role change the reset to the loading state is exactly
    // what we want.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    return () => {
      // Invalidate in-flight requests on unmount.
      requestRef.current += 1;
    };
  }, [load]);

  return { data, loading, error, refetch: load };
};

export default useDashboardData;
