/**
 * Role configuration — the single source of truth for EcoSetu roles.
 *
 * The backend enum (models/User.js) is:
 *   household | organization (+ organizationType: ngo | school | university) | collector | admin
 *
 * "Six roles" in the product spec = these four, with `organization` expanded by
 * organizationType. Never introduce ngo/school/university as top-level roles —
 * branch on `user.organizationType` instead.
 *
 * `admin` is deliberately absent from SIGNUP_ROLE_OPTIONS: admin profiles are
 * created server-side only, via the ADMIN_EMAILS allowlist.
 */

import { Home, Building2, Truck, ShieldCheck, Heart, School, GraduationCap } from "lucide-react";

/* ─── Role metadata (badges, icons, home routes) ─────────────────────────── */
export const ROLE_META = {
  household: {
    label: "Household",
    icon: Home,
    home: "/household",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  organization: {
    label: "Organization",
    icon: Building2,
    home: "/organization",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  collector: {
    label: "Collector",
    icon: Truck,
    home: "/collector",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    home: "/admin",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

/** role → dashboard route. Derived from ROLE_META so the two can never drift. */
export const ROLE_HOME_ROUTES = Object.fromEntries(
  Object.entries(ROLE_META).map(([role, meta]) => [role, meta.home])
);

/** Resolve a role's dashboard route, falling back to the site root. */
export const getRoleHome = (role) => ROLE_META[role]?.home ?? "/";

/* ─── Signup role cards ──────────────────────────────────────────────────── */
/** Selected-state styling, shared by every role card. */
export const ACTIVE_ROLE_CARD_CLASS = "border-primary bg-primary/5 ring-2 ring-primary/20";

export const SIGNUP_ROLE_OPTIONS = [
  {
    id: "household",
    label: "Household",
    description: "Schedule pickups and sell scrap from your home",
    icon: ROLE_META.household.icon,
    cardClass: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "organization",
    label: "Organization",
    description: "Run campaigns, manage bulk pickups for your institution",
    icon: ROLE_META.organization.icon,
    cardClass: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "collector",
    label: "Scrap Collector",
    description: "Accept pickup jobs, sell materials on the marketplace",
    icon: ROLE_META.collector.icon,
    cardClass: "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

/* ─── Organization sub-types ─────────────────────────────────────────────── */
export const ORG_TYPES = [
  { id: "ngo", label: "NGO", icon: Heart, description: "Non-profit organization" },
  { id: "school", label: "School", icon: School, description: "K-12 educational institution" },
  { id: "university", label: "University", icon: GraduationCap, description: "College or university" },
];
