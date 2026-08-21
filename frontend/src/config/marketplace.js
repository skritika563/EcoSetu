/**
 * Marketplace domain config — categories, conditions, tabs, order statuses.
 *
 * Same role as config/pickups.js: the backend only ever carries string keys
 * ("home-decor", "like-new", "ready"); every label, icon and tone is decided
 * here so wording changes never touch a screen or a data file.
 *
 * MARKETPLACE CATEGORIES ARE NOT WASTE CATEGORIES. config/domain.js's
 * WASTE_CATEGORIES describes raw scrap moving through a pickup; this list
 * describes what can be sold, which is wider (furniture, books, upcycled
 * goods). They overlap but are separate vocabularies — mirrors the same
 * split on the backend between Pickup.CATEGORIES and Product.CATEGORIES.
 */

import {
  Armchair,
  BookOpen,
  Package,
  Wrench,
  Layers,
  Newspaper,
  Laptop,
  Cpu,
  PencilRuler,
  Lamp,
  Hammer,
  Recycle,
  Boxes,
} from "lucide-react";

/* ─── Categories ─────────────────────────────────────────────────────────── */
/**
 * `tint` styles the icon chip and the image-less card fallback. Each category
 * owns one hue so a grid of mixed listings stays scannable — the same
 * reasoning as WASTE_CATEGORIES in config/domain.js, and the shared keys
 * (plastic, metal, glass, paper, e-waste) deliberately reuse that file's hues
 * so one material reads the same colour across the whole product.
 */
