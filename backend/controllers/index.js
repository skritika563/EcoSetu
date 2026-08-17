/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Controllers Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * - authController.js         → Register, login, logout, me                    ✅
 * - pickupController.js       → Pickup lifecycle management                    ✅
 * - addressController.js      → Saved pickup addresses CRUD                    ✅
 * - notificationController.js → Notification list/read                        ✅
 * - scrapRateController.js    → Base rates (read-only for now)                 ✅
 * - analyticsController.js    → Dashboard + sustainability aggregation         ✅
 * - pickupController.uploadPickupImages → Real Cloudinary image upload,
 *   POST /api/pickups/:id/images (see services/imageUploadService.js)         ✅
 *
 * Not yet built (Marketplace/Campaigns/Admin deferred — see integration audit):
 * - userController.js         → Profile CRUD, role queries
 * - organizationController.js → Org registration, browsing
 * - materialController.js     → Collector marketplace inventory CRUD
 * - orderController.js        → Marketplace buy orders & Razorpay payment verification
 * - driveController.js        → NGO collection drives CRUD & participation
 * - aiController.js           → AI classification orchestration (Gemini is
 *                                configured but not yet wired. Cloudinary
 *                                upload IS real now — uploaded pickup images
 *                                have real secure URLs, which is exactly what
 *                                a future Gemini call would need as input.
 *                                Classification itself is still the mocked
 *                                lib/scrapClassification.js on the frontend.)
 * - reviewController.js       → Standalone review CRUD (pickup rating is
 *                                inline on Pickup for now)
 * - adminController.js        → Admin operations
 */

module.exports = {};
