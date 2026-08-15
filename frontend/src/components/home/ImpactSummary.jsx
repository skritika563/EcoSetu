/**
 * ImpactSummary — headline impact metrics with subtle count-up animation.
 *
 * The same component serves households, organizations and collectors — only
 * the copy shifts, never the structure.
 *
 * `metrics` selects which tiles to show, so the Sustainability Dashboard can
 * lead with eco activity while other surfaces lead with money recovered.
 * Defaults preserve the original four-tile behaviour.
 */

import { Activity, IndianRupee, Leaf, Recycle, Sparkles } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/format";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";

const DEFAULT_METRICS = ["recycled", "co2", "earned", "points"];

const ImpactSummary = ({
  impact,
  isOrganization = false,
  metrics = DEFAULT_METRICS,
  className,
}) => {
  if (!impact) return null;

  const allStats = [
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
  ];

  const stats = metrics
    .map((key) => allStats.find((stat) => stat.key === key))
    .filter(Boolean);

  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={stat.value}
          format={stat.format}
          icon={stat.icon}
          iconClassName={stat.iconClassName}
          hint={stat.hint}
          delay={index * 0.06}
        />
      ))}
    </div>
  );
};

export default ImpactSummary;
