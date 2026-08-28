/**
 * useAdminCampaigns — fetches admin campaigns list with status/search filters
 * and pagination, plus a `cancelCampaign` mutation that patches local state
 * on success instead of forcing a full refetch. Built on useAsyncResource.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

const INITIAL_FILTERS = { status: "", search: "", page: 1, limit: 20 };

export const useAdminCampaigns = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetcher = useCallback(() => adminService.listCampaigns(filters), [filters]);
  const resource = useAsyncResource(fetcher, {
    initialData: { campaigns: [], statusCounts: {}, pagination: {} },
  });

  const updateFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const cancelCampaign = useCallback(
    async (id, reason) => {
      const res = await adminService.cancelCampaign(id, reason);
      resource.applyData((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === id ? { ...c, status: "cancelled", lifecycleState: "cancelled" } : c
        ),
      }));
      return res;
    },
    [resource]
  );

  return { ...resource, filters, updateFilters, setPage, cancelCampaign };
};

export default useAdminCampaigns;
