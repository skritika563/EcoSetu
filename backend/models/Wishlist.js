const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Wishlist Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * One document per (user, product) pair rather than an array on User.
 *
 * WHY NOT A SUBDOCUMENT (unlike User.savedAddresses): a saved address is
 * self-contained data with no cross-collection relationship, so embedding it
 * costs nothing. A wishlist entry is a REFERENCE to another collection that
 * has to be populated on read, can grow without a natural bound, and needs
 * an atomic "add only if not already there" guarantee. The compound unique
 * index below gives exactly that — a double-tap on the wishlist button can
 * never create two rows, without any read-then-write race.
 */

const wishlistSchema = new mongoose.Schema(
  {
    // Always from req.user._id — never from the request body.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
);

// The uniqueness guarantee itself — one row per user/product pair.
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
// "My wishlist, newest first" — the only read shape this collection serves.
wishlistSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Wishlist", wishlistSchema);
