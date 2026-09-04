/**
 * NextJobCard — the collector's primary action card: the job they're headed to.
 *
 * Summary only — accepting, navigating, weighing and payment all belong to the
 * Jobs module.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, Clock, MapPin, Navigation, Weight } from "lucide-react";

import { notifyComingSoon } from "@/lib/comingSoon";
import { formatNumber, formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";

const NextJobCard = ({ job }) => {
  if (!job) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No jobs assigned right now"
        description="New pickup requests near you will appear here as households and organizations schedule them."
        actionLabel="Browse nearby jobs"
        onAction={() => notifyComingSoon("Jobs")}
      />
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label="Next job"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next pickup
          </span>
          <h2 className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {job.customer.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {job.timeSlot}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Navigation className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {formatNumber(job.distanceKm, { decimals: 1 })} km
            </p>
            <p className="text-xs text-muted-foreground">away</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3 sm:col-span-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{job.address.line}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {job.address.city}
              {job.estimatedWeightKg ? (
                <>
                  <span aria-hidden="true">·</span>
                  <Weight className="h-3 w-3" />
                  ~{formatWeight(job.estimatedWeightKg, { decimals: 0 })} expected
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`/jobs/${job.id}`}>Open Job</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/jobs/${job.id}`}>
            <Navigation className="mr-1.5 h-4 w-4" />
            Navigate
          </Link>
        </Button>
      </div>
    </motion.section>
  );
};

export default NextJobCard;
