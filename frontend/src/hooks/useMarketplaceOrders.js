/**
 * Marketplace order hooks.
 *
 * usePurchases     — orders where I'm the buyer
 * useReceivedOrders — orders on my own listings
 * useMarketplaceOrder — one order, from whichever side is viewing it
 *
 * Named useMarketplaceOrders rather than useOrders so it can't be confused
 * with the scrap-pickup flow, matching the same naming discipline used for
 * marketplaceOrderService.
 */

import { useCallback } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as orderService from "@/services/marketplaceOrderService";

export const usePurchases = (status) => {
  const fetcher = useCallback(() => orderService.getPurchases(status), [status]);

  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your purchases.",
  });

  return { orders: data ?? [], loading, error, refetch };
};

export const useReceivedOrders = (status, productId) => {
  const fetcher = useCallback(() => orderService.getReceivedOrders(status, productId), [status, productId]);

  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    initialData: [],
    errorMessage: "Couldn't load your orders.",
  });

  return { orders: data ?? [], loading, error, refetch };
};

export const useMarketplaceOrder = (orderId) => {
  const fetcher = useCallback(() => orderService.getOrderById(orderId), [orderId]);

  const { data, loading, error, refetch, applyData } = useAsyncResource(fetcher, {
    enabled: !!orderId,
    errorMessage: "Couldn't load this order.",
  });

  /**
   * Move an order forward. The backend validates the transition and returns
   * the updated order, which is applied directly — no refetch, no loading
   * flash, and the server stays the single source of truth for what the new
   * state actually is.
   */
  const changeStatus = useCallback(
    async (status, reason, trackingNumber) => {
      const updated = await orderService.updateOrderStatus(orderId, status, reason, trackingNumber);
      applyData(updated);
      return updated;
    },
    [orderId, applyData]
  );

  return { order: data, loading, error, refetch, changeStatus };
};
