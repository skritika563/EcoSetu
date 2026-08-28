/**
 * useAdminMarketplace — fetches the marketplace overview stats and the
 * filterable/paginated product list, plus a `toggleProductStatus` mutation
 * that patches local state and refreshes the overview counts on success.
 * Built on useAsyncResource.
 */
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

const INITIAL_FILTERS = { status: "", search: "", page: 1, limit: 20 };

export const useAdminMarketplace = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const overviewFetcher = useCallback(() => adminService.getMarketplaceOverview(), []);
  const overview = useAsyncResource(overviewFetcher, { initialData: null });

  const productsFetcher = useCallback(() => adminService.listProducts(filters), [filters]);
  const products = useAsyncResource(productsFetcher, {
    initialData: { products: [], pagination: {} },
  });

  const updateFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const toggleProductStatus = useCallback(
    async (product) => {
      const nextStatus = product.status === "active" ? "inactive" : "active";
      await adminService.updateProductStatus(product.id, nextStatus);
      products.applyData((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p)),
      }));
      overview.refetch();
      return nextStatus;
    },
    [products, overview]
  );

  return { overview, products, filters, updateFilters, setPage, toggleProductStatus };
};

export default useAdminMarketplace;
