/**
 * Payment service — the instant-pickup platform fee (₹30, Razorpay).
 *
 * Real as of this pass: creates a genuine Razorpay order server-side, and
 * the resulting order/payment/signature triple gets verified server-side
 * again before a pickup is ever created (see pickupController.createPickup
 * and services/razorpayService.js). The scrap payout itself (collector →
 * customer) is unrelated and untouched by this.
 */

import api from "@/services/api";

/** → POST /api/payments/instant-fee/order */
export const createInstantFeeOrder = async () => {
  const response = await api.post("/payments/instant-fee/order");
  return response.data.data; // { orderId, amount, currency, keyId }
};

export default { createInstantFeeOrder };
