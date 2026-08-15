/**
 * CollectionBreakdown — collected weight per waste category.
 *
 * A ranked bar list rather than a pie chart: easier to scan, readable at any
 * width, and it keeps the category colours from config/domain.js consistent
 * with the rest of the app.
 */

import { motion } from "framer-motion";
import { PieChart } from "lucide-react";

import { getCategory } from "@/config/domain";
import { formatNumber } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const CollectionBreakdown = ({
  data = [],
  title = "Collection breakdown",
  description,
  className,
}) => {
  if (data.length === 0) {
    return (
      <section className={className} aria-label={title}>
        <SectionHeader title={title} />
        <EmptyState
          icon={PieChart}
          title="Nothing collected yet"
          description="Once you complete jobs, your category mix appears here."
        />
      </section>
    );
  }

  const total = data.reduce((sum, item) => sum + item.weightKg, 0);
  const peak = Math.max(...data.map((item) => item.weightKg), 1);

  return (
    <section className={className} aria-label={title}>
      <SectionHeader
        title={title}
        description={
          description ?? `${formatNumber(total, { decimals: 1 })} kg collected this month`
        }
      />

      <ul className="space-y-2.5 rounded-xl border border-border bg-card p-4">
        {data.map((item, index) => {
          const category = getCategory(item.category);
          const Icon = category.icon;
          const share = (item.weightKg / total) * 100;

          return (
            <li key={item.category} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${category.tint}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-foreground">{category.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatNumber(item.weightKg, { decimals: 1 })} kg
                    <span className="ml-1.5 text-muted-foreground/70">
                      {share.toFixed(0)}%
                    </span>
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.weightKg / peak) * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.04, ease: "easeOut" }}
                    className={cn("h-full rounded-full", category.bar)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CollectionBreakdown;
