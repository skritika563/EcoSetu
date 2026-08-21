const mongoose = require("mongoose");
const { normalizeCity } = require("../utils/textNormalize");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * MarketplaceOrder Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * One purchase of one listing. Named MarketplaceOrder (not Order) so it can
 * never be confused with the scrap-pickup payout flow, which is a completely
 * separate, opposite-direction transaction living on models/Pickup.js.
 *
 * REFERENCES + SNAPSHOT, deliberately both:
 *   - `productId`/`buyerId`/`sellerId` are refs — the live relationships.
 *   - `productSnapshot` and `unitPrice` capture what was actually bought, at
 *     the price it was actually bought for, at that moment.
 * A seller can edit their listing's title or price, or delete it outright,
 * long after a sale. Without the snapshot, an old order would silently
 * re-render with today's price and title — i.e. the receipt would lie.
 * This is the same "snapshot, don't recompute" reasoning as Pickup's
 * contributionScore.
 *
 * Ownership rules enforced in the controller, never inferred from the body:
 *   - buyerId is always req.user._id
 *   - sellerId is always read off the Product document
 *   - a user can never buy their own listing
 */

/**
 * pending → confirmed → ready → completed, with cancelled as a branch.
 *
 * `shipped` sits between `ready` and `completed`, but ONLY applies to
 * delivery orders — a pickup order goes ready → completed directly, since
 * there is nothing to ship. STATUS_TRANSITIONS below allows both
 * `ready → shipped` and `ready → completed`; the controller narrows which
 * one is legal for a given order based on its own fulfillmentMethod, and
 * additionally requires a delivery order to pass through `shipped` before
 * `completed` (see marketplaceOrderController.updateOrderStatus).
 */
const ORDER_STATUSES = ["pending", "confirmed", "ready", "shipped", "completed", "cancelled"];

/**
 * Legal forward transitions, enforced server-side in
 * marketplaceOrderController. A client-sent status is validated against
 * this map — it is never simply written through. Fulfillment-method-specific
 * narrowing happens in the controller, not here — this map is the union of
 * both paths (pickup and delivery).
 */
const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["shipped", "completed", "cancelled"],
  shipped: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/**
 * `test_paid` predates real marketplace payments and no longer applies to
 * new orders — Razorpay is now genuinely wired in (see
 * services/razorpayService.js), so a fresh order settles as `paid`, backed
 * by a real, signature-verified payment. The value stays in the enum only
 * so historical test-mode orders created before this still deserialize
 * correctly; nothing writes it going forward.
 */
const PAYMENT_STATUSES = ["unpaid", "test_paid", "paid", "refunded"];

const productSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, default: null },
    unit: { type: String, default: "piece" },
    imageUrl: { type: String, default: null },
  },
  { _id: false }
);

/**
 * Where the order goes. Copied from the buyer's saved address at checkout
 * (see User.savedAddresses) rather than referencing it — the buyer may later
 * edit or delete that address, and a shipped order's destination must not
 * change retroactively. Same reasoning as productSnapshot above.
 */
const deliveryAddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: null },
    line: { type: String, required: true },
    // Canonical lowercase in storage (see utils/textNormalize.js). No
    // format validator here — this is a snapshot of an already-validated
    // saved address, copied at checkout AFTER payment succeeds, and
    // rejecting it at that point would leave a paid buyer stuck.
    city: { type: String, required: true, set: normalizeCity },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    contactPhone: { type: String, default: null },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const marketplaceOrderSchema = new mongoose.Schema(
  {
    // ── Parties ─────────────────────────────────────────────────────────────
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    // ── What was bought (see snapshot note above) ───────────────────────────
    productSnapshot: { type: productSnapshotSchema, required: true },

    // ── Money — every figure computed server-side ───────────────────────────
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    // ── Fulfillment ─────────────────────────────────────────────────────────
    fulfillmentMethod: { type: String, enum: ["pickup", "delivery"], required: true },
    // Required for delivery; null for a buyer-collects pickup.
    deliveryAddress: { type: deliveryAddressSchema, default: null },
    // Set only when the seller marks a DELIVERY order shipped. Free-text
    // (courier name / waybill / whatever the collector actually has) rather
    // than a structured carrier-API integration that does not exist — the
    // ask was "can the collector say whether it shipped," not real-time
    // carrier tracking.
    trackingNumber: { type: String, default: null },
    shippedAt: { type: Date, default: null },

    // ── Status ──────────────────────────────────────────────────────────────
    orderStatus: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid", index: true },
    // Legacy free-text reference from before real payments existed.
    paymentReference: { type: String, default: null },
    /**
     * The real, verified Razorpay payment behind this order. Populated only
     * after services/razorpayService.verifyMarketplacePaymentSignature
     * succeeds (see marketplaceOrderController.createOrder). The amount
     * actually charged is guaranteed by the fact that WE created the
     * Razorpay order for a server-computed total and only ever accept a
     * payment that verifies against that exact order id — mirrors the same
     * discipline as the instant-pickup fee (Pickup.instantFeePayment).
     */
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      amount: { type: Number, default: null },
      paidAt: { type: Date, default: null },
    },

    cancellation: {
      reason: { type: String, default: null },
      cancelledBy: { type: String, enum: ["buyer", "seller", null], default: null },
      cancelledAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// The two list views this collection serves: "my purchases" and "orders on
// my listings", both newest-first and both filterable by status.
marketplaceOrderSchema.index({ buyerId: 1, createdAt: -1 });
marketplaceOrderSchema.index({ sellerId: 1, createdAt: -1 });
marketplaceOrderSchema.index({ buyerId: 1, orderStatus: 1 });
marketplaceOrderSchema.index({ sellerId: 1, orderStatus: 1 });
// Sparse + unique: the same successfully-verified Razorpay payment can
// never back a second order -- same replay-protection reasoning as
// Pickup.instantFeePayment index.
marketplaceOrderSchema.index({ "payment.razorpayPaymentId": 1 }, { unique: true, sparse: true });

marketplaceOrderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
marketplaceOrderSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
marketplaceOrderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = mongoose.model("MarketplaceOrder", marketplaceOrderSchema);
