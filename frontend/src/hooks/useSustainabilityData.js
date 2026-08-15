/**
 * useSustainabilityData — loads the Sustainability Dashboard payload.
 *
 * Mirrors useDashboardData: same { data, loading, error, refetch } contract and
 * the same stale-request guard, so both dashboards behave identically.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getSustainabilityDashboard } from "@/services/sustainabilityService";

export const useSustainabilityData = ({ empty = false } = {}) => {
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
      const result = await getSustainabilityDashboard(role, { empty });
      if (requestRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Sustainability load failed:", err);
      setError(err.message || "Failed to load sustainability data.");
      setData(null);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [role, empty]);

  useEffect(() => {
    // Fetch-on-mount: `loading` already starts true and `error` already starts
    // null, so these writes are no-ops on first render and cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  return { data, loading, error, refetch: load };
};

export default useSustainabilityData;
