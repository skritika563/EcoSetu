const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const { verifyFirebaseToken, attachUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Payment Routes — /api/payments
 * ──────────────────────────────────────────────────────────────────────────────
 */

router.use(verifyFirebaseToken, attachUser);

// POST /api/payments/instant-fee/order — create a Razorpay order for the
// fixed ₹30 instant-pickup fee, ahead of POST /api/pickups.
router.post(
  "/instant-fee/order",
  authorizeRoles("household", "organization"),
  paymentController.createInstantFeeOrderHandler
);

module.exports = router;
