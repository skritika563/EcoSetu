/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Middleware Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Express middleware functions applied to routes.
 *
 * Future middleware:
 * - uploadMiddleware.js   → Multer config — file type/size validation, memory storage
 * - errorMiddleware.js    → Global error handler — standardized JSON error responses
 */

const {
  verifyFirebaseToken,
  authorizeRoles,
  attachUser,
} = require("./authMiddleware");

module.exports = {
  verifyFirebaseToken,
  authorizeRoles,
  attachUser,
};