export const MARKETPLACE_CATEGORIES = {
  furniture: { label: "Furniture", icon: Armchair, tint: "text-amber-700 dark:text-amber-400 bg-amber-600/10" },
  books: { label: "Books", icon: BookOpen, tint: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
  plastic: { label: "Plastic", icon: Package, tint: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  metal: { label: "Metal", icon: Wrench, tint: "text-slate-600 dark:text-slate-300 bg-slate-500/10" },
  glass: { label: "Glass", icon: Layers, tint: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  paper: { label: "Paper", icon: Newspaper, tint: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  electronics: { label: "Electronics", icon: Laptop, tint: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  "e-waste": { label: "E-Waste", icon: Cpu, tint: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  stationery: { label: "Stationery", icon: PencilRuler, tint: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
  "home-decor": { label: "Home Decor", icon: Lamp, tint: "text-pink-600 dark:text-pink-400 bg-pink-500/10" },
  diy: { label: "DIY", icon: Hammer, tint: "text-orange-600 dark:text-orange-400 bg-orange-500/10" },
  upcycled: { label: "Upcycled", icon: Recycle, tint: "text-emerald-700 dark:text-emerald-400 bg-emerald-600/10" },
  others: { label: "Others", icon: Boxes, tint: "text-muted-foreground bg-muted" },
};

export const CATEGORY_KEYS = Object.keys(MARKETPLACE_CATEGORIES);

export const getMarketplaceCategory = (key) =>
  MARKETPLACE_CATEGORIES[key] ?? MARKETPLACE_CATEGORIES.others;

/* ─── Condition ──────────────────────────────────────────────────────────── */
export const CONDITIONS = {
  new: { label: "New", description: "Never used" },
  "like-new": { label: "Like New", description: "Barely used, no visible wear" },
  good: { label: "Good", description: "Used with minor signs of wear" },
  fair: { label: "Fair", description: "Well used but functional" },
  "for-parts": { label: "For Parts", description: "Not functional as-is; for recovery or repair" },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);
export const getCondition = (key) => CONDITIONS[key] ?? { label: key ?? "Unknown", description: "" };

/* ─── Navigation ─────────────────────────────────────────────────────────── */
/**
 * Marketplace's own secondary navigation — deliberately NOT added to the
 * global mobile bottom bar, which stays at four primary destinations. On
 * mobile these render as horizontally scrollable pills instead (see
 * MarketplaceTabs.jsx).
 *
 * Wishlist and Messages are deliberately NOT in this list — they're icon
 * shortcuts next to the "Marketplace" title instead (see
 * MarketplaceHeader.jsx), not full tabs of their own; they're quick
 * jump-to actions, not destinations someone spends time browsing the way
 * Purchases or Listings are.
 *
 * SELLING TABS ARE COLLECTOR-ONLY. Household and organization can buy but
 * not sell (see marketplaceRoutes.js's `sellerOnly` gate on the backend) —
 * showing "My Listings" / "Orders Received" to a role that would just hit a
 * 403 the moment they clicked in is worse than not showing it at all.
 */
const BUYER_TABS = [
  { key: "browse", label: "Browse", to: "/marketplace" },
  { key: "purchases", label: "My Purchases", to: "/marketplace/purchases" },
];

const SELLER_TABS = [
  { key: "listings", label: "My Listings", to: "/marketplace/listings" },
  { key: "orders", label: "Orders Received", to: "/marketplace/orders" },
];

/** @param {string} role */
export const getMarketplaceTabs = (role) =>
  role === "collector" ? [...BUYER_TABS.slice(0, 1), ...SELLER_TABS, ...BUYER_TABS.slice(1)] : BUYER_TABS;

/* ─── Sort options (mirrors productController.SORT_OPTIONS) ──────────────── */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "popular", label: "Most viewed" },
];

/* ─── Browse filter state ────────────────────────────────────────────────── */
/** The "nothing applied" baseline, shared by the browse page and the filter sheet. */
export const EMPTY_FILTERS = {
  condition: "all",
  city: "",
  minPrice: "",
  maxPrice: "",
  ecoVerified: false,
  sort: "newest",
};

/**
 * How many filters are actually narrowing results — drives the badge on the
 * Filters button. `sort` is excluded: it's an ordering preference, not a
 * filter, and counting it would show "1 active filter" on an untouched page.
 */
export const countActiveFilters = (filters) =>
  [
    filters.condition && filters.condition !== "all",
    !!filters.city?.trim(),
    !!filters.minPrice,
    !!filters.maxPrice,
    !!filters.ecoVerified,
  ].filter(Boolean).length;

/* ─── Listing status (seller's own view) ─────────────────────────────────── */
export const LISTING_TABS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "sold", label: "Sold" },
  { value: "inactive", label: "Inactive" },
];

/* ─── Order status ───────────────────────────────────────────────────────── */
/**
 * Marketplace orders have their own vocabulary and are NOT routed through
 * config/domain.js's getStatus() — that map is the pickup lifecycle
 * (on_the_way, collector_assigned…), which has nothing to do with a
 * marketplace order. Sharing it would force one list to carry the other's
 * states. Tones intentionally match domain.js's so badges look identical.
 */
const TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  success: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
};

const ORDER_STATUS_MAP = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "info" },
  ready: { label: "Ready", tone: "info" },
  // Only ever reached by a DELIVERY order — a pickup order goes straight
  // from ready to completed, since there is nothing to ship.
  shipped: { label: "Shipped", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const getOrderStatus = (key) => {
  const entry = ORDER_STATUS_MAP[key] ?? { label: key ?? "Unknown", tone: "neutral" };
  return { label: entry.label, className: TONES[entry.tone] };
};

const PAYMENT_STATUS_MAP = {
  unpaid: { label: "Unpaid", tone: "warning" },
  // Historical value from before real marketplace payments existed. Every
  // order created now goes straight to "paid" via a real, signature-verified
  // Razorpay charge — this label only ever shows up on an old test-mode
  // order, kept honest rather than silently reinterpreted as real.
  test_paid: { label: "Test payment (legacy)", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  refunded: { label: "Refunded", tone: "info" },
};

export const getPaymentStatusMeta = (key) => {
  const entry = PAYMENT_STATUS_MAP[key] ?? { label: key ?? "Unknown", tone: "neutral" };
  return { label: entry.label, className: TONES[entry.tone] };
};

/** Buyer-facing purchase tabs → the order statuses each one covers. */
export const PURCHASE_TABS = [
  { value: "all", label: "All", statuses: null },
  { value: "processing", label: "Processing", statuses: ["pending", "confirmed", "ready", "shipped"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

/**
 * Seller-facing received-order tabs — one per real status. `shipped` is
 * always shown (not conditioned on fulfillment method) since this is a
 * tab list across ALL of a seller's orders, mixed pickup and delivery — it
 * will simply be empty if this seller has no delivery orders in transit.
 */
export const SELLER_ORDER_TABS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "ready", label: "Ready" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * What the SELLER can move an order to next — depends on BOTH the current
 * status and the order's fulfillment method: a pickup order skips `shipped`
 * entirely (nothing to ship — the buyer collects it), a delivery order must
 * pass through it. Mirrors MarketplaceOrder.STATUS_TRANSITIONS plus the
 * fulfillment-method narrowing in marketplaceOrderController.updateOrderStatus
 * — this only decides which buttons to render; the backend re-validates
 * every transition and is the actual authority.
 *
 * `needsTracking: true` marks the one action that should prompt for an
 * optional tracking reference before submitting (see OrderDetailsPage).
 */
export const getSellerNextActions = (orderStatus, fulfillmentMethod) => {
  if (orderStatus === "pending") return [{ status: "confirmed", label: "Confirm Order" }];
  if (orderStatus === "confirmed") return [{ status: "ready", label: "Mark Ready" }];
  if (orderStatus === "ready") {
    return fulfillmentMethod === "delivery"
      ? [{ status: "shipped", label: "Mark Shipped", needsTracking: true }]
      : [{ status: "completed", label: "Mark Completed" }];
  }
  if (orderStatus === "shipped") return [{ status: "completed", label: "Mark Delivered" }];
  return [];
};

/** Cancelling is only offered before an order has been prepared for handoff. */
export const canCancelOrder = (status) => status === "pending" || status === "confirmed";

/* ─── Fulfillment ────────────────────────────────────────────────────────── */
export const FULFILLMENT_METHODS = {
  pickup: { label: "Buyer pickup", description: "Buyer collects from the seller's location" },
  delivery: { label: "Delivery", description: "Seller arranges delivery to your address" },
};
