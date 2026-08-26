/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Routes Index
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * - authRoutes.js           → /api/auth/*                                     ✅
 * - pickupRoutes.js         → /api/pickups/*                                  ✅
 * - addressRoutes.js        → /api/addresses/*                                ✅
 * - notificationRoutes.js   → /api/notifications/*                            ✅
 * - scrapRateRoutes.js      → /api/scrap-rates/* (read-only)                  ✅
 * - analyticsRoutes.js      → /api/analytics/*                                ✅
 * - paymentRoutes.js        → /api/payments/* (instant-pickup fee, Razorpay)  ✅
 * - marketplaceRoutes.js    → /api/marketplace/* (products, wishlist,
 *                             orders, seller profiles, AI listing assist)     ✅
 * - campaignRoutes.js       → /api/campaigns/* (browse/join/volunteer,
 *                             organizer management, analytics, gallery,
 *                             certificates)                                  ✅
 * - userRoutes.js           → /api/users/* (one general public profile,
 *                             shared by Marketplace's seller view and
 *                             Campaigns' participant/volunteer lookup)       ✅
 *
 * Not yet built (Admin deferred):
 * - organizationRoutes.js   → /api/organizations/*
 * - reviewRoutes.js         → /api/reviews/*
 * - adminRoutes.js          → /api/admin/*
 * - messageRoutes.js        → /api/marketplace/messages/* (see
 *                             MarketplaceMessages.jsx for the documented
 *                             boundary — no fake persistence in the meantime)
 */

module.exports = {};
