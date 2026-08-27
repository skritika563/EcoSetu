/**
 * useAdminUsers — fetches admin users list with search/filter/pagination.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminUsers = () => {
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    page: 1,
    limit: 20,
  });

  const fetcher = useCallback(
    () => adminService.listUsers(filters),
    [filters]
  );

  const resource = useAsyncResource(fetcher, { initialData: { users: [], pagination: {} } });

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return { ...resource, filters, updateFilters, setPage };
};

export default useAdminUsers;
