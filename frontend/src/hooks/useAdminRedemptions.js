/**
 * useAdminRedemptions — fetches the reward-redemption ledger with a status
 * filter and pagination, plus an `updateStatus` mutation. Built on the
 * shared useAsyncResource hook, same pattern as useAdminAuditLog.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

const INITIAL_FILTERS = { status: "", page: 1, limit: 25 };

export const useAdminRedemptions = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetcher = useCallback(() => adminService.listRedemptions(filters), [filters]);
  const resource = useAsyncResource(fetcher, {
    initialData: { redemptions: [], statusCounts: {}, pagination: {} },
  });

  const updateFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const updateStatus = useCallback(
    async (id, status) => {
      await adminService.updateRedemptionStatus(id, status);
      resource.applyData((prev) => ({
        ...prev,
        redemptions: prev.redemptions.map((r) => (r.id === id ? { ...r, status } : r)),
      }));
    },
    [resource]
  );

  return { ...resource, filters, updateFilters, setPage, updateStatus };
};

export default useAdminRedemptions;
