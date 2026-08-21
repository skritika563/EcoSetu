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
 *
 * Not yet built (Campaigns/Admin deferred):
 * - userRoutes.js           → /api/users/*
 * - organizationRoutes.js   → /api/organizations/*
 * - driveRoutes.js          → /api/drives/* (Campaigns)
 * - reviewRoutes.js         → /api/reviews/*
 * - adminRoutes.js          → /api/admin/*
 * - messageRoutes.js        → /api/marketplace/messages/* (see
 *                             MarketplaceMessages.jsx for the documented
 *                             boundary — no fake persistence in the meantime)
 */

module.exports = {};
