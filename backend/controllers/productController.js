const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Wishlist = require("../models/Wishlist");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const { serializeProduct, serializeSeller, POPULATE_FIELDS } = require("../services/marketplaceSerializer");
const { uploadImageBuffer, deleteImage } = require("../services/imageUploadService");
const { MAX_IMAGES_PER_PICKUP } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Product Controller — Marketplace listings
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Follows the same conventions as pickupController.js:
 *   - ownership is always re-checked server-side against req.user._id
 *   - a resource a stranger shouldn't know exists returns 404, not 403
 *   - nothing about identity or price is ever read from the request body
 *
 * The marketplace is open to every authenticated role — household,
 * organization and collector all browse, buy and sell through these same
 * endpoints. Role is never used to gate marketplace access; only ownership is.
 */

const VALID_CATEGORIES = Product.CATEGORIES;
const VALID_CONDITIONS = Product.CONDITIONS;

/**
 * Pickup material categories (constants/categories.js's SCRAP_CATEGORIES)
 * and marketplace listing categories (Product.CATEGORIES) are DIFFERENT
 * vocabularies — a pickup deals in raw scrap materials (plus, since the
 * 13-category expansion, some reusable-goods categories too), a listing has
 * its own broader taxonomy (includes "diy"/"upcycled"/"electronics", which
 * have no pickup equivalent). Where they genuinely overlap, this maps one
 * onto the other so a listing created from a real completed pickup can be
 * pre-filled honestly. Most of the 13 pickup categories are identical keys
 * in both vocabularies; `cardboard` maps to `paper` (closest real material),
 * `wooden` to `diy` (raw wood is classic DIY/upcycling material — there's no
 * dedicated "wood" listing category), `decorations` to `home-decor`
 * (closest real match), and `others` to `others`.
 */
const PICKUP_TO_PRODUCT_CATEGORY = {
  plastic: "plastic",
  metal: "metal",
  paper: "paper",
  cardboard: "paper",
  glass: "glass",
  "e-waste": "e-waste",
  wooden: "diy",
  decorations: "home-decor",
  furniture: "furniture",
  books: "books",
  stationery: "stationery",
  "home-decor": "home-decor",
  others: "others",
};

/**
 * Given a completed pickup's verified categories (each with a weight),
 * suggest the single dominant marketplace category — the one with the most
 * weight actually collected, not just the first one listed.
 */
const suggestCategoryFromPickup = (verifiedCategories = []) => {
  if (verifiedCategories.length === 0) return null;
  const dominant = [...verifiedCategories].sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
  return PICKUP_TO_PRODUCT_CATEGORY[dominant.category] ?? "others";
};

const isSeller = (product, userId) => {
  const sellerId = product.sellerId?._id ?? product.sellerId;
  return sellerId?.toString() === userId.toString();
};

const validationError = (res, message) =>
  res.status(400).json({ success: false, message, error: { code: "VALIDATION_ERROR" } });

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Listing not found.", error: { code: "NOT_FOUND" } });

/** Marks which of a page of products the CURRENT viewer has wishlisted. */
const withWishlistState = async (products, userId) => {
  if (products.length === 0) return [];
  const ids = products.map((p) => p._id);
  const wishlisted = await Wishlist.find({ userId, productId: { $in: ids } }).select("productId");
  const wishlistedSet = new Set(wishlisted.map((w) => w.productId.toString()));
  return products.map((p) => serializeProduct(p, { isWishlisted: wishlistedSet.has(p._id.toString()) }));
};

/**
 * Shared parser for browse filters. Everything here is optional — an
 * unfiltered call is a valid "show me the marketplace".
 */
const buildBrowseQuery = (req) => {
  const { search, category, city, condition, minPrice, maxPrice, ecoVerified } = req.query;

  // Only ever `active` for public browsing — drafts, sold and paused
  // listings belong to their seller's own "My Listings" view, not here.
  const query = { status: "active" };

  if (category && VALID_CATEGORIES.includes(category)) query.category = category;
  if (condition && VALID_CONDITIONS.includes(condition)) query.condition = condition;
  if (city) query["location.city"] = new RegExp(`^${city.trim()}$`, "i");
  if (ecoVerified === "true") query.sourcePickup = { $ne: null };

  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    query.price = {};
    if (!Number.isNaN(min)) query.price.$gte = min;
    if (!Number.isNaN(max)) query.price.$lte = max;
  }

  if (search?.trim()) {
    // Regex rather than $text: it matches partial words ("chai" → "chair"),
    // which is what a marketplace search box is expected to do. Escaped so a
    // user typing "(" can't throw an invalid-regex error.
    const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    query.$or = [{ title: rx }, { description: rx }, { material: rx }, { "location.city": rx }];
  }

  return query;
};

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  "price-low": { price: 1 },
  "price-high": { price: -1 },
  popular: { views: -1, createdAt: -1 },
};

