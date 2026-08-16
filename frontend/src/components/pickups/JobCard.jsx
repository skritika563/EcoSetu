/**
 * JobCard — one pickup job in the collector's list.
 *
 * Collectors work off customer + location + estimate, never the household's
 * own view of the job — no "Cancel"/"Receipt" actions here, just "Open Job".
 */

import { Link } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";

import { getCategory } from "@/config/domain";
import { formatFriendlyDate, formatWeight, getInitials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

const JobCard = ({ job }) => {
  const categories = job.estimatedCategories ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(job.customer?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{job.customer?.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFriendlyDate(job.pickupDate)} · {job.pickupTimeSlot}
            </p>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="max-w-[14rem] truncate">
            {job.pickupAddress?.line}, {job.pickupAddress?.city}
          </span>
        </span>
        {job.distanceKm != null && (
          <span className="flex items-center gap-1">
            <Navigation className="h-3 w-3 shrink-0" />
            {job.distanceKm} km away
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {categories.length > 0 ? (
          categories.map((key) => {
            const category = getCategory(key);
            const Icon = category.icon;
            return (
              <span
                key={key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  category.tint
                )}
              >
                <Icon className="h-3 w-3" />
                {category.label}
              </span>
            );
          })
        ) : (
          <span className="text-xs text-muted-foreground">No category estimate provided</span>
        )}
        {job.estimatedWeightKg && (
          <span className="text-xs text-muted-foreground">
            · ~{formatWeight(job.estimatedWeightKg, { decimals: 0 })} expected
          </span>
        )}
      </div>

      <div className="mt-4">
        <Button size="sm" asChild>
          <Link to={`/jobs/${job.id}`}>Open Job</Link>
        </Button>
      </div>
    </div>
  );
};

export default JobCard;
