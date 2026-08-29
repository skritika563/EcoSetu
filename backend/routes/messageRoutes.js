const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Message Routes — /api/messages
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Open to every authenticated role (household, organization, collector) —
 * same as Marketplace's browsing/buying routes. There is no admin surface
 * here; admins have no chat participation. Every route requires a verified
 * Firebase token AND a MongoDB profile, exactly like marketplaceRoutes.
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/unread-count", messageController.getUnreadCount);

router.get("/conversations", messageController.listConversations);
router.post("/conversations", messageController.getOrCreateConversation);
router.get("/conversations/:id/messages", messageController.getMessages);
router.post("/conversations/:id/messages", messageController.sendMessage);
router.patch("/conversations/:id/read", messageController.markConversationRead);

module.exports = router;
