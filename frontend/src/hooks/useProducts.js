/**
 * Marketplace product hooks.
 *
 * useProducts    — the filtered/searched browse grid
 * useProductSections — the Browse landing page's curated rows
 * useProduct     — a single listing
 * useSellerProfile — a public seller page
 *
 * All four are thin wrappers over useAsyncResource, so they return the same
 * { data, loading, error, refetch } contract as every other data hook in
 * the app.
 */

import { useCallback } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as productService from "@/services/productService";

/**
 * @param {object} filters - search, category, city, condition, minPrice,
 *   maxPrice, ecoVerified, sort
 * @param {object} [options]
 * @param {boolean} [options.enabled] - false skips fetching entirely, so a
 *   page showing curated sections instead doesn't also run a full browse
 *   query in the background
 */
export const useProducts = (filters = {}, { enabled = true } = {}) => {
  // Serialized into a primitive so a caller passing a fresh object literal
  // each render doesn't retrigger the fetch every time.
  const key = JSON.stringify(filters);

  const fetcher = useCallback(
    () => productService.getProducts(JSON.parse(key)),
    [key]
  );

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: { products: [], pagination: { total: 0, hasMore: false } },
    enabled,
    errorMessage: "Couldn't load listings. Please try again.",
  });

  return {
    products: data?.products ?? [],
    pagination: data?.pagination ?? { total: 0, hasMore: false },
    loading,
    error,
    refetch,
    /**
     * Patch one product in place — used by the wishlist button so toggling
     * a heart doesn't refetch the whole grid or lose scroll position.
     */
    patchProduct: useCallback(
      (id, patch) =>
        applyData((prev) => ({
          ...prev,
          products: (prev?.products ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      [applyData]
    ),
  };
};

export const useProductSections = () => {
  const fetcher = useCallback(() => productService.getProductSections(), []);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    errorMessage: "Couldn't load the marketplace. Please try again.",
  });

  return {
    sections: data,
    loading,
    error,
    refetch,
    /** Patch a product across every section it appears in (see useProducts). */
    patchProduct: useCallback(
      (id, patch) =>
        applyData((prev) => {
          if (!prev) return prev;
          const patchList = (list) =>
            Array.isArray(list) ? list.map((p) => (p.id === id ? { ...p, ...patch } : p)) : list;
          return Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, patchList(v)]));
        }),
      [applyData]
    ),
  };
};

export const useProduct = (productId) => {
  const fetcher = useCallback(() => productService.getProductById(productId), [productId]);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    enabled: !!productId,
    errorMessage: "Couldn't load this listing.",
  });

  return { product: data, loading, error, refetch, applyProduct: applyData };
};

export const useSellerProfile = (sellerId) => {
  const fetcher = useCallback(() => productService.getSellerProfile(sellerId), [sellerId]);

  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    enabled: !!sellerId,
    errorMessage: "Couldn't load this seller.",
  });

  // Deliberately simplified — a buyer viewing this profile sees who the
  // collector is and how to reach them, not the seller's own active
  // listings or sales stats (that's the seller's own business, not
  // something to expose to every buyer who clicks in).
  return { seller: data?.seller ?? null, bio: data?.bio ?? null, loading, error, refetch };
};

/** Real aggregates for the seller summary panel (prominent for collectors). */
export const useMarketplaceStats = () => {
  const fetcher = useCallback(() => productService.getMyMarketplaceStats(), []);
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    errorMessage: "Couldn't load your marketplace stats.",
  });
  return { stats: data, loading, error, refetch };
};
