const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Notification Routes — /api/notifications
 * ──────────────────────────────────────────────────────────────────────────────
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", notificationController.markAsRead);
router.post("/read-all", notificationController.markAllAsRead);

module.exports = router;
