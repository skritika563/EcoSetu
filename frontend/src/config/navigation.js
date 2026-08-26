/**
 * Navigation configuration — one source of truth for authenticated navigation.
 *
 * Consumed by the desktop Navbar, the mobile drawer and the mobile
 * BottomNavigation, so the three can never drift apart.
 *
 * `available: false` marks a destination whose module has not been built yet.
 * Those items are shown (the product needs to communicate its shape) but they
 * do not navigate — they surface a "coming soon" toast instead of a dead route.
 * Flip the flag to true and add the route when the module lands.
 */

import {
  Home,
  Truck,
  Store,
  Gift,
  Megaphone,
  ClipboardList,
  Wallet,
  ScanLine,
  Package,
  Boxes,
  CalendarPlus,
  BarChart3,
  MapPin,
} from "lucide-react";

/* ─── Primary navigation ─────────────────────────────────────────────────── */

/**
 * Household / organization share the same core product surface, Campaigns
 * included — every non-admin role can browse and join/volunteer (only
 * organization accounts can additionally create/manage, which the
 * Campaigns pages themselves gate, not this nav entry).
 */
const GENERAL_NAV = [
  { key: "home", label: "Home", to: "/", icon: Home, available: true },
  { key: "pickups", label: "Pickups", to: "/pickups", icon: Truck, available: true },
  { key: "marketplace", label: "Marketplace", to: "/marketplace", icon: Store, available: true },
  { key: "campaigns", label: "Campaigns", to: "/campaigns", icon: Megaphone, available: true },
  { key: "rewards", label: "Rewards", to: "/rewards", icon: Gift, available: false },
];

/** Organizations get the same nav as everyone else — Campaigns is already in it. */
const ORGANIZATION_NAV = GENERAL_NAV;

/**
 * Collectors get an operational surface rather than a consumer one.
 * Campaigns stays browse/join-only for this role (no create/manage), same
 * as household — the nav entry exists purely so a collector can find and
 * join a drive, not because collectors organize them.
 */
const COLLECTOR_NAV = [
  { key: "home", label: "Home", to: "/", icon: Home, available: true },
  { key: "jobs", label: "Jobs", to: "/jobs", icon: ClipboardList, available: true },
  { key: "marketplace", label: "Marketplace", to: "/marketplace", icon: Store, available: true },
  { key: "campaigns", label: "Campaigns", to: "/campaigns", icon: Megaphone, available: true },
  { key: "earnings", label: "Earnings", to: "/earnings", icon: Wallet, available: false },
];

/**
 * Primary nav for a role.
 * Admin deliberately returns [] — admins are not general users and get their
 * own surface in the Admin module.
 */
export const getPrimaryNav = (role) => {
  switch (role) {
    case "household":
      return GENERAL_NAV;
    case "organization":
      return ORGANIZATION_NAV;
    case "collector":
      return COLLECTOR_NAV;
    default:
      return [];
  }
};

/* ─── Quick actions (dashboard) ──────────────────────────────────────────── */

/**
 * `accent` picks the hover gradient — blue, purple, orange, teal (see
 * components/home/QuickActions.jsx). Four distinct hues so a row of tiles is
 * scannable at a glance; the page background is never used.
 */
const HOUSEHOLD_ACTIONS = [
  { key: "schedule", label: "Schedule Pickup", to: "/pickups/new", icon: CalendarPlus, available: true, accent: "blue" },
  { key: "marketplace", label: "Marketplace", to: "/marketplace", icon: Store, available: true, accent: "purple" },
  { key: "campaigns", label: "Nearby Campaigns", to: "/campaigns", icon: MapPin, available: true, accent: "orange" },
  { key: "scan", label: "Scan Scrap", to: "/scan", icon: ScanLine, available: false, accent: "teal" },
];

const ORGANIZATION_ACTIONS = [
  { key: "schedule", label: "Schedule Pickup", to: "/pickups/new", icon: CalendarPlus, available: true, accent: "blue" },
  { key: "marketplace", label: "Marketplace", to: "/marketplace", icon: Store, available: true, accent: "purple" },
  { key: "create-campaign", label: "Create Campaign", to: "/campaigns/new", icon: Megaphone, available: true, accent: "orange" },
  { key: "impact", label: "View Impact", to: "/rewards", icon: BarChart3, available: false, accent: "teal" },
];

const COLLECTOR_ACTIONS = [
  { key: "jobs", label: "Today's Jobs", to: "/jobs", icon: ClipboardList, available: true, accent: "blue" },
  { key: "scan", label: "Scan Scrap", to: "/scan", icon: ScanLine, available: false, accent: "purple" },
  { key: "listings", label: "My Listings", to: "/marketplace/listings", icon: Package, available: true, accent: "orange" },
  { key: "inventory", label: "Inventory", to: "/inventory", icon: Boxes, available: false, accent: "teal" },
];

export const getQuickActions = (role) => {
  switch (role) {
    case "household":
      return HOUSEHOLD_ACTIONS;
    case "organization":
      return ORGANIZATION_ACTIONS;
    case "collector":
      return COLLECTOR_ACTIONS;
    default:
      return [];
  }
};
