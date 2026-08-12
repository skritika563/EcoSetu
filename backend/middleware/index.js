/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Middleware Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Express middleware functions applied to routes.
 *
 * Future middleware:
 * - authMiddleware.js     → verifyFirebaseToken() — decode & validate Firebase ID tokens
 * - roleMiddleware.js     → Role-based access control — check user.role against allowed roles
 * - uploadMiddleware.js   → Multer config — file type/size validation, memory storage
 * - errorMiddleware.js    → Global error handler — standardized JSON error responses
 */

module.exports = {};
