/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Models Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Built:
 * - User.js              → User schema (roles: household, organization [ngo/school/university], collector, admin)
 * - Pickup.js            → Pickup request lifecycle
 * - ScrapRate.js         → Per-category base pricing for scrap payouts
 * - Notification.js      → In-app notifications
 * - Product.js           → Marketplace listing (any role can sell; any role can buy)
 * - Wishlist.js          → Per-user saved products (one doc per user/product pair)
 * - MarketplaceOrder.js  → Marketplace purchase orders
 * - Campaign.js          → NGO/School/University collection drives
 * - CampaignParticipant.js → Join record for both participants and volunteers
 *                            (participationType discriminates the two)
 * - Certificate.js       → Issued campaign-participation certificates
 * - AdminAuditLog.js     → Append-only admin action audit trail
 * - Conversation.js      → 1:1 direct-message thread (Marketplace + Campaigns only)
 * - Message.js           → One message inside a Conversation
 *
 * Not yet built (deferred modules):
 * - Organization.js  → Registered organization profiles
 * - Review.js        → Standalone reviews (pickup rating is inline on Pickup;
 *                      seller rating currently derives from collectorProfile)
 * - Analytics.js     → Pre-aggregated metrics (computed on the fly instead,
 *                      see analyticsController)
 */

const User = require("./User");
const Pickup = require("./Pickup");
const ScrapRate = require("./ScrapRate");
const Notification = require("./Notification");
const Product = require("./Product");
const Wishlist = require("./Wishlist");
const MarketplaceOrder = require("./MarketplaceOrder");
const Campaign = require("./Campaign");
const CampaignParticipant = require("./CampaignParticipant");
const Certificate = require("./Certificate");
const AdminAuditLog = require("./AdminAuditLog");
const Conversation = require("./Conversation");
const Message = require("./Message");

module.exports = {
  User,
  Pickup,
  ScrapRate,
  Notification,
  Product,
  Wishlist,
  MarketplaceOrder,
  Campaign,
  CampaignParticipant,
  Certificate,
  AdminAuditLog,
  Conversation,
  Message,
};

