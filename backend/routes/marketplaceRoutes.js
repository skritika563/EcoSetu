const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const wishlistController = require("../controllers/wishlistController");
const orderController = require("../controllers/marketplaceOrderController");
const aiController = require("../controllers/marketplaceAiController");
const { verifyFirebaseToken, attachUser, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadImages } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace Routes — /api/marketplace
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every route requires a verified Firebase token AND a MongoDB profile,
 * exactly like pickupRoutes.
 *
 * REVISED ACCESS MODEL: browsing, wishlisting and buying are open to every
 * role (household, organization, collector) — but SELLING is collector-only.
 * `sellerOnly` below is the single gate for every seller-side action
 * (listing CRUD, listing images, seller stats, eligible pickups for
 * provenance, AI listing assist, and viewing orders received). Ownership is
 * still re-checked inside each controller against req.user._id on top of
 * this — the role check only decides who may even ATTEMPT a seller action.
 *
 * Route ordering note: the literal paths under /products (`/sections`,
 * `/mine`) are declared BEFORE `/:id`, or Express would match "sections" as
 * an :id.
 */

const sellerOnly = authorizeRoles("collector");

router.use(verifyFirebaseToken, attachUser);

/* ─── Browse & discovery — every role ─────────────────────────────────────── */
router.get("/products/sections", productController.getProductSections);
router.get("/products/mine", sellerOnly, productController.listMyProducts);
router.get("/products", productController.listProducts);

/* ─── Seller tools — collector only (declared before /products/:id) ──────── */
router.get("/my-stats", sellerOnly, productController.getMyMarketplaceStats);
router.get("/eligible-pickups", sellerOnly, productController.listEligiblePickups);

/* ─── Listing CRUD — collector only, ownership re-checked inside ─────────── */
router.post("/products", sellerOnly, productController.createProduct);
router.get("/products/:id", productController.getProductById);
router.put("/products/:id", sellerOnly, productController.updateProduct);
router.patch("/products/:id/sold", sellerOnly, productController.markProductSold);
router.delete("/products/:id", sellerOnly, productController.deleteProduct);

/* ─── Listing images — collector only, reuses the shared Cloudinary pipeline */
router.post("/products/:id/images", sellerOnly, uploadImages("images"), productController.uploadProductImages);
router.delete("/products/:id/images/:publicId", sellerOnly, productController.deleteProductImage);

/* ─── Wishlist — every role, implicitly scoped to the caller ─────────────── */
router.get("/wishlist", wishlistController.listWishlist);
router.post("/wishlist/:productId", wishlistController.addToWishlist);
router.delete("/wishlist/:productId", wishlistController.removeFromWishlist);

/* ─── Orders — buying is every role, "received" is collector only ────────── */
router.post("/orders", orderController.createOrder);
router.get("/orders/purchases", orderController.listPurchases);
router.get("/orders/received", sellerOnly, orderController.listReceivedOrders);
router.get("/orders/:id", orderController.getOrderById);
router.patch("/orders/:id/status", orderController.updateOrderStatus);

/* ─── Payment — creating a checkout order for a purchase, every role ─────── */
router.post("/orders/checkout-order", orderController.createCheckoutOrder);

/* ─── Seller profile — viewable by every role ─────────────────────────────── */
router.get("/sellers/:id", productController.getSellerProfile);

/* ─── AI listing assist — collector only (real Gemini) ───────────────────── */
router.post("/ai/listing", sellerOnly, aiController.generateListing);

module.exports = router;
