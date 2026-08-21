/**
 * useWishlist — the signed-in user's saved listings, persisted in MongoDB.
 *
 * `toggle` is optimistic: the heart fills instantly, then the real request
 * confirms it. On failure the local state is rolled back and the error is
 * surfaced, so the UI never quietly disagrees with the server.
 */

import { useCallback, useState } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as wishlistService from "@/services/wishlistService";

export const useWishlist = () => {
  const fetcher = useCallback(() => wishlistService.getWishlist(), []);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your wishlist.",
  });

  // Per-product in-flight state, so one heart's spinner doesn't disable the
  // whole grid's buttons.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const setPending = useCallback((productId, isPending) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  /**
   * @param {string} productId
   * @param {boolean} currentlyWishlisted
   * @returns {Promise<boolean>} the new wishlisted state
   */
  const toggle = useCallback(
    async (productId, currentlyWishlisted) => {
      const next = !currentlyWishlisted;
      setPending(productId, true);

      // Optimistic: drop it from the local list immediately when removing so
      // the wishlist page doesn't hold a card that's on its way out.
      if (!next) applyData((prev) => (prev ?? []).filter((p) => p.id !== productId));

      try {
        if (next) await wishlistService.addToWishlist(productId);
        else await wishlistService.removeFromWishlist(productId);
        return next;
      } catch (err) {
        // Roll back by refetching the authoritative list rather than trying
        // to reconstruct what was there.
        refetch();
        throw err;
      } finally {
        setPending(productId, false);
      }
    },
    [applyData, refetch, setPending]
  );

  return {
    wishlist: data ?? [],
    loading,
    error,
    refetch,
    toggle,
    isPending: useCallback((productId) => pendingIds.has(productId), [pendingIds]),
  };
};

export default useWishlist;
