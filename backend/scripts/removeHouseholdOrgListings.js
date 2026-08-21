/**
 * One-off cleanup: removes every marketplace listing owned by a
 * household/organization account, keeping only collector listings.
 *
 * WHY THIS EXISTS: selling is collector-only in this app now (see
 * marketplaceRoutes.js's `sellerOnly` gate) — household/organization can
 * browse, wishlist and buy, but never list. A handful of listings from
 * before that restriction was added were still attributed to
 * household/organization accounts (via seedMarketplace.js's old
 * round-robin, since fixed). This script cleans those up so the database
 * matches the rule the app now actually enforces.
 *
 * CASCADE — mirrors productController.deleteProduct's own cleanup exactly,
 * for the same reasons:
 *   - Cloudinary images attached to the listing are deleted (no-op safely
 *     if there are none, or if an id doesn't exist on Cloudinary's side).
 *   - Wishlist rows pointing at the listing are removed (a dangling ref
 *     wishlistController already defends against, but no reason to leave one).
 *   - MarketplaceOrder rows referencing the listing are also removed here —
 *     NOT the general policy (deleteProduct deactivates instead of deleting
 *     when real order history exists), but every order found in this pass
 *     was `paymentStatus: "test_paid"` — pre-real-payment test data, never
 *     an actual charge — so there is no real transaction being destroyed.
 *     If a genuinely paid order is ever found referencing one of these
 *     listings, this script deliberately does NOT touch it; it reports it
 *     and leaves the listing and order alone for a human to look at.
 *
 * Run standalone: node scripts/removeHouseholdOrgListings.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");
const Wishlist = require("../models/Wishlist");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const { deleteImage } = require("../services/imageUploadService");

const removeHouseholdOrgListings = async () => {
  const hhOrgUsers = await User.find({ role: { $in: ["household", "organization"] } }).select("_id name role");
  const userIds = hhOrgUsers.map((u) => u._id);

  const products = await Product.find({ sellerId: { $in: userIds } });
  if (products.length === 0) {
    console.log("ℹ️  No household/organization-owned listings found — nothing to remove.");
    return;
  }

  console.log(`Found ${products.length} listing(s) owned by household/organization accounts:`);
  for (const p of products) {
    const owner = hhOrgUsers.find((u) => u._id.toString() === p.sellerId.toString());
    console.log(`  - "${p.title}" (${owner?.name}, ${owner?.role})`);
  }

  const productIds = products.map((p) => p._id);

  // Real (non-test) orders block a listing from being touched — same
  // caution productController.deleteProduct applies, just explicit here
  // since this script deletes rather than deactivates.
  const blockingOrders = await MarketplaceOrder.find({
    productId: { $in: productIds },
    paymentStatus: { $ne: "test_paid" },
  });
  const blockedProductIds = new Set(blockingOrders.map((o) => o.productId.toString()));

  const toDelete = products.filter((p) => !blockedProductIds.has(p._id.toString()));
  const skipped = products.filter((p) => blockedProductIds.has(p._id.toString()));

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipping ${skipped.length} listing(s) with real (non-test) order history — left untouched:`);
    for (const p of skipped) console.log(`  - "${p.title}"`);
  }

  if (toDelete.length === 0) {
    console.log("\nNothing left to delete after excluding listings with real order history.");
    return;
  }

  const toDeleteIds = toDelete.map((p) => p._id);

  // Test-mode orders on the listings we ARE deleting — legacy fake-payment
  // rows with no real money behind them, cleaned up alongside the listing.
  const testOrders = await MarketplaceOrder.find({ productId: { $in: toDeleteIds }, paymentStatus: "test_paid" });
  if (testOrders.length > 0) {
    console.log(`\nRemoving ${testOrders.length} legacy test-payment order(s) tied to these listings.`);
    await MarketplaceOrder.deleteMany({ _id: { $in: testOrders.map((o) => o._id) } });
  }

  const allImages = toDelete.flatMap((p) => p.images ?? []);
  if (allImages.length > 0) {
    await Promise.all(allImages.map((img) => deleteImage(img.publicId)));
  }

  const wishlistResult = await Wishlist.deleteMany({ productId: { $in: toDeleteIds } });
  const productResult = await Product.deleteMany({ _id: { $in: toDeleteIds } });

  console.log(
    `\n✅ Deleted ${productResult.deletedCount} household/organization listing(s), ` +
      `${wishlistResult.deletedCount} wishlist row(s), and ${allImages.length} image(s) cleaned up.`
  );
};

if (require.main === module) {
  connectDB()
    .then(removeHouseholdOrgListings)
    .then(() => mongoose.disconnect())
    .catch((error) => {
      console.error("❌ Cleanup failed:", error.message);
      process.exit(1);
    });
}

module.exports = removeHouseholdOrgListings;
