const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyFirebaseToken, attachUser, authorizeRoles } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Admin Routes — /api/admin
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every route is protected by the full middleware chain:
 *   verifyFirebaseToken → attachUser → authorizeRoles("admin")
 *
 * A request without a valid Firebase token returns 401.
 * A request from a non-admin user returns 403.
 * No shortcuts, no exceptions.
 */

router.use(verifyFirebaseToken, attachUser, authorizeRoles("admin"));

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/dashboard/activity", adminController.getPlatformActivity);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get("/analytics", adminController.getAnalytics);
router.get("/analytics/environmental-impact", adminController.getEnvironmentalImpact);

// ── User Management ──────────────────────────────────────────────────────────
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetails);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);

// ── Pickup Management ────────────────────────────────────────────────────────
router.get("/pickups", adminController.listAllPickups);
router.get("/pickups/:id", adminController.getPickupDetails);

// ── Marketplace Management ───────────────────────────────────────────────────
router.get("/marketplace/overview", adminController.getMarketplaceOverview);
router.get("/marketplace/products", adminController.listAllProducts);
router.patch("/marketplace/products/:id/status", adminController.updateProductStatus);

// ── Campaign Management ──────────────────────────────────────────────────────
router.get("/campaigns", adminController.listAllCampaigns);
router.patch("/campaigns/:id/status", adminController.updateCampaignStatus);

// ── Scrap Rate Management ────────────────────────────────────────────────────
router.get("/scrap-rates", adminController.listRatesAdmin);
router.patch("/scrap-rates/:id", adminController.updateRate);

// ── Notifications ────────────────────────────────────────────────────────────
router.post("/notifications/send", adminController.sendNotification);
router.get("/notifications", adminController.listPlatformNotifications);

// ── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/audit-logs", adminController.getAuditLogs);

// ── Reward Redemptions ───────────────────────────────────────────────────────
// Manual fulfilment tracking for rewards with no automated effect
// (donations, mainly — see models/Reward.js's `effect` field).
router.get("/redemptions", adminController.listRedemptions);
router.patch("/redemptions/:id/status", adminController.updateRedemptionStatus);

module.exports = router;
