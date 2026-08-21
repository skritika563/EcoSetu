/**
 * useListings — the signed-in user's OWN marketplace listings.
 *
 * The only surface where drafts, inactive and sold listings are visible;
 * the backend scopes this to the authenticated seller, so there's no
 * client-side ownership filtering to get wrong.
 */

import { useCallback } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as productService from "@/services/productService";

/** @param {string} [status] - "active" | "draft" | "sold" | "inactive" | "all" */
export const useListings = (status) => {
  const fetcher = useCallback(() => productService.getMyListings(status), [status]);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your listings.",
  });

  /** Drop one listing locally after a confirmed delete — no refetch flash. */
  const removeLocal = useCallback(
    (id) => applyData((prev) => (prev ?? []).filter((p) => p.id !== id)),
    [applyData]
  );

  /** Patch one listing after a status change (e.g. marked sold). */
  const patchLocal = useCallback(
    (id, patch) => applyData((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [applyData]
  );

  return { listings: data ?? [], loading, error, refetch, removeLocal, patchLocal };
};

export default useListings;
