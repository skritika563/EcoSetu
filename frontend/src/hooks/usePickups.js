/**
 * usePickups — the pickup/job list for the signed-in user.
 *
 * Same { data, loading, error, refetch } contract as useDashboardData and
 * useSustainabilityData, so every list page in the app behaves identically.
 * Resolves to the household/organization's pickups, or the collector's jobs,
 * based on the current role — callers don't need to branch.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getJobsForCollector, getPickupsForRole } from "@/services/pickupService";

export const usePickups = ({ empty = false } = {}) => {
  const { role } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(null);

    try {
      const result =
        role === "collector"
          ? await getJobsForCollector({ empty })
          : await getPickupsForRole(role, { empty });

      if (requestRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Pickup list load failed:", err);
      setError(err.message || "Unable to load pickups. Please try again.");
      setData(null);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [role, empty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  return { data, loading, error, refetch: load };
};

export default usePickups;
