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
 *
 * Not yet built (deferred modules):
 * - Organization.js  → Registered organization profiles
 * - Review.js        → Standalone reviews (pickup rating is inline on Pickup;
 *                      seller rating currently derives from collectorProfile)
 * - Conversation.js / Message.js → Marketplace messaging (see
 *                      controllers/marketplaceMessageController.js for the
 *                      documented boundary — no fake persistence in the meantime)
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
};
