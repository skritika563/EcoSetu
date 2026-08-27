/**
 * useAdminDashboard — fetches admin dashboard stats and platform activity.
 * Built on the shared useAsyncResource hook.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminDashboard = () => {
  const statsFetcher = useCallback(() => adminService.getDashboardStats(), []);
  const activityFetcher = useCallback(() => adminService.getPlatformActivity(20), []);

  const stats = useAsyncResource(statsFetcher, { initialData: null });
  const activity = useAsyncResource(activityFetcher, { initialData: [] });

  return { stats, activity };
};

export default useAdminDashboard;
