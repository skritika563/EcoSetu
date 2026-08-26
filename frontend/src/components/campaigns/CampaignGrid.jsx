/**
 * CampaignGrid — the responsive campaign grid, plus its loading/empty states.
 * Mirrors components/marketplace/ProductGrid.jsx exactly.
 */

import { Megaphone } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import CampaignCard from "@/components/campaigns/CampaignCard";
import { cn } from "@/lib/utils";

const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export const CampaignGridSkeleton = ({ count = 6, className }) => (
  <div className={cn(GRID_CLASS, className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
        <Skeleton className="aspect-[16/9] w-full rounded-none" />
        <div className="space-y-2 p-3.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const CampaignGrid = ({
  campaigns = [],
  loading = false,
  skeletonCount = 6,
  emptyTitle = "No campaigns found",
  emptyDescription = "Try a different search or clear your filters.",
  emptyAction,
  className,
}) => {
  if (loading) return <CampaignGridSkeleton count={skeletonCount} className={className} />;

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onClick}
        className="py-12"
      />
    );
  }

  return (
    <div className={cn(GRID_CLASS, className)}>
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
};

export default CampaignGrid;