/**
 * GET /api/marketplace/products
 * Role: any authenticated user. Browse/search/filter active listings.
 */
const listProducts = async (req, res) => {
  try {
    const query = buildBrowseQuery(req);
    const sort = SORT_OPTIONS[req.query.sort] ?? SORT_OPTIONS.newest;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sellerId", POPULATE_FIELDS.seller),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products retrieved",
      data: {
        products: await withWishlistState(products, req.user._id),
        pagination: { page, limit, total, hasMore: page * limit < total },
      },
    });
  } catch (error) {
    console.error("List products error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading listings.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/products/sections
 * The Browse landing page's curated rows. Every section is a plain, honest
 * database query — deliberately NOT a fabricated recommendation engine:
 *   featured  — eco-verified listings (real provenance, genuinely notable)
 *   recent    — newest first
 *   nearby    — same city as the viewer's profile address (omitted if unknown)
 *   underFive — price <= 500
 *   trending  — most-viewed
 * "Recommended" is intentionally absent: with no interaction history to
 * base it on, it would just be another arbitrary sort wearing a smarter name.
 */
const getProductSections = async (req, res) => {
  try {
    const base = { status: "active" };
    const limit = 8;
    const viewerCity = req.user.address?.city ?? null;

    const [featured, recent, underFive, trending, nearby] = await Promise.all([
      Product.find({ ...base, sourcePickup: { $ne: null } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("sellerId", POPULATE_FIELDS.seller),
      Product.find(base).sort({ createdAt: -1 }).limit(limit).populate("sellerId", POPULATE_FIELDS.seller),
      Product.find({ ...base, price: { $lte: 500 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("sellerId", POPULATE_FIELDS.seller),
      Product.find({ ...base, views: { $gt: 0 } })
        .sort({ views: -1 })
        .limit(limit)
        .populate("sellerId", POPULATE_FIELDS.seller),
      viewerCity
        ? Product.find({ ...base, "location.city": new RegExp(`^${viewerCity}$`, "i") })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("sellerId", POPULATE_FIELDS.seller)
        : Promise.resolve([]),
    ]);

    const [featuredS, recentS, underFiveS, trendingS, nearbyS] = await Promise.all([
      withWishlistState(featured, req.user._id),
      withWishlistState(recent, req.user._id),
      withWishlistState(underFive, req.user._id),
      withWishlistState(trending, req.user._id),
      withWishlistState(nearby, req.user._id),
    ]);

    return res.status(200).json({
      success: true,
      message: "Marketplace sections retrieved",
      data: {
        featured: featuredS,
        recent: recentS,
        nearby: nearbyS,
        underFive: underFiveS,
        trending: trendingS,
        viewerCity,
      },
    });
  } catch (error) {
    console.error("Get product sections error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading the marketplace.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/products/mine
 * The seller's own listings — the only place drafts/inactive/sold are visible.
 */
const listMyProducts = async (req, res) => {
  try {
    const query = { sellerId: req.user._id };
    if (req.query.status && Product.STATUSES.includes(req.query.status)) {
      query.status = req.query.status;
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(200).json({
      success: true,
      message: "Listings retrieved",
      // Every listing here belongs to the caller, so it is always safe (and
      // necessary, for the edit form) to include the raw source pickup id.
      data: products.map((p) => serializeProduct(p, { includeSourcePickupId: true })),
    });
  } catch (error) {
    console.error("List my products error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your listings.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/products/:id
 * Increments `views` — but only for someone other than the seller, so a
 * seller refreshing their own listing doesn't inflate its view count.
 */
const getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id).populate("sellerId", POPULATE_FIELDS.seller);
    if (!product) return notFound(res);

    const owner = isSeller(product, req.user._id);

    // A draft/inactive listing is only visible to its own seller.
    if (!owner && product.status !== "active" && product.status !== "sold") {
      return notFound(res);
    }

    if (!owner) {
      // Fire-and-forget: a failed view count must never fail the page load.
      Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch((err) =>
        console.error("View increment failed:", err.message)
      );
    }

    const wishlisted = await Wishlist.exists({ userId: req.user._id, productId: product._id });

    return res.status(200).json({
      success: true,
      message: "Listing retrieved",
      data: {
        ...serializeProduct(product, { isWishlisted: !!wishlisted, includeSourcePickupId: owner }),
        isOwner: owner,
      },
    });
  } catch (error) {
    console.error("Get product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this listing.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * Provenance is EARNED, not claimed: the referenced pickup must exist, be
 * completed, and belong to THIS user as its collector. Anything else
 * silently drops the link rather than trusting the client's assertion —
 * used by both createProduct and updateProduct so the rule can never drift
 * between them.
 * @returns {Promise<import("mongoose").Types.ObjectId | null>}
 */
const resolveSourcePickup = async (sourcePickupId, userId) => {
  if (!sourcePickupId || !mongoose.isValidObjectId(sourcePickupId)) return null;
  const pickup = await Pickup.findOne({
    _id: sourcePickupId,
    collectorId: userId,
    status: "completed",
  }).select("_id");
  return pickup?._id ?? null;
};

/** Shared field validation for create + update. Returns an error string or null. */
const validateListingFields = ({ title, description, category, condition, price, quantity, location }) => {
  if (!title?.trim() || title.trim().length < 3) return "Title must be at least 3 characters.";
  if (!description?.trim() || description.trim().length < 10) return "Description must be at least 10 characters.";
  if (!VALID_CATEGORIES.includes(category)) return `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`;
  if (!VALID_CONDITIONS.includes(condition)) return `Condition must be one of: ${VALID_CONDITIONS.join(", ")}.`;
  if (price == null || Number.isNaN(Number(price)) || Number(price) < 0) return "Price must be zero or more.";
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return "Quantity must be a whole number of at least 1.";
  if (!location?.city?.trim()) return "Location city is required.";
  return null;
};

/**
 * POST /api/marketplace/products
 * Role: any authenticated user. sellerId always comes from the token.
 */
const createProduct = async (req, res) => {
  try {
    const {
      title, description, category, condition, material,
      price, quantity, unit, location, weightKg,
      fulfillment, status, sourcePickupId,
    } = req.body;

    const invalid = validateListingFields({ title, description, category, condition, price, quantity, location });
    if (invalid) return validationError(res, invalid);

    const sourcePickup = await resolveSourcePickup(sourcePickupId, req.user._id);

    const product = await Product.create({
      sellerId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category,
      condition,
      material: material?.trim() || null,
      price: Number(price),
      quantity: Number(quantity),
      unit: unit === "kg" ? "kg" : "piece",
      location: {
        city: location.city.trim(),
        area: location.area?.trim() || null,
        state: location.state?.trim() || null,
        pincode: location.pincode?.trim() || null,
      },
      weightKg: weightKg != null && !Number.isNaN(Number(weightKg)) ? Number(weightKg) : null,
      fulfillment: {
        pickup: fulfillment?.pickup !== false,
        delivery: !!fulfillment?.delivery,
      },
      // Only draft or active can be set at creation — `sold` has to be
      // earned through an actual sale, not declared.
      status: status === "draft" ? "draft" : "active",
      sourcePickup,
    });

    await product.populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(201).json({
      success: true,
      message: "Listing created",
      data: serializeProduct(product, { includeSourcePickupId: true }),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details: Object.values(error.errors).map((e) => e.message) },
      });
    }
    console.error("Create product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating your listing.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PUT /api/marketplace/products/:id
 * Owner only — enforced against req.user._id, never a body field.
 */
const updateProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id);
    if (!product || !isSeller(product, req.user._id)) return notFound(res);

    if (product.status === "sold") {
      return validationError(res, "A sold listing can no longer be edited.");
    }

    const {
      title, description, category, condition, material,
      price, quantity, unit, location, weightKg, fulfillment, status, sourcePickupId,
    } = req.body;

    // Validate against the MERGED result, so a partial update can't sneak an
    // invalid value past by simply omitting a sibling field.
    const merged = {
      title: title ?? product.title,
      description: description ?? product.description,
      category: category ?? product.category,
      condition: condition ?? product.condition,
      price: price ?? product.price,
      quantity: quantity ?? product.quantity,
      location: location ?? product.location,
    };
    const invalid = validateListingFields(merged);
    if (invalid) return validationError(res, invalid);

    product.title = merged.title.trim();
    product.description = merged.description.trim();
    product.category = merged.category;
    product.condition = merged.condition;
    product.price = Number(merged.price);
    product.quantity = Number(merged.quantity);
    if (material !== undefined) product.material = material?.trim() || null;
    if (unit !== undefined) product.unit = unit === "kg" ? "kg" : "piece";
    if (weightKg !== undefined) {
      product.weightKg = weightKg != null && !Number.isNaN(Number(weightKg)) ? Number(weightKg) : null;
    }
    if (location) {
      product.location = {
        city: location.city.trim(),
        area: location.area?.trim() || null,
        state: location.state?.trim() || null,
        pincode: location.pincode?.trim() || null,
      };
    }
    if (fulfillment) {
      product.fulfillment = {
        pickup: fulfillment.pickup !== false,
        delivery: !!fulfillment.delivery,
      };
    }
    // `sold` is excluded here on purpose — it goes through markSold, which
    // is explicit about what it means.
    if (status && ["draft", "active", "inactive"].includes(status)) {
      product.status = status;
    }
    // Only touched when the key is present at all — omitting it leaves an
    // existing provenance link alone. An explicit empty/invalid value
    // clears it (e.g. the seller picking "Not from a pickup" in the edit
    // form); a valid, owned, completed pickup id sets it — same earned-not-
    // claimed rule as creation, re-checked here rather than trusted from
    // whatever the listing already had.
    if (sourcePickupId !== undefined) {
      product.sourcePickup = await resolveSourcePickup(sourcePickupId, req.user._id);
    }

    await product.save();
    await product.populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(200).json({ success: true, message: "Listing updated", data: serializeProduct(product, { includeSourcePickupId: true }) });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details: Object.values(error.errors).map((e) => e.message) },
      });
    }
    console.error("Update product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating your listing.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PATCH /api/marketplace/products/:id/sold — owner only.
 */
const markProductSold = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id);
    if (!product || !isSeller(product, req.user._id)) return notFound(res);

    product.status = "sold";
    product.soldAt = new Date();
    await product.save();
    await product.populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(200).json({ success: true, message: "Listing marked as sold", data: serializeProduct(product, { includeSourcePickupId: true }) });
  } catch (error) {
    console.error("Mark sold error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating your listing.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * DELETE /api/marketplace/products/:id — owner only.
 *
 * A listing with order history is RETIRED (status → inactive), not deleted:
 * hard-deleting it would orphan the product ref on every past order. The
 * order's own snapshot keeps it readable either way, but keeping the
 * document means "view product" from an old order still resolves.
 */
const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id);
    if (!product || !isSeller(product, req.user._id)) return notFound(res);

    const hasOrders = await MarketplaceOrder.exists({ productId: product._id });

    if (hasOrders) {
      product.status = "inactive";
      await product.save();
      return res.status(200).json({
        success: true,
        message: "This listing has order history, so it was deactivated rather than deleted.",
        data: { deleted: false, deactivated: true },
      });
    }

    // Clean up the Cloudinary assets and any wishlist entries pointing at a
    // listing that's about to stop existing.
    await Promise.all((product.images ?? []).map((img) => deleteImage(img.publicId)));
    await Wishlist.deleteMany({ productId: product._id });
    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Listing deleted",
      data: { deleted: true, deactivated: false },
    });
  } catch (error) {
    console.error("Delete product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting your listing.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/marketplace/products/:id/images — owner only.
 * Reuses the SAME Cloudinary service the pickups module uses
 * (services/imageUploadService.js) — no second image pipeline.
 */
const uploadProductImages = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id);
    if (!product || !isSeller(product, req.user._id)) return notFound(res);

    const files = req.files || [];
    if (files.length === 0) return validationError(res, "Attach at least one image.");

    const existingCount = product.images?.length ?? 0;
    if (existingCount + files.length > MAX_IMAGES_PER_PICKUP) {
      return validationError(
        res,
        `A listing can have at most ${MAX_IMAGES_PER_PICKUP} images (${existingCount} already saved).`
      );
    }

    const folder = `ecosetu/marketplace/${product._id}`;
    const uploaded = [];
    try {
      // Sequential so a mid-batch failure leaves a known set to roll back —
      // same reasoning as pickupController.uploadPickupImages.
      for (let i = 0; i < files.length; i++) {
        const result = await uploadImageBuffer(files[i].buffer, {
          folder,
          publicId: `img_${Date.now()}_${i}`,
        });
        uploaded.push(result);
      }
    } catch (uploadError) {
      await Promise.all(uploaded.map((img) => deleteImage(img.publicId)));
      throw uploadError;
    }

    product.images = [...(product.images ?? []), ...uploaded];

    try {
      await product.save();
    } catch (saveError) {
      // Cloudinary succeeded but Mongo didn't — roll back so the two don't disagree.
      await Promise.all(uploaded.map((img) => deleteImage(img.publicId)));
      throw saveError;
    }

    await product.populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(201).json({
      success: true,
      message: "Images uploaded",
      data: { imageUrls: product.images.map((i) => i.url), product: serializeProduct(product, { includeSourcePickupId: true }) },
    });
  } catch (error) {
    console.error("Upload product images error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading images.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * DELETE /api/marketplace/products/:id/images/:publicId — owner only.
 * publicId arrives URL-encoded (it contains slashes).
 */
const deleteProductImage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const product = await Product.findById(req.params.id);
    if (!product || !isSeller(product, req.user._id)) return notFound(res);

    const publicId = decodeURIComponent(req.params.publicId);
    const exists = (product.images ?? []).some((img) => img.publicId === publicId);
    if (!exists) return validationError(res, "That image isn't on this listing.");

    product.images = product.images.filter((img) => img.publicId !== publicId);
    await product.save();
    await deleteImage(publicId);
    await product.populate("sellerId", POPULATE_FIELDS.seller);

    return res.status(200).json({ success: true, message: "Image removed", data: serializeProduct(product, { includeSourcePickupId: true }) });
  } catch (error) {
    console.error("Delete product image error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing the image.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/sellers/:id
 * Public seller profile — deliberately a SIMPLE contact card, not a second
 * storefront: name, verification, rating and phone (so a buyer can arrange
 * pickup/delivery), plus a bio slot for later. Does NOT list this seller's
 * active listings or sales stats — a buyer clicking through from a product
 * is looking for "who is this person," not another product grid to browse
 * (that's what Browse itself is for).
 */
const getSellerProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Seller not found.", error: { code: "NOT_FOUND" } });
    }

    const seller = await User.findById(req.params.id).select(POPULATE_FIELDS.seller);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found.", error: { code: "NOT_FOUND" } });
    }

    return res.status(200).json({
      success: true,
      message: "Seller profile retrieved",
      data: {
        seller: serializeSeller(seller, { includePhone: true }),
        bio: seller.bio ?? null,
      },
    });
  } catch (error) {
    console.error("Get seller profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this seller.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/my-stats
 * Backs the seller summary panel (prominent for collectors, available to
 * every role). Real aggregates only.
 */
const getMyMarketplaceStats = async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [salesAgg, activeListings, pendingOrders, itemsSold] = await Promise.all([
      MarketplaceOrder.aggregate([
        {
          $match: {
            sellerId: req.user._id,
            orderStatus: { $in: ["confirmed", "ready", "completed"] },
            createdAt: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Product.countDocuments({ sellerId: req.user._id, status: "active" }),
      MarketplaceOrder.countDocuments({ sellerId: req.user._id, orderStatus: "pending" }),
      MarketplaceOrder.countDocuments({ sellerId: req.user._id, orderStatus: "completed" }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Marketplace stats retrieved",
      data: {
        salesThisMonth: Math.round((salesAgg[0]?.total ?? 0) * 100) / 100,
        activeListings,
        pendingOrders,
        itemsSold,
      },
    });
  } catch (error) {
    console.error("Get marketplace stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your marketplace stats.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/marketplace/eligible-pickups
 * Completed pickups this collector handled, offered as provenance sources
 * when creating a listing. Empty for any role that has never collected —
 * which is correct, not a bug.
 */
const listEligiblePickups = async (req, res) => {
  try {
    const pickups = await Pickup.find({ collectorId: req.user._id, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(20)
      .select("_id completedAt verifiedCategories totalAmount");

    return res.status(200).json({
      success: true,
      message: "Eligible pickups retrieved",
      data: pickups.map((p) => ({
        id: p._id.toString(),
        completedAt: p.completedAt,
        categories: (p.verifiedCategories ?? []).map((c) => c.category),
        totalWeightKg:
          Math.round((p.verifiedCategories ?? []).reduce((sum, c) => sum + (c.weightKg ?? 0), 0) * 10) / 10,
        // The marketplace category this pickup's material maps to — the
        // frontend auto-fills the listing form's category field with this
        // the moment a source pickup is selected (still editable after).
        suggestedCategory: suggestCategoryFromPickup(p.verifiedCategories),
      })),
    });
  } catch (error) {
    console.error("List eligible pickups error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your completed pickups.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  listProducts,
  getProductSections,
  listMyProducts,
  getProductById,
  createProduct,
  updateProduct,
  markProductSold,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  getSellerProfile,
  getMyMarketplaceStats,
  listEligiblePickups,
};
