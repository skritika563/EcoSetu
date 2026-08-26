/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Eco Setu Backend — Server Entry Point
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Loads environment variables, initializes all external services, connects to
 * MongoDB, and starts the Express HTTP server.
 */

// ─── Load Environment Variables (must be first) ─────────────────────────────
require("dotenv").config();

// ─── Imports ────────────────────────────────────────────────────────────────
const app = require("./app");
const connectDB = require("./config/db");
const { initializeFirebase } = require("./config/firebase");
const { initializeCloudinary } = require("./config/cloudinary");
const { initializeGemini } = require("./config/gemini");
const { initializeRazorpay } = require("./config/razorpay");
const seedScrapRates = require("./scripts/seedScrapRates");
const seedMarketplace = require("./scripts/seedMarketplace");
const seedCampaigns = require("./scripts/seedCampaigns");

// ─── Configuration ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// ─── Startup Sequence ───────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Connect to MongoDB Atlas
    await connectDB();

    // 1b. Seed default scrap rates if the collection is empty (idempotent)
    await seedScrapRates();

    // 1c. Seed starter marketplace listings if none exist (idempotent).
    // Attributed to real users, so a fresh database still has something to
    // browse — see scripts/seedMarketplace.js.
    await seedMarketplace();

    // 1d. Seed starter campaigns if none exist (idempotent). Attributed to
    // real organization accounts — see scripts/seedCampaigns.js.
    await seedCampaigns();

    // 2. Initialize Firebase Admin SDK
    initializeFirebase();

    // 3. Initialize Cloudinary SDK
    initializeCloudinary();

    // 4. Initialize Google Gemini AI
    initializeGemini();

    // 4b. Initialize Razorpay (instant-pickup fee payments)
    initializeRazorpay();

    // 5. Start HTTP Server
    app.listen(PORT, () => {
      console.log("──────────────────────────────────────────────");
      console.log(`🌿 Eco Setu API Server`);
      console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`   Port        : ${PORT}`);
      console.log(`   Health      : http://localhost:${PORT}/api/health`);
      console.log("──────────────────────────────────────────────");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// ─── Handle Unhandled Rejections & Exceptions ───────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// ─── Launch ─────────────────────────────────────────────────────────────────
startServer();
