/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Models Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Mongoose models will be exported from here as they are created:
 *
 * - User.js          → User schema (roles: household, organization [ngo/school/university], collector, admin)
 * - Pickup.js        → Pickup request lifecycle
 * - ScrapRate.js     → Per-category base pricing & marketplace multipliers
 * - Notification.js  → In-app notifications
 * - Organization.js  → Registered organization profiles (not yet built — Marketplace/Campaigns deferred)
 * - Material.js      → Recyclable material inventory listed by Collectors (deferred)
 * - Order.js         → Marketplace purchase orders with Razorpay payment tracking (deferred)
 * - Drive.js         → NGO collection drives (deferred)
 * - Review.js        → User ratings and feedback (deferred — pickup rating is inline on Pickup for now)
 * - Analytics.js     → Pre-aggregated sustainability metrics (deferred — computed on the fly instead, see analyticsController)
 */

const User = require("./User");
const Pickup = require("./Pickup");
const ScrapRate = require("./ScrapRate");
const Notification = require("./Notification");

module.exports = { User, Pickup, ScrapRate, Notification };
