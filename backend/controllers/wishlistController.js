const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { serializeProduct, POPULATE_FIELDS } = require("../services/marketplaceSerializer");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Wishlist Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every query is scoped to req.user._id, so one user can never read or
 * modify another's wishlist — the same structural guarantee
 * addressController relies on. There is no :userId anywhere in these routes.
 *
 * Persistence is in MongoDB, not localStorage: a wishlist survives reloads,
 * sign-outs and device changes.
 */

/** GET /api/marketplace/wishlist */
const listWishlist = async (req, res) => {
  try {
    const entries = await Wishlist.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "productId",
        populate: { path: "sellerId", select: POPULATE_FIELDS.seller },
      });

    // A wishlisted listing can be hard-deleted by its seller, leaving a
    // dangling ref. Filter those out rather than rendering a broken card —
    // productController.deleteProduct cleans them up, but this stays
    // defensive against any row that slipped through.
    //
    // Sold-out and out-of-stock listings are also left out of the response
    // (not deleted from the Wishlist collection — if the seller restocks or
    // relists, it reappears here on its own).
    const products = entries
      .filter((entry) => entry.productId && entry.productId.status === "active" && entry.productId.quantity > 0)
      .map((entry) => serializeProduct(entry.productId, { isWishlisted: true }));

    return res.status(200).json({ success: true, message: "Wishlist retrieved", data: products });
  } catch (error) {
    console.error("List wishlist error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your wishlist.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** POST /api/marketplace/wishlist/:productId */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });
    }

    const product = await Product.findById(productId).select("_id");
    if (!product) {
      return res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });
    }

    // Upsert rather than check-then-insert: the unique compound index makes
    // this idempotent, so a double-tap can't create a duplicate row or 500.
    await Wishlist.updateOne(
      { userId: req.user._id, productId: product._id },
      { $setOnInsert: { userId: req.user._id, productId: product._id } },
      { upsert: true }
    );

    return res.status(201).json({
      success: true,
      message: "Added to wishlist",
      data: { productId: product._id.toString(), isWishlisted: true },
    });
  } catch (error) {
    // Duplicate key means it was already wishlisted — the desired end state,
    // so report success rather than an error the user can't act on.
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "Already in wishlist",
        data: { productId: req.params.productId, isWishlisted: true },
      });
    }
    console.error("Add to wishlist error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating your wishlist.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** DELETE /api/marketplace/wishlist/:productId */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });
    }

    // Scoped to this user — a crafted productId can only ever remove the
    // caller's own row.
    await Wishlist.deleteOne({ userId: req.user._id, productId });

    return res.status(200).json({
      success: true,
      message: "Removed from wishlist",
      data: { productId, isWishlisted: false },
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating your wishlist.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { listWishlist, addToWishlist, removeFromWishlist };
