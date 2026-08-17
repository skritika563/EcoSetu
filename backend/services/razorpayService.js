const crypto = require("crypto");
const { getRazorpay } = require("../config/razorpay");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Razorpay Service — instant-pickup platform fee
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The ONLY place that talks to the Razorpay SDK or does signature
 * verification. The fee amount is a fixed constant here (never accepted
 * from the client) — mirrors the same "never trust a client-supplied
 * amount" rule pricingService.js applies to scrap payouts.
 *
 * Flow: order created here BEFORE the pickup exists (there's no pickup id
 * yet to attach it to) → customer pays via Razorpay Checkout in the browser
 * → the browser gets back {razorpay_order_id, razorpay_payment_id,
 * razorpay_signature} → those three values are sent to POST /api/pickups
 * alongside the booking form → pickupController verifies the signature here
 * before creating the pickup at all. A pickup is never created off an
 * unverified or missing payment for an instant pickup.
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

module.exports = { INSTANT_FEE_RUPEES, createInstantFeeOrder, verifyPaymentSignature };
