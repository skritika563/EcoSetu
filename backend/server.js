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

    // 1b. Seed default scrap rates if the collection is empty
    await seedScrapRates();

    // 1c. Seed starter marketplace listings if none exist
    await seedMarketplace();

    // 1d. Seed starter campaigns if none exist
    await seedCampaigns();

    // 2. Initialize Firebase Admin SDK
    initializeFirebase();

    // 3. Initialize Cloudinary SDK
    initializeCloudinary();

    // 4. Initialize Razorpay
    initializeRazorpay();

    // 5. Start HTTP Server
    app.listen(PORT, () => {
      console.log("──────────────────────────────────────────────");
      console.log("🌿 Eco Setu API Server");
      console.log(
        `   Environment : ${process.env.NODE_ENV || "development"}`
      );
      console.log(`   Port        : ${PORT}`);
      console.log(
        `   Health      : http://localhost:${PORT}/api/health`
      );
      console.log(
        `   AI          : http://localhost:${PORT}/api/ai/classify`
      );
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