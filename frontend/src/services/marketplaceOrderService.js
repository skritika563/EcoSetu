/**
 * Marketplace order service — backed by /api/marketplace/orders.
 *
 * Named marketplaceOrderService (not orderService) so it can never be
 * confused with the scrap-pickup payout flow, which is a separate,
 * opposite-direction transaction living in services/pickupService.js.
 *
 * PRICING: createCheckoutOrder/createOrder deliberately send only
 * { productId, quantity, fulfillmentMethod, address } — never a price or
 * total. The server reads the live listing price and computes the total
 * itself (backend/services/marketplacePricingService.js), so nothing this
 * file sends can influence what the buyer is charged.
 *
 * PAYMENT is REAL, via Razorpay — two-phase, mirroring the exact pattern
 * BookPickupPage uses for the instant-pickup fee:
 *   1. createCheckoutOrder prices the purchase and opens a Razorpay order
 *      for that exact amount.
 *   2. The caller drives Razorpay Checkout (see CheckoutSummary.jsx, which
 *      uses lib/razorpay.js's loadRazorpayCheckout) and gets back a
 *      {razorpayOrderId, razorpayPaymentId, razorpaySignature} proof.
 *   3. createOrder sends that proof along with the purchase details — the
 *      backend verifies the signature and only then reserves stock and
 *      creates the order. There is no unpaid-order path.
 */

import api from "@/services/api";

/**
 * → POST /api/marketplace/orders/checkout-order
 * Opens a real Razorpay order for the server-computed total of this
 * purchase, before any order document or stock reservation exists.
 * @param {{ productId: string, quantity: number, fulfillmentMethod: "pickup"|"delivery", deliveryAddress?: object }} payload
 * @returns {Promise<{ orderId: string, amount: number, currency: string, keyId: string }>}
 */
export const createCheckoutOrder = async ({ productId, quantity, fulfillmentMethod, deliveryAddress }) => {
  const response = await api.post("/marketplace/orders/checkout-order", {
    productId,
    quantity,
    fulfillmentMethod,
    deliveryAddress,
  });
  return response.data.data;
};

/**
 * → POST /api/marketplace/orders
 * Requires a verified Razorpay payment proof — the backend rejects the
 * request with 402 if it's missing or doesn't verify.
 * @param {{ productId: string, quantity: number, fulfillmentMethod: "pickup"|"delivery", deliveryAddress?: object, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string }} payload
 * @returns {Promise<{ order: object }>}
 */
export const createOrder = async ({
  productId,
  quantity,
  fulfillmentMethod,
  deliveryAddress,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const response = await api.post("/marketplace/orders", {
    productId,
    quantity,
    fulfillmentMethod,
    deliveryAddress,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return response.data.data;
};

/** → GET /api/marketplace/orders/purchases — orders where I'm the buyer. */
export const getPurchases = async (status) => {
  const response = await api.get("/marketplace/orders/purchases", {
    params: status && status !== "all" ? { status } : {},
  });
  return response.data.data;
};

/**
 * → GET /api/marketplace/orders/received — orders on my own listings.
 * @param {string} [status] "all"/falsy means every status.
 * @param {string} [productId] scopes to orders on one specific listing —
 *   used to check "does this listing have any customers yet" before
 *   navigating to the seller's own customer-details view for it.
 */
export const getReceivedOrders = async (status, productId) => {
  const response = await api.get("/marketplace/orders/received", {
    params: {
      ...(status && status !== "all" ? { status } : {}),
      ...(productId ? { productId } : {}),
    },
  });
  return response.data.data;
};

/**
 * → GET /api/marketplace/orders/:id
 * Returns `viewerRole` ("buyer" | "seller") so one screen can serve both
 * sides without the client having to guess which party it is.
 */
export const getOrderById = async (id) => {
  const response = await api.get(`/marketplace/orders/${id}`);
  return response.data.data;
};

/**
 * → PATCH /api/marketplace/orders/:id/status
 * The backend validates every transition against the order's current state
 * and the caller's role — this only requests one. `trackingNumber` is only
 * meaningful when moving a delivery order to "shipped"; harmless to omit.
 */
export const updateOrderStatus = async (id, status, reason, trackingNumber) => {
  const response = await api.patch(`/marketplace/orders/${id}/status`, { status, reason, trackingNumber });
  return response.data.data;
};

export default {
  createCheckoutOrder,
  createOrder,
  getPurchases,
  getReceivedOrders,
  getOrderById,
  updateOrderStatus,
};
