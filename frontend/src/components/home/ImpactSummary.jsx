/**
 * ImpactSummary — headline impact metrics with subtle count-up animation.
 *
 * The same component serves households, organizations and collectors — only
 * the copy shifts, never the structure.
 *
 * `metrics` selects which tiles to show, so the Sustainability Dashboard can
 * lead with eco activity while other surfaces lead with money recovered.
 * Defaults preserve the original four-tile behaviour.
 *
 * Metric definitions live in config/impactStats.js, not here — a page that
 * needs a bespoke layout (the Sustainability Dashboard's bento grid, which
 * puts Eco Points in its own tall showcase card rather than a plain
 * StatCard) can pull the exact same label/value/format/hint per metric
 * instead of re-deriving it and risking drift.
 */

import { buildImpactStats } from "@/config/impactStats";
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

  const allStats = buildImpactStats(impact, isOrganization);
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
