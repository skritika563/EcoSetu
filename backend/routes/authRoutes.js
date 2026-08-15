const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const {
  verifyFirebaseToken,
  attachUser,
} = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth Routes — /api/auth
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * All routes require a valid Firebase ID token (verifyFirebaseToken).
 * The register and login routes handle user lookup themselves.
 * The me route uses attachUser middleware to load the full profile.
 *
 * Source: API_SPEC.md §3.1
 */

// POST /api/auth/register — Create MongoDB user for a new Firebase user
router.post("/register", verifyFirebaseToken, authController.register);

// POST /api/auth/login — Sync Firebase session, return MongoDB profile
router.post("/login", verifyFirebaseToken, authController.login);

// POST /api/auth/bootstrap-admin — Secure admin MongoDB profile creation (allowlist)
router.post(
  "/bootstrap-admin",
  verifyFirebaseToken,
  authController.bootstrapAdmin
);

// GET /api/auth/me — Get current user's profile
router.get("/me", verifyFirebaseToken, attachUser, authController.getMe);

// POST /api/auth/logout — Clear server-side session
router.post("/logout", verifyFirebaseToken, authController.logout);

module.exports = router;
