/**
 * RecentActivity — a compact, scannable feed of the last few things that
 * happened. The full history belongs to the Pickups / Rewards modules.
 */

import { History, Megaphone, PackageCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";

import { notifyComingSoon } from "@/lib/comingSoon";
import { formatRelativeTime } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

/** Activity type → icon. Data only carries the string key. */
const TYPE_ICONS = {
  pickup_completed: Truck,
  points_earned: Sparkles,
  marketplace_purchase: ShoppingBag,
  campaign_joined: Megaphone,
  product_sold: PackageCheck,
};

const ActivityRow = ({ activity }) => {
  const Icon = TYPE_ICONS[activity.type] ?? History;
  const isCredit = activity.value?.startsWith("+");

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
        <p className="truncate text-xs text-muted-foreground">{activity.description}</p>
      </div>

      <div className="shrink-0 text-right">
        {activity.value && (
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              isCredit ? "text-primary" : "text-foreground"
            )}
          >
            {activity.value}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/80">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </li>
  );
};

const RecentActivity = ({ activity = [], className }) => (
  <section className={className} aria-label="Recent activity">
    <SectionHeader title="Recent activity" />

    {activity.length === 0 ? (
      <EmptyState
        icon={History}
        title="Nothing here yet"
        description="Your pickups, purchases and Eco Points will show up here."
        actionLabel="Schedule your first pickup"
        onAction={() => notifyComingSoon("Schedule Pickup")}
      />
    ) : (
      <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4">
        {activity.map((item) => (
          <ActivityRow key={item.id} activity={item} />
        ))}
      </ul>
    )}
  </section>
);

export default RecentActivity;
