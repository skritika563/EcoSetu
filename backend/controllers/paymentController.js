const { createInstantFeeOrder } = require("../services/razorpayService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Payment Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Currently just the instant-pickup fee order. The scrap payout itself
 * (collector → customer) stays outside Razorpay entirely — that flow is
 * unrelated and unaffected by this.
 */

/**
 * POST /api/payments/instant-fee/order
 * Role: household, organization — same as pickup creation, since this order
 * only ever leads into POST /api/pickups for an instant pickup.
 *
 * The amount is fixed server-side (razorpayService.INSTANT_FEE_RUPEES) —
 * nothing about the charge is ever accepted from the client.
 */
const createInstantFeeOrderHandler = async (req, res) => {
  try {
    const order = await createInstantFeeOrder(req.user._id);
    return res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        // Razorpay's key_id is the PUBLIC half of the credential pair — it's
        // meant to be handed to the browser to open Checkout with. The
        // secret half never leaves the backend (see config/razorpay.js).
        keyId: process.env.RAZOR_API_KEY,
      },
    });
  } catch (error) {
    console.error("Create instant fee order error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error while creating the payment order.",
      error: { code: error.code || "INTERNAL_ERROR" },
    });
  }
};

module.exports = { createInstantFeeOrderHandler };
