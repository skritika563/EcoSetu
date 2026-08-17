const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Analytics Routes — /api/analytics
 * ──────────────────────────────────────────────────────────────────────────────
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/dashboard", analyticsController.getDashboardSummary);
router.get("/sustainability", analyticsController.getSustainabilityTrends);

module.exports = router;
