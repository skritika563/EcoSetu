const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * User Routes — /api/users
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Just the one general profile lookup for now (see userController's header
 * comment) — everything else about "users" (register/login/me) already
 * lives in authRoutes.js and stays there.
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/:id/profile", userController.getUserProfile);

module.exports = router;
