/**
 * WeeklyEarnings — a small, hand-built bar chart.
 *
 * Deliberately not a charting library: seven bars driven by design tokens stay
 * consistent with the rest of the dashboard, theme correctly in dark mode, and
 * cost nothing in bundle size. Reach for a chart library when the Earnings
 * module needs real axes and tooltips.
 */

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import { notifyComingSoon } from "@/lib/comingSoon";
import { cn } from "@/lib/utils";

const WeeklyEarnings = ({ data = [], className }) => {
  if (data.length === 0) {
    return (
      <section className={className} aria-label="Weekly earnings">
        <SectionHeader title="This week" />
        <EmptyState
          icon={TrendingUp}
          title="No earnings yet this week"
          description="Completed jobs and marketplace sales will show up here."
        />
      </section>
    );
  }

  const total = data.reduce((sum, day) => sum + day.amount, 0);
  const peak = Math.max(...data.map((day) => day.amount), 1);
  const best = data.reduce((top, day) => (day.amount > top.amount ? day : top), data[0]);

  return (
    <section className={className} aria-label="Weekly earnings">
      <SectionHeader
        title="This week"
        description={`${formatCurrency(total)} earned · best day ${best.day}`}
        actionLabel="Earnings"
        onAction={() => notifyComingSoon("Earnings")}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex h-32 items-end justify-between gap-2">
          {data.map((day, index) => {
            const heightPercent = Math.max(6, (day.amount / peak) * 100);
            const isBest = day.day === best.day;

            return (
              <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-md",
                    // Amber marks the peak so the eye lands on it, instead of
                    // seven near-identical green blocks.
                    isBest ? "bg-ecosetu-orange" : "bg-primary/20"
                  )}
                  title={`${day.day}: ${formatCurrency(day.amount)}`}
                />
                <span
                  className={cn(
                    "text-[11px]",
                    isBest ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WeeklyEarnings;
