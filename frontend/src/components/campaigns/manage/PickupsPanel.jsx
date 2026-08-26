/**
 * PickupsPanel — real Pickup documents booked "for" this campaign
 * (Pickup.relatedCampaign), reusing the existing Pickup system entirely —
 * no duplicate pickup records are created for campaigns.
 */

import { Link } from "react-router-dom";
import { Truck } from "lucide-react";

import { useCampaignPickups } from "@/hooks/useCampaigns";
import { getCategory, getStatus } from "@/config/domain";
import { formatFriendlyDate, formatWeight } from "@/lib/format";

import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { cn } from "@/lib/utils";

const PickupsPanel = ({ campaignId }) => {
  const { pickups, loading, error, refetch } = useCampaignPickups(campaignId);

  if (error) return <ErrorState title="Unable to load pickups" description={error} onRetry={refetch} />;
  if (loading) return <ListSkeleton count={3} />;
  if (pickups.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No pickups linked to this campaign yet"
        description="When a household or organization books a pickup and tags it to this campaign, it'll show up here — reusing the real Pickups system, not a separate record."
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {pickups.map((pickup) => {
        const status = getStatus(pickup.status);
        const totalWeight = (pickup.verifiedCategories ?? []).reduce((sum, c) => sum + c.weightKg, 0);
        return (
          <Link
            key={pickup.id}
            to={`/pickups/${pickup.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{pickup.customer?.name ?? "Unknown"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatFriendlyDate(pickup.pickupDate)}
                {totalWeight > 0 && ` · ${formatWeight(totalWeight)} verified`}
                {(pickup.estimatedCategories ?? []).length > 0 && ` · ${pickup.estimatedCategories.map((c) => getCategory(c).label).join(", ")}`}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default PickupsPanel;
