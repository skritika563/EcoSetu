/**
 * useUserProfile — the one general public-profile fetch, shared by
 * Marketplace's seller view and Campaigns' participant/volunteer lookup
 * (see pages/common/UserProfilePage.jsx and userService.js).
 */

import { useCallback } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as userService from "@/services/userService";

export const useUserProfile = (userId) => {
  const fetcher = useCallback(() => userService.getUserProfile(userId), [userId]);

  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    enabled: !!userId,
    errorMessage: "Couldn't load this profile.",
  });

  return {
    profile: data?.user ?? null,
    bio: data?.bio ?? null,
    campaignHistory: data?.campaignHistory ?? [],
    loading,
    error,
    refetch,
  };
};
