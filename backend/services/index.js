/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Services Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Built:
 * - pricingService.js        → Server-side pickup pricing (ScrapRate lookup)  ✅
 * - ecoScoreService.js       → Contribution score / Eco Points formula        ✅
 * - notificationService.js   → Notification creation (fire-and-forget)       ✅
 * - pickupSerializer.js      → Pickup document → frontend contract shape     ✅
 * - imageUploadService.js    → Cloudinary upload/delete for pickup photos    ✅
 *
 * Future services:
 * - geminiService.js         → Gemini Vision API calls, classification parsing
 *                                (imageUploadService.js already produces the
 *                                real Cloudinary URLs this would consume)
 * - razorpayService.js       → Razorpay order generation & payment signature verification
 * - analyticsController.js already covers dashboard/sustainability aggregation
 *   directly via Mongoose — no separate analyticsService.js was needed.
 */

module.exports = {};
