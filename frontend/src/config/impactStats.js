/**
 * Impact stat definitions — shared by ImpactSummary.jsx's plain grid and
 * the Sustainability Dashboard's bento layout (which needs the same
 * label/value/format/hint per metric, just arranged differently, with Eco
 * Points pulled out into its own showcase card instead of a plain tile).
 *
 * Kept out of ImpactSummary.jsx itself (a component file) so both places
 * can import it without a component file also exporting a non-component
 * value, which breaks Fast Refresh.
 */

import { Activity, IndianRupee, Leaf, Recycle, Sparkles, TreePine } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/format";

export const buildImpactStats = (impact, isOrganization = false) => [
  {
    key: "recycled",
    label: "Scrap Recycled",
    value: impact.scrapRecycledKg,
    format: (n) => `${formatNumber(n, { decimals: 1 })} kg`,
    icon: Recycle,
    hint: isOrganization ? "Across all campus pickups" : "Since you joined",
  },
  {
    key: "co2",
    label: "CO₂ Saved",
    value: impact.co2SavedKg,
    format: (n) => `${formatNumber(n, { decimals: 1 })} kg`,
    icon: Leaf,
    iconClassName: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    hint: `≈ ${formatNumber(Math.max(1, Math.round(impact.co2SavedKg / 21)))} trees planted`,
  },
  {
    key: "earned",
    label: isOrganization ? "Value Recovered" : "Money Earned",
    value: impact.moneyEarned,
    format: (n) => formatCurrency(n),
    icon: IndianRupee,
    iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hint: "Paid at verified scrap rates",
  },
  {
    key: "points",
    label: "Eco Points",
    value: impact.ecoPoints,
    format: (n) => formatNumber(Math.round(n)),
    icon: Sparkles,
    iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    hint: "Redeemable in Rewards",
  },
  {
    key: "activities",
    label: "Eco Activities",
    value: impact.activities,
    format: (n) => formatNumber(Math.round(n)),
    icon: Activity,
    iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hint: "Pickups, reuse and campaigns",
  },
  {
    // A REAL count, distinct from the CO₂ tile's "≈ N trees" estimate
    // above — this one only increments when an admin actually marks a
    // "Plant a Tree" reward redemption fulfilled (see Reward.js's
    // `impactType` field and the admin Redemptions view).
    key: "treesPlanted",
    label: "Trees Planted",
    value: impact.treesPlanted ?? 0,
    format: (n) => formatNumber(Math.round(n)),
    icon: TreePine,
    iconClassName: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    hint: "Via redeemed rewards",
  },
];

export default buildImpactStats;
