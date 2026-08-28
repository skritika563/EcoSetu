/**
 * useAdminScrapRates — fetches the platform scrap-rate table and exposes a
 * `saveRate` mutation that patches local state on success. Built on
 * useAsyncResource.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminScrapRates = () => {
  const fetcher = useCallback(() => adminService.listScrapRates(), []);
  const resource = useAsyncResource(fetcher, { initialData: [] });

  const saveRate = useCallback(
    async (id, pricePerKg) => {
      const res = await adminService.updateScrapRate(id, pricePerKg);
      resource.applyData((prev) =>
        prev.map((r) => (r.id === id ? { ...r, pricePerKg: res.pricePerKg, lastUpdated: res.lastUpdated } : r))
      );
      return res;
    },
    [resource]
  );

  return { ...resource, saveRate };
};

export default useAdminScrapRates;
