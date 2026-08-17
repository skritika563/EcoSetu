/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Middleware Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Express middleware functions applied to routes.
 *
 * uploadMiddleware.js → Multer config (memory storage, type/size/count
 * validation) — used by pickupRoutes.js for POST /api/pickups/:id/images.
 *
 * Future middleware:
 * - errorMiddleware.js    → Global error handler — standardized JSON error responses
 */

const {
  verifyFirebaseToken,
  authorizeRoles,
  attachUser,
} = require("./authMiddleware");
const { uploadImages } = require("./uploadMiddleware");

module.exports = {
  verifyFirebaseToken,
  authorizeRoles,
  attachUser,
  uploadImages,
};
