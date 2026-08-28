/**
 * useAdminPickups — fetches admin pickups list with status/search/collector/date
 * filters and pagination, plus the collector roster used to populate the
 * collector filter dropdown. Built on the shared useAsyncResource hook so the
 * fetch-on-mount/fetch-on-filter-change wiring doesn't hand-roll setState
 * calls inside a useEffect body.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

const INITIAL_FILTERS = {
  status: "",
  search: "",
  collectorId: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
};

export const useAdminPickups = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetcher = useCallback(() => adminService.listPickups(filters), [filters]);
  const resource = useAsyncResource(fetcher, {
    initialData: { pickups: [], statusCounts: {}, pagination: {} },
  });

  // Collector roster for the filter dropdown — fetched once, not re-fetched
  // on every pickup-filter change.
  const collectorsFetcher = useCallback(
    () => adminService.listUsers({ role: "collector", status: "active", limit: 100 }),
    []
  );
  const collectors = useAsyncResource(collectorsFetcher, { initialData: { users: [] } });

  const updateFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    ...resource,
    filters,
    updateFilters,
    setPage,
    collectors: collectors.data?.users ?? [],
    collectorsLoading: collectors.loading,
  };
};

export default useAdminPickups;
