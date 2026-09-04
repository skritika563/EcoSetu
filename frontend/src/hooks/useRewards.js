/**
 * useRewards — the Eco Points catalogue plus the caller's live balance,
 * and their redemption ledger. Built on the shared useAsyncResource hook.
 *
 * The catalogue is fetched ONCE, unfiltered (no category param sent to the
 * server) — category filtering happens client-side in RewardsPage, off the
 * one full list. This matters beyond just avoiding a round trip per filter
 * click: it's what lets the page derive "which category chips are even
 * worth showing" from what's actually in the catalogue right now, rather
 * than a hardcoded list that can point at an empty category (which is
 * exactly what happened when the eco-product rewards were retired but the
 * filter chip stayed).
 *
 * `redeem` refetches both halves on success: a redemption changes the
 * balance AND the ledger, and (for finite-stock rewards) the catalogue's
 * remaining stock too.
 */
import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as rewardService from "@/services/rewardService";

export const useRewards = () => {
  const catalogueFetcher = useCallback(() => rewardService.getRewards(), []);
  const catalogue = useAsyncResource(catalogueFetcher, {
    initialData: { balance: 0, rewards: [] },
  });

  const ledgerFetcher = useCallback(() => rewardService.getMyRedemptions(), []);
  const ledger = useAsyncResource(ledgerFetcher, {
    initialData: { totalPointsSpent: 0, redemptions: [] },
  });

  const redeem = useCallback(
    async (rewardId) => {
      const result = await rewardService.redeemReward(rewardId);
      await Promise.all([catalogue.refetch(), ledger.refetch()]);
      return result;
    },
    [catalogue, ledger]
  );

  return { catalogue, ledger, redeem };
};

export default useRewards;
