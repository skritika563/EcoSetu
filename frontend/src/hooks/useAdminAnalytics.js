/**
 * useAdminAnalytics — fetches admin analytics with configurable period.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminAnalytics = () => {
  const [period, setPeriod] = useState("30d");

  const analyticsFetcher = useCallback(
    () => adminService.getAnalytics(period),
    [period]
  );
  const impactFetcher = useCallback(() => adminService.getEnvironmentalImpact(), []);

  const analytics = useAsyncResource(analyticsFetcher, { initialData: null });
  const impact = useAsyncResource(impactFetcher, { initialData: null });

  return { analytics, impact, period, setPeriod };
};

export default useAdminAnalytics;
