/**
 * PickupCard — one pickup in the household/organization list.
 *
 * The primary action changes by tab (spec §3): Upcoming gets View + Cancel,
 * Active gets Track, Completed gets View + Download Receipt, Cancelled gets
 * View only. Cancelling is handled by the parent (it needs a reason dialog),
 * so this card only asks for the click.
 */

import { Link } from "react-router-dom";
import { Download, MapPin, Star, UserCheck, X } from "lucide-react";

import { getCategory } from "@/config/domain";
import { formatCurrency, formatFriendlyDate, formatWeight } from "@/lib/format";
import { downloadReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

const PickupCard = ({ pickup, tab, onCancel }) => {
  const categories = pickup.estimatedCategories ?? [];
  const hasFinal = pickup.status === "completed" && pickup.verifiedCategories?.length > 0;
  const displayCategories = hasFinal
    ? pickup.verifiedCategories.map((c) => c.category)
    : categories;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{pickup.id}</p>
          <p className="mt-0.5 font-heading text-sm font-semibold text-foreground">
            {formatFriendlyDate(pickup.pickupDate)} · {pickup.pickupTimeSlot}
          </p>
        </div>
        <StatusBadge status={pickup.status} />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {pickup.pickupAddress?.line}, {pickup.pickupAddress?.city}
        </span>
      </p>

      {/* Category chips + weight */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {displayCategories.length > 0 ? (
          displayCategories.map((key) => {
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
          <span className="text-xs text-muted-foreground">Category will be identified during pickup</span>
        )}

        {!hasFinal && pickup.estimatedWeightKg && (
          <span className="text-xs text-muted-foreground">
            · ~{formatWeight(pickup.estimatedWeightKg, { decimals: 0 })} estimated
          </span>
        )}
      </div>

      {/* Collector */}
      {pickup.collector && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
          <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs font-medium text-foreground">{pickup.collector.name}</span>
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-amber-500" />
            {pickup.collector.rating}
          </span>
        </div>
      )}

      {/* Final amount for completed pickups */}
      {hasFinal && (
        <p className="mt-3 text-sm font-semibold text-foreground">
          {formatCurrency(pickup.totalAmount, { decimals: 2 })}
          <span className="ml-1.5 font-normal text-muted-foreground">
            {pickup.paymentStatus === "paid" ? "paid" : pickup.paymentStatus}
          </span>
        </p>
      )}

      {/* Cancellation reason */}
      {pickup.status === "cancelled" && pickup.cancellation && (
        <p className="mt-3 text-xs text-muted-foreground">
          Cancelled — {pickup.cancellation.reason}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "active" ? "default" : "outline"} asChild>
          <Link to={`/pickups/${pickup.id}`}>{tab === "active" ? "Track Pickup" : "View Pickup"}</Link>
        </Button>

        {tab === "upcoming" && onCancel && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onCancel(pickup)}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}

        {tab === "completed" && hasFinal && (
          <Button size="sm" variant="ghost" onClick={() => downloadReceipt(pickup)}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Receipt
          </Button>
        )}
      </div>
    </div>
  );
};

export default PickupCard;
