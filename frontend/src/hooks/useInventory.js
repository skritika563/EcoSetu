/**
 * useInventory — a collector's derived material stock (collected on
 * completed pickups, minus what's already listed). Built on the shared
 * useAsyncResource hook.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as productService from "@/services/productService";

export const useInventory = () => {
  const fetcher = useCallback(() => productService.getInventory(), []);
  return useAsyncResource(fetcher, { initialData: null });
};

export default useInventory;
