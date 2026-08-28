/**
 * useAdminPickupDetails — fetches one pickup's full admin detail view.
 * Built on useAsyncResource.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as adminService from "@/services/adminService";

export const useAdminPickupDetails = (id) => {
  const fetcher = useCallback(() => adminService.getPickupDetails(id), [id]);
  return useAsyncResource(fetcher, { initialData: null, enabled: !!id });
};

export default useAdminPickupDetails;
