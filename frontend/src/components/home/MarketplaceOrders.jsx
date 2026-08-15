/**
 * MarketplaceOrders — compact preview of orders on the collector's listings.
 *
 * Approving, fulfilling and payment handling belong to the Marketplace module.
 */

import { PackageCheck } from "lucide-react";

import { notifyComingSoon } from "@/lib/comingSoon";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";

const MarketplaceOrders = ({ orders = [], className }) => (
  <section className={className} aria-label="Marketplace orders">
    <SectionHeader
      title="Marketplace orders"
      description="Buyers waiting on your listings"
      actionLabel="View all"
      onAction={() => notifyComingSoon("Marketplace")}
    />

    {orders.length === 0 ? (
      <EmptyState
        icon={PackageCheck}
        title="No orders yet"
        description="List sorted material and buyers nearby will be able to order it."
        actionLabel="Create a listing"
        onAction={() => notifyComingSoon("My Listings")}
      />
    ) : (
      <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4">
        {orders.map((order) => (
          <li key={order.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{order.item}</p>
                <StatusBadge status={order.status} className="shrink-0" />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {order.buyer} · {formatNumber(order.quantityKg)} kg ·{" "}
                {formatRelativeTime(order.placedAt)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
              {formatCurrency(order.amount)}
            </p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default MarketplaceOrders;
