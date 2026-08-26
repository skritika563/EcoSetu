/**
 * Campaign hooks — thin wrappers over useAsyncResource, same contract as
 * useProducts.js / useMarketplaceOrders.js: { data, loading, error, refetch }.
 */

import { useCallback } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as campaignService from "@/services/campaignService";

/**
 * @param {object} filters - search, category, status, city, organizationId, sort
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 */
export const useCampaigns = (filters = {}, { enabled = true } = {}) => {
  const key = JSON.stringify(filters);
  const fetcher = useCallback(() => campaignService.getCampaigns(JSON.parse(key)), [key]);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: { campaigns: [], pagination: { total: 0, hasMore: false } },
    enabled,
    errorMessage: "Couldn't load campaigns. Please try again.",
  });

  return {
    campaigns: data?.campaigns ?? [],
    pagination: data?.pagination ?? { total: 0, hasMore: false },
    loading,
    error,
    refetch,
    patchCampaign: useCallback(
      (id, patch) =>
        applyData((prev) => ({
          ...prev,
          campaigns: (prev?.campaigns ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      [applyData]
    ),
  };
};

export const useCampaign = (campaignId) => {
  const fetcher = useCallback(() => campaignService.getCampaignById(campaignId), [campaignId]);
  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    enabled: !!campaignId,
    errorMessage: "Couldn't load this campaign.",
  });
  return { campaign: data, loading, error, refetch, applyCampaign: applyData };
};

export const useMyCampaigns = (status) => {
  const fetcher = useCallback(() => campaignService.getMyCampaigns(status), [status]);
  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your campaigns.",
  });
  return {
    campaigns: data ?? [],
    loading,
    error,
    refetch,
    removeLocal: useCallback((id) => applyData((prev) => (prev ?? []).filter((c) => c.id !== id)), [applyData]),
    patchLocal: useCallback(
      (id, patch) => applyData((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c))),
      [applyData]
    ),
  };
};

/** Campaigns the signed-in user has joined/volunteered for — "My Campaigns". */
export const useMyParticipation = (params = {}) => {
  const key = JSON.stringify(params);
  const fetcher = useCallback(() => campaignService.getMyParticipation(JSON.parse(key)), [key]);
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your campaigns.",
  });
  return { campaigns: data ?? [], loading, error, refetch };
};

/** Owner-only: one campaign's participants or volunteers list. */
export const useCampaignPeople = (campaignId, type, status) => {
  const fetcher = useCallback(
    () =>
      type === "volunteer"
        ? campaignService.getCampaignVolunteers(campaignId, status)
        : campaignService.getCampaignParticipants(campaignId, status),
    [campaignId, type, status]
  );
  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    initialData: [],
    enabled: !!campaignId,
    errorMessage: "Couldn't load this list.",
  });
  return {
    people: data ?? [],
    loading,
    error,
    refetch,
    patchLocal: useCallback(
      (id, patch) => applyData((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p))),
      [applyData]
    ),
  };
};

/** Owner-only: real Pickup documents linked to this campaign. */
export const useCampaignPickups = (campaignId) => {
  const fetcher = useCallback(() => campaignService.getCampaignPickups(campaignId), [campaignId]);
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    initialData: [],
    enabled: !!campaignId,
    errorMessage: "Couldn't load pickups for this campaign.",
  });
  return { pickups: data ?? [], loading, error, refetch };
};

/** Owner-only: real aggregate analytics. */
export const useCampaignAnalytics = (campaignId) => {
  const fetcher = useCallback(() => campaignService.getCampaignAnalytics(campaignId), [campaignId]);
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    enabled: !!campaignId,
    errorMessage: "Couldn't load analytics for this campaign.",
  });
  return { analytics: data, loading, error, refetch };
};

export const useMyCertificates = () => {
  const fetcher = useCallback(() => campaignService.getMyCertificates(), []);
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your certificates.",
  });
  return { certificates: data ?? [], loading, error, refetch };
};

export default useCampaigns;
