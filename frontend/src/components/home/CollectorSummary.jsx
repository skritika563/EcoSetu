/**
 * CollectorSummary — today's operational numbers plus job progress.
 *
 * The collector experience is task-oriented: what's left to do today, what it
 * has earned so far, and how much has been collected.
 */

import { ClipboardList, IndianRupee, Weight } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/format";
import StatCard from "@/components/common/StatCard";
import ProgressBar from "@/components/common/ProgressBar";
import { cn } from "@/lib/utils";

const CollectorSummary = ({ today, className }) => {
  if (!today) return null;

  const { jobsCompleted = 0, jobsTotal = 0, earnings = 0, weightKg = 0 } = today;
  const remaining = Math.max(0, jobsTotal - jobsCompleted);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Today's Jobs"
          value={jobsCompleted}
          format={(n) => `${Math.round(n)} / ${jobsTotal}`}
          icon={ClipboardList}
          hint={remaining > 0 ? `${remaining} remaining` : "All jobs done — nice work"}
        />
        <StatCard
          label="Today's Earnings"
          value={earnings}
          format={(n) => formatCurrency(n)}
          icon={IndianRupee}
          hint="Paid on completion"
          delay={0.06}
        />
        <StatCard
          label="Collected Today"
          value={weightKg}
          format={(n) => `${formatNumber(n, { decimals: 1 })} kg`}
          icon={Weight}
          hint="Across all completed jobs"
          delay={0.12}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Today's progress</span>
          <span className="text-sm font-semibold tabular-nums text-primary">
            {jobsCompleted} / {jobsTotal} jobs completed
          </span>
        </div>
        <ProgressBar value={jobsCompleted} max={jobsTotal} label="Today's job progress" />
      </div>
    </div>
  );
};

export default CollectorSummary;
