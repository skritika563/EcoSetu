/**
 * ImpactSummary — four headline metrics with subtle count-up animation.
 *
 * Summary only: the full impact breakdown belongs to the Rewards module.
 * The same component serves households and organizations — only the copy
 * shifts, never the structure.
 */

import { IndianRupee, Leaf, Recycle, Sparkles } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/format";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";

const ImpactSummary = ({ impact, isOrganization = false, className }) => {
  if (!impact) return null;

  const stats = [
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
      hint: `≈ ${formatNumber(Math.max(1, Math.round(impact.co2SavedKg / 21)))} trees planted`,
    },
    {
      key: "earned",
      label: isOrganization ? "Value Recovered" : "Money Earned",
      value: impact.moneyEarned,
      format: (n) => formatCurrency(n),
      icon: IndianRupee,
      hint: "Paid at verified scrap rates",
    },
    {
      key: "points",
      label: "Eco Points",
      value: impact.ecoPoints,
      format: (n) => formatNumber(Math.round(n)),
      icon: Sparkles,
      hint: "Redeemable in Rewards",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={stat.value}
          format={stat.format}
          icon={stat.icon}
          hint={stat.hint}
          delay={index * 0.06}
        />
      ))}
    </div>
  );
};

export default ImpactSummary;
