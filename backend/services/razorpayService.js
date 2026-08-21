const crypto = require("crypto");
const { getRazorpay } = require("../config/razorpay");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Razorpay Service — instant-pickup fee AND marketplace order payments
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The ONLY place that talks to the Razorpay SDK or does signature
 * verification. Two order types share this one service because they share
 * the exact same trust model:
 *
 *   1. Instant-pickup fee — a FIXED amount (createInstantFeeOrder).
 *   2. Marketplace purchase — a VARIABLE amount computed server-side from
 *      the live listing price × quantity (createMarketplaceCheckoutOrder).
 *
 * In both cases: the client never supplies an amount. The server creates a
 * Razorpay order for a total IT computed, the browser can only complete
 * checkout for that exact order (Razorpay enforces the amount, not us), and
 * the resulting payment is only trusted once its signature verifies against
 * that specific order id using our key secret. That's what makes the
 * eventual charge trustworthy without a second call back to Razorpay to
 * double-check the amount.
 *
 * Flow (both cases): order created here BEFORE the thing being paid for
 * exists (there's no pickup/marketplace-order id yet to attach it to) →
 * customer pays via Razorpay Checkout in the browser → the browser gets
 * back {razorpay_order_id, razorpay_payment_id, razorpay_signature} → those
 * three values are sent to the real creation endpoint (POST /api/pickups or
 * POST /api/marketplace/orders) → the controller verifies the signature here
 * before creating anything. Nothing is ever created off an unverified or
 * missing payment when one is required.
 */

const INSTANT_FEE_RUPEES = 30;
const CURRENCY = "INR";

/** Razorpay amounts are in the smallest currency unit — paise, not rupees. */
const toPaise = (rupees) => Math.round(rupees * 100);

/**
 * Create a Razorpay order for the fixed instant-pickup fee.
 * @param {string} userId - MongoDB user id, folded into the receipt so a
 *   given order can be traced back to who it was for without exposing
 *   anything sensitive in it.
 * @returns {Promise<{orderId: string, amount: number, currency: string}>}
 */
const createInstantFeeOrder = async (userId) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    const error = new Error("Payments are temporarily unavailable. Please try again shortly.");
    error.statusCode = 503;
    error.code = "PAYMENTS_UNAVAILABLE";
    throw error;
  }

  const order = await razorpay.orders.create({
    amount: toPaise(INSTANT_FEE_RUPEES),
    currency: CURRENCY,
    // Receipt ids must be <= 40 chars for Razorpay.
    receipt: `instant_${userId}_${Date.now()}`.slice(0, 40),
    notes: { purpose: "instant_pickup_fee", userId: String(userId) },
  });

  return { orderId: order.id, amount: order.amount, currency: order.currency };
};

/**
 * Verify a completed checkout's signature against the order + payment ids.
 * This is the standard Razorpay HMAC-SHA256 verification
 * (razorpay_order_id + "|" + razorpay_payment_id, signed with the key
 * secret) — the only way to trust that a payment claimed by the browser
 * actually happened and wasn't fabricated client-side.
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const keySecret = process.env.RAZOR_API_SECRET;
  if (!keySecret || !orderId || !paymentId || !signature) return false;

  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

  // Constant-time comparison — a plain `===` on a signature check leaks
  // timing information an attacker could use to guess it byte-by-byte.
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

/**
 * Create a Razorpay order for a marketplace purchase. The amount is
 * whatever the CALLER computed server-side (marketplacePricingService) —
 * this function never re-derives or trusts a price itself, it only creates
 * the order Razorpay will charge exactly.
 *
 * @param {{ userId: string, amountRupees: number, productId: string }} params
 * @returns {Promise<{orderId: string, amount: number, currency: string}>}
 */
const createMarketplaceCheckoutOrder = async ({ userId, amountRupees, productId }) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    const error = new Error("Payments are temporarily unavailable. Please try again shortly.");
    error.statusCode = 503;
    error.code = "PAYMENTS_UNAVAILABLE";
    throw error;
  }

  const order = await razorpay.orders.create({
    amount: toPaise(amountRupees),
    currency: CURRENCY,
    receipt: `mkt_${productId}_${Date.now()}`.slice(0, 40),
    notes: { purpose: "marketplace_order", userId: String(userId), productId: String(productId) },
  });

  return { orderId: order.id, amount: order.amount, currency: order.currency };
};

/**
 * Best-effort refund for a marketplace payment that can no longer be
 * fulfilled — e.g. the buyer's payment verified successfully, but the last
 * unit of stock was reserved by someone else in the moment between payment
 * and order creation. Never throws: a failed refund attempt is logged
 * loudly (it needs a human to reconcile) rather than crashing the request
 * that's already reporting the failure to the buyer.
 */
const refundPayment = async (paymentId, amountRupees) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    console.error(`CRITICAL: cannot refund payment ${paymentId} — Razorpay client unavailable. Needs manual refund.`);
    return null;
  }
  try {
    return await razorpay.payments.refund(paymentId, { amount: toPaise(amountRupees) });
  } catch (error) {
    console.error(`CRITICAL: refund failed for payment ${paymentId}:`, error.message, "-- needs manual refund.");
    return null;
  }
};

module.exports = {
  INSTANT_FEE_RUPEES,
  createInstantFeeOrder,
  createMarketplaceCheckoutOrder,
  verifyPaymentSignature,
  refundPayment,
};
