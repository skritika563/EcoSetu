/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace Serializer
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Shapes Product / MarketplaceOrder documents into exactly what the frontend
 * consumes — `id` not `_id`, a denormalized `seller` object instead of a raw
 * ref, and nothing sensitive.
 *
 * SECURITY: serializeSeller is the single choke point for what a stranger
 * learns about another user. It deliberately does NOT include email, phone,
 * firebaseUid, address, or earnings — a marketplace browser sees a name, a
 * verification badge, a rating and a city, and nothing more. Adding a field
 * here exposes it to every visitor, so add deliberately.
 *
 * Mirrors the approach of services/pickupSerializer.js so both modules
 * present data to the frontend the same way.
 *
 * CITY DISPLAY: every city field is stored lowercase (see
 * utils/textNormalize.js's normalizeCity, wired into the schemas) so
 * "Bengaluru"/"BENGALURU"/"bengalore" all match each other in search and
 * filters. This is the one place that converts back to a display form
 * ("Bengaluru") on the way out — never mutates what's stored, and works on
 * any input casing so it also cleans up already-stored legacy values.
 */

const { toTitleCase } = require("../utils/textNormalize");

/** Title-cases just the `city` key of a location/address object, leaving everything else untouched. */
const withDisplayCity = (locationLike) => {
  if (!locationLike) return locationLike;
  return { ...locationLike, city: toTitleCase(locationLike.city) };
};

/**
 * @param {object} seller - a User doc, ideally with POPULATE_FIELDS.seller selected
 * @param {object} [options]
 * @param {boolean} [options.includePhone] - only true for the dedicated
 *   seller-profile endpoint (getSellerProfile), where a signed-in buyer
 *   genuinely needs a way to arrange pickup/delivery with the seller. Every
 *   other caller (product cards, browse, order listings) omits it — a
 *   phone number should never leak into a bulk listing response.
 */
const serializeSeller = (seller, { includePhone = false } = {}) => {
  if (!seller || !seller._id) return null;
  return {
    id: seller._id.toString(),
    name: seller.name,
    role: seller.role,
    verified: seller.isVerified ?? false,
    // Only collectors carry a rating today (collectorProfile.rating). For
    // everyone else this is honestly null rather than a fabricated 5 stars.
    rating: seller.role === "collector" ? (seller.collectorProfile?.rating ?? null) : null,
    city: toTitleCase(seller.address?.city) ?? null,
    profileImage: seller.profileImage ?? null,
    memberSince: seller.createdAt ?? null,
    ...(includePhone ? { phone: seller.phone ?? null } : {}),
  };
};

const serializeBuyer = (buyer) => {
  if (!buyer || !buyer._id) return null;
  return {
    id: buyer._id.toString(),
    name: buyer.name,
    role: buyer.role,
    // A seller who has an order from this buyer legitimately needs a way to
    // reach them; a random browser never sees this shape (orders are only
    // ever returned to their own buyer or seller).
    phone: buyer.phone ?? null,
  };
};

/**
 * @param {object} productDoc - a Product, ideally with sellerId populated
 * @param {object} [options]
 * @param {boolean} [options.isWishlisted] - per-viewer state, looked up separately
 * @param {boolean} [options.includeSourcePickupId] - only true when the
 *   viewer OWNS this listing (see productController.getProductById /
 *   listMyProducts) — a buyer only ever sees the honest `ecoVerified`
 *   boolean below; only the seller editing their own listing needs the raw
 *   pickup id back, to re-populate the "collected through EcoSetu?" picker
 *   on the edit form.
 */
const serializeProduct = (productDoc, { isWishlisted = false, includeSourcePickupId = false } = {}) => {
  const p = typeof productDoc.toObject === "function" ? productDoc.toObject() : productDoc;

  return {
    id: p._id.toString(),
    title: p.title,
    description: p.description,
    category: p.category,
    condition: p.condition,
    material: p.material ?? null,
    price: p.price,
    quantity: p.quantity,
    unit: p.unit ?? "piece",
    location: withDisplayCity(p.location),
    images: (p.images ?? []).map((img) => ({ url: img.url, publicId: img.publicId })),
    status: p.status,
    views: p.views ?? 0,
    fulfillment: p.fulfillment ?? { pickup: true, delivery: false },
    weightKg: p.weightKg ?? null,
    // A plain boolean, not the pickup id — the buyer has no business
    // knowing which internal pickup record backed this listing, only that
    // it came through EcoSetu's own verified collection chain.
    ecoVerified: !!p.sourcePickup,
    ...(includeSourcePickupId ? { sourcePickupId: p.sourcePickup ? p.sourcePickup.toString() : null } : {}),
    seller: serializeSeller(p.sellerId),
    // Present only when the seller ref wasn't populated (list endpoints that
    // don't need the full seller object still need to know who owns it).
    sellerId: p.sellerId?._id ? p.sellerId._id.toString() : p.sellerId?.toString?.() ?? null,
    isWishlisted,
    soldAt: p.soldAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

const serializeOrder = (orderDoc) => {
  const o = typeof orderDoc.toObject === "function" ? orderDoc.toObject() : orderDoc;

  const hasCancellation = o.cancellation && o.cancellation.reason != null;

  return {
    id: o._id.toString(),
    product: {
      // May be null if the listing was deleted — the snapshot below is what
      // keeps the order readable regardless.
      id: o.productId?._id ? o.productId._id.toString() : o.productId?.toString?.() ?? null,
      title: o.productSnapshot?.title,
      category: o.productSnapshot?.category,
      condition: o.productSnapshot?.condition ?? null,
      unit: o.productSnapshot?.unit ?? "piece",
      imageUrl: o.productSnapshot?.imageUrl ?? null,
    },
    buyer: serializeBuyer(o.buyerId),
    seller: serializeSeller(o.sellerId),
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalAmount: o.totalAmount,
    fulfillmentMethod: o.fulfillmentMethod,
    deliveryAddress: withDisplayCity(o.deliveryAddress) ?? null,
    // Only ever set for delivery orders once the seller marks them shipped.
    trackingNumber: o.trackingNumber ?? null,
    shippedAt: o.shippedAt ?? null,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    paymentReference: o.paymentReference ?? null,
    // The real, verified Razorpay payment id — safe to expose to the two
    // parties on the order (both already see everything else about it),
    // useful if either needs to reference it with support.
    razorpayPaymentId: o.payment?.razorpayPaymentId ?? null,
    statusHistory: (o.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at, note: h.note })),
    cancellation: hasCancellation
      ? {
          reason: o.cancellation.reason,
          cancelledBy: o.cancellation.cancelledBy,
          cancelledAt: o.cancellation.cancelledAt,
        }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

/** Kept in one place so every marketplace query populates identically. */
const POPULATE_FIELDS = {
  // `phone` is selected here so it is AVAILABLE to serializeSeller when it
  // needs it (includePhone: true on the dedicated seller-profile endpoint)
  // — being selected in the query is not the same as being exposed; the
  // serializer is still the only place that decides whether it goes out.
  seller: "name role isVerified collectorProfile address profileImage createdAt phone",
  buyer: "name role phone",
};

module.exports = { serializeProduct, serializeOrder, serializeSeller, POPULATE_FIELDS };
