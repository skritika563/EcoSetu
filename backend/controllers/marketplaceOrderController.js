const mongoose = require("mongoose");
const Product = require("../models/Product");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const { serializeOrder, POPULATE_FIELDS } = require("../services/marketplaceSerializer");
const { calculateOrderTotal } = require("../services/marketplacePricingService");
const {
  createMarketplaceCheckoutOrder,
  verifyPaymentSignature,
  refundPayment,
} = require("../services/razorpayService");
const { notify } = require("../services/notificationService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace Order Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * SECURITY INVARIANTS (all enforced here, none trusted from the client):
 *   - buyerId  = req.user._id, always
 *   - sellerId = read off the Product document, never the body
 *   - unitPrice/totalAmount = computed by marketplacePricingService from the
 *     live product price; a body-supplied price is ignored entirely
 *   - a user can never buy their own listing
 *   - stock is decremented ATOMICALLY, so concurrent buyers cannot oversell
 *   - a REAL Razorpay payment is created and its signature verified before
 *     an order can exist at all (see createCheckoutOrder + createOrder) —
 *     mirrors the exact discipline pickupController uses for the
 *     instant-pickup fee, just with a variable amount instead of a fixed one
 *   - status transitions are validated against MarketplaceOrder's own
 *     transition map, by the party actually allowed to make them, with
 *     fulfillment-method-specific narrowing for the `shipped` stage
 */

const populateOrder = (query) =>
  query.populate("buyerId", POPULATE_FIELDS.buyer).populate("sellerId", POPULATE_FIELDS.seller);

const isBuyer = (order, userId) =>
  (order.buyerId?._id ?? order.buyerId)?.toString() === userId.toString();
const isOrderSeller = (order, userId) =>
  (order.sellerId?._id ?? order.sellerId)?.toString() === userId.toString();

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Order not found.", error: { code: "NOT_FOUND" } });

const validationError = (res, message) =>
  res.status(400).json({ success: false, message, error: { code: "VALIDATION_ERROR" } });

/**
 * Shared pre-purchase checks a listing must pass before either creating a
 * checkout order or creating the real order — kept in one place so the two
 * endpoints can never drift on what counts as a valid purchase.
 */
const validatePurchase = (product, userId, { fulfillmentMethod, deliveryAddress }) => {
  if (!product || product.status !== "active") {
    const error = new Error("Listing not found.");
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  if (product.sellerId.toString() === userId.toString()) {
    const error = new Error("You cannot buy your own listing.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  if (fulfillmentMethod && !product.fulfillment?.[fulfillmentMethod]) {
    const error = new Error(`This seller does not offer ${fulfillmentMethod} for this listing.`);
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  if (fulfillmentMethod === "delivery" && (!deliveryAddress?.line || !deliveryAddress?.city)) {
    const error = new Error("A delivery address with at least a line and city is required.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
};

/**
 * POST /api/marketplace/orders/checkout-order
 * Body: { productId, quantity, fulfillmentMethod, deliveryAddress? }
 *
 * Prices the purchase server-side and opens a REAL Razorpay order for that
 * exact total. Stock is NOT reserved here — that still happens atomically
 * at createOrder, once payment is verified. This step only needs to be
 * accurate about price and eligibility (self-purchase, fulfillment offered,
 * quantity currently in stock); a second buyer racing for the same item is
 * handled by the atomic reservation later, with a refund if payment
 * completes but stock has since run out.
 */
const createCheckoutOrder = async (req, res) => {
  try {
    const { productId, quantity = 1, fulfillmentMethod = "pickup", deliveryAddress } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });
    }
    if (!["pickup", "delivery"].includes(fulfillmentMethod)) {
      return validationError(res, "Fulfillment must be either pickup or delivery.");
    }

    const product = await Product.findById(productId);
    validatePurchase(product, req.user._id, { fulfillmentMethod, deliveryAddress });

    const { totalAmount } = calculateOrderTotal(product, quantity);

    const order = await createMarketplaceCheckoutOrder({
      userId: req.user._id.toString(),
      amountRupees: totalAmount,
      productId: product._id.toString(),
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZOR_API_KEY,
      },
    });
  } catch (error) {
    if (error.code === "VALIDATION_ERROR" || error.code === "NOT_FOUND") {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: { code: error.code },
      });
    }
    if (error.code === "PAYMENTS_UNAVAILABLE") {
      return res.status(503).json({ success: false, message: error.message, error: { code: error.code } });
    }
    console.error("Create checkout order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while starting checkout.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/marketplace/orders
 * Body: { productId, quantity, fulfillmentMethod, deliveryAddress?,
 *         razorpayOrderId, razorpayPaymentId, razorpaySignature }
 *
 * A real, verified payment is REQUIRED for every order — there is no
 * unpaid-order path. The signature is checked BEFORE stock is touched, so
 * an invalid or missing payment proof never reserves inventory. If payment
 * verifies but stock has run out in the meantime (a genuinely rare race),
 * the payment is refunded immediately rather than leaving the buyer charged
 * for nothing.
 */
const createOrder = async (req, res) => {
  const {
    productId,
    quantity = 1,
    fulfillmentMethod = "pickup",
    deliveryAddress,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });
  }
  if (!["pickup", "delivery"].includes(fulfillmentMethod)) {
    return validationError(res, "Fulfillment must be either pickup or delivery.");
  }
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(402).json({
      success: false,
      message: "Payment is required to place this order.",
      error: { code: "PAYMENT_REQUIRED" },
    });
  }

  let reservedProduct = null;
  let reservedQty = 0;

  try {
    const product = await Product.findById(productId);
    validatePurchase(product, req.user._id, { fulfillmentMethod, deliveryAddress });

    const { unitPrice, quantity: qty, totalAmount } = calculateOrderTotal(product, quantity);

    // Verify BEFORE touching stock — an invalid or forged proof must never
    // reserve inventory.
    const verified = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!verified) {
      return res.status(402).json({
        success: false,
        message: "We could not verify your payment. Please try again.",
        error: { code: "PAYMENT_VERIFICATION_FAILED" },
      });
    }

    // A quick pre-check for a clear message on the common case — the unique
    // sparse index on payment.razorpayPaymentId (see models/MarketplaceOrder.js)
    // is what actually closes the race if two requests with the same
    // payment somehow land at the same instant.
    const alreadyUsed = await MarketplaceOrder.exists({ "payment.razorpayPaymentId": razorpayPaymentId });
    if (alreadyUsed) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been used for another order.",
        error: { code: "CONFLICT" },
      });
    }

    /**
     * THE OVERSELL GUARD. Matching on `quantity: { $gte: qty }` inside the
     * same findOneAndUpdate that decrements makes the check-and-reserve a
     * single atomic operation. Two buyers racing for the last item: the
     * first matches and decrements, the second no longer matches and gets
     * null. A read-then-write would let both through.
     */
    reservedProduct = await Product.findOneAndUpdate(
      { _id: product._id, status: "active", quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }
    );

    if (!reservedProduct) {
      // The buyer already paid, but the item sold out in the moment between
      // payment and this reservation. Refund rather than leave them charged
      // for nothing.
      await refundPayment(razorpayPaymentId, totalAmount);
      return res.status(409).json({
        success: false,
        message: "That quantity sold out just as you paid — your payment has been refunded.",
        error: { code: "CONFLICT" },
      });
    }
    reservedQty = qty;

    // Selling out flips the listing to `sold` so it leaves active browse.
    if (reservedProduct.quantity === 0) {
      await Product.updateOne(
        { _id: reservedProduct._id, quantity: 0 },
        { $set: { status: "sold", soldAt: new Date() } }
      );
    }

    const order = await MarketplaceOrder.create({
      buyerId: req.user._id,
      sellerId: product.sellerId,
      productId: product._id,
      productSnapshot: {
        title: product.title,
        category: product.category,
        condition: product.condition,
        unit: product.unit,
        imageUrl: product.images?.[0]?.url ?? null,
      },
      quantity: qty,
      unitPrice,
      totalAmount,
      fulfillmentMethod,
      deliveryAddress:
        fulfillmentMethod === "delivery"
          ? {
              label: deliveryAddress.label ?? null,
              line: deliveryAddress.line,
              city: deliveryAddress.city,
              state: deliveryAddress.state ?? null,
              pincode: deliveryAddress.pincode ?? null,
              contactPhone: deliveryAddress.contactPhone ?? null,
            }
          : null,
      orderStatus: "pending",
      paymentStatus: "paid",
      payment: { razorpayOrderId, razorpayPaymentId, amount: totalAmount, paidAt: new Date() },
      statusHistory: [
        { status: "pending", at: new Date(), note: "Order placed", changedBy: req.user._id },
      ],
    });

    // Stock is committed from here on — clear the rollback marker.
    reservedProduct = null;

    const populated = await populateOrder(MarketplaceOrder.findById(order._id));

    await notify({
      userId: product.sellerId,
      type: "marketplace",
      title: "New order received",
      description: `${req.user.name} ordered ${qty} × ${product.title}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed",
      data: { order: serializeOrder(populated) },
    });
  } catch (error) {
    // COMPENSATING ROLLBACK: stock was decremented but the order never got
    // written. Put it back, or the item is silently lost from inventory.
    // (Mongo transactions would be cleaner but need a replica set; this is
    // the honest single-node equivalent, and it's why the decrement is
    // tracked in `reservedProduct` above rather than assumed.)
    if (reservedProduct && reservedQty > 0) {
      await Product.updateOne(
        { _id: reservedProduct._id },
        { $inc: { quantity: reservedQty }, $set: { status: "active", soldAt: null } }
      ).catch((rollbackError) =>
        console.error("CRITICAL: stock rollback failed:", rollbackError.message)
      );
      // Money was taken but the order was never created — refund it rather
      // than leave a paid-but-nonexistent order.
      if (razorpayPaymentId) {
        try {
          const refundAmount = reservedProduct.price * reservedQty;
          await refundPayment(razorpayPaymentId, refundAmount);
        } catch (refundCalcError) {
          console.error("CRITICAL: could not compute refund amount:", refundCalcError.message);
        }
      }
    }

    if (error.code === 11000 && error.keyPattern?.["payment.razorpayPaymentId"]) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been used for another order.",
        error: { code: "CONFLICT" },
      });
    }
    if (error.code === "VALIDATION_ERROR" || error.code === "NOT_FOUND") {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: { code: error.code },
      });
    }
    console.error("Create order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while placing your order.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/orders/purchases — orders where I am the BUYER.
 */
const listPurchases = async (req, res) => {
  try {
    const query = { buyerId: req.user._id };
    if (req.query.status && MarketplaceOrder.ORDER_STATUSES.includes(req.query.status)) {
      query.orderStatus = req.query.status;
    }

    const orders = await populateOrder(MarketplaceOrder.find(query).sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      message: "Purchases retrieved",
      data: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error("List purchases error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your purchases.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/orders/received — orders on MY listings.
 * Optional ?productId= scopes this to orders on one specific listing — used
 * by the product page's "View customer details" link, so a seller looking
 * at one item sees only that item's buyers, not their whole order queue.
 */
const listReceivedOrders = async (req, res) => {
  try {
    const query = { sellerId: req.user._id };
    if (req.query.status && MarketplaceOrder.ORDER_STATUSES.includes(req.query.status)) {
      query.orderStatus = req.query.status;
    }
    if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) {
      query.productId = req.query.productId;
    }

    const orders = await populateOrder(MarketplaceOrder.find(query).sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      message: "Orders retrieved",
      data: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error("List received orders error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your orders.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/orders/:id
 * Visible only to the two parties on the order — anyone else gets a 404,
 * indistinguishable from a nonexistent id.
 */
const getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const order = await populateOrder(MarketplaceOrder.findById(req.params.id));
    if (!order) return notFound(res);

    const buyer = isBuyer(order, req.user._id);
    const seller = isOrderSeller(order, req.user._id);
    if (!buyer && !seller) return notFound(res);

    return res.status(200).json({
      success: true,
      message: "Order retrieved",
      data: { ...serializeOrder(order), viewerRole: buyer ? "buyer" : "seller" },
    });
  } catch (error) {
    console.error("Get order error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this order.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PATCH /api/marketplace/orders/:id/status
 * Body: { status, reason?, trackingNumber? }
 *
 * WHO MAY DO WHAT:
 *   - the SELLER drives fulfillment: confirmed → ready → (shipped, delivery
 *     only) → completed
 *   - either party may cancel, but only before it is `ready`
 *
 * A delivery order MUST pass through `shipped` before `completed`; a pickup
 * order skips `shipped` entirely (there is nothing to ship — the buyer
 * collects it). Both rules are enforced here, on top of the base transition
 * map, using the order's OWN stored fulfillmentMethod — never a client claim.
 */
const updateOrderStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const { status, reason, trackingNumber } = req.body;
    if (!MarketplaceOrder.ORDER_STATUSES.includes(status)) {
      return validationError(res, "Unknown order status.");
    }

    const order = await populateOrder(MarketplaceOrder.findById(req.params.id));
    if (!order) return notFound(res);

    const buyer = isBuyer(order, req.user._id);
    const seller = isOrderSeller(order, req.user._id);
    if (!buyer && !seller) return notFound(res);

    const allowedNext = MarketplaceOrder.STATUS_TRANSITIONS[order.orderStatus] ?? [];
    if (!allowedNext.includes(status)) {
      return validationError(res, `Cannot move an order from '${order.orderStatus}' to '${status}'.`);
    }

    // Fulfillment-method-specific narrowing.
    if (status === "shipped" && order.fulfillmentMethod !== "delivery") {
      return validationError(res, "Only delivery orders can be marked shipped.");
    }
    if (status === "completed" && order.fulfillmentMethod === "delivery" && order.orderStatus !== "shipped") {
      return validationError(res, "Mark this delivery order as shipped before completing it.");
    }

    if (status === "cancelled") {
      if (order.orderStatus === "ready" || order.orderStatus === "shipped") {
        return validationError(res, "This order is already prepared and can no longer be cancelled here.");
      }
    } else if (!seller) {
      // Every non-cancel transition is the seller's to make.
      return res.status(403).json({
        success: false,
        message: "Only the seller can move this order forward.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      at: new Date(),
      note: reason?.trim() || null,
      changedBy: req.user._id,
    });

    if (status === "shipped") {
      order.shippedAt = new Date();
      if (trackingNumber?.trim()) order.trackingNumber = trackingNumber.trim().slice(0, 120);
    }

    if (status === "cancelled") {
      order.cancellation = {
        reason: reason?.trim() || "Cancelled",
        cancelledBy: buyer ? "buyer" : "seller",
        cancelledAt: new Date(),
      };
      // Return the reserved stock to the listing, and revive it if selling
      // out was what took it off the market.
      await Product.updateOne(
        { _id: order.productId },
        { $inc: { quantity: order.quantity }, $set: { status: "active", soldAt: null } }
      ).catch((err) => console.error("Stock restore on cancel failed:", err.message));

      // A cancelled order was genuinely paid for (real payment, required at
      // creation) — refund it.
      if (order.payment?.razorpayPaymentId) {
        await refundPayment(order.payment.razorpayPaymentId, order.totalAmount);
      }
    }

    await order.save();

    // Tell whichever party did not make the change.
    const recipient = buyer ? order.sellerId : order.buyerId;
    await notify({
      userId: recipient?._id ?? recipient,
      type: "marketplace",
      title: `Order ${status}`,
      description: `"${order.productSnapshot?.title}" is now ${status}.`,
    });

    const refreshed = await populateOrder(MarketplaceOrder.findById(order._id));
    return res.status(200).json({
      success: true,
      message: "Order updated",
      data: { ...serializeOrder(refreshed), viewerRole: buyer ? "buyer" : "seller" },
    });
  } catch (error) {
    console.error("Update order status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating this order.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  createCheckoutOrder,
  createOrder,
  listPurchases,
  listReceivedOrders,
  getOrderById,
  updateOrderStatus,
};
