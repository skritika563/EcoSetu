/**
 * useDashboardData — loads everything the Home dashboard needs for the
 * signed-in user.
 *
 * Deliberately shaped like a real request so the swap to the API is contained:
 * replace the body of `fetchDashboard` with the Axios calls and every consuming
 * component keeps working, including its loading and error states.
 *
 * Returns { data, loading, error, refetch }.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getDashboardData } from "@/data/dashboardData";
import { getMarketplacePreview } from "@/data/marketplaceData";
import { getCampaigns } from "@/data/campaignData";
import { getRecentActivity } from "@/data/activityData";

/** Mock latency so loading states are real rather than theoretical. */
const MOCK_LATENCY_MS = 450;

const fetchDashboard = async (role) => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const dashboard = getDashboardData(role);
  if (!dashboard) {
    throw new Error(`No dashboard data available for role "${role}".`);
  }

  return {
    ...dashboard,
    marketplace: getMarketplacePreview(4),
    campaigns: getCampaigns(role, 3),
    activity: getRecentActivity(role, 4),
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
