/**
 * useAdminAuditLog — fetches the append-only admin audit log with an action
 * filter and pagination. Built on useAsyncResource.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

const INITIAL_FILTERS = { action: "", page: 1, limit: 25 };

export const useAdminAuditLog = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetcher = useCallback(() => adminService.getAuditLogs(filters), [filters]);
  const resource = useAsyncResource(fetcher, { initialData: { logs: [], pagination: {} } });

  const updateFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return { ...resource, filters, updateFilters, setPage };
};

export default useAdminAuditLog;
