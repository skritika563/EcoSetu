/**
 * InventoryPage — a collector's material stock.
 *
 * Stock is DERIVED, not separately tracked: everything collected on
 * completed pickups, minus what's already been turned into marketplace
 * listings (see backend productController.getInventory). The actionable
 * half is the "not yet listed" pickup list at the bottom — each row links
 * straight into the listing form pre-filled from that pickup, which is the
 * whole point of the page.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, Package, Scale, Store, TrendingUp } from "lucide-react";

import useInventory from "@/hooks/useInventory";
import { getCategory } from "@/config/domain";
import { formatFriendlyDate, formatNumber, formatWeight } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const StatTile = ({ icon: Icon, label, value, hint, tone = "primary" }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          tone === "emerald" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
    <p className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const InventoryPage = () => {
  const { data, loading, error, refetch } = useInventory();

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer className="py-6 sm:py-8">
        <ErrorState title="Unable to load your inventory" description={error} onRetry={refetch} />
      </PageContainer>
    );
  }

  const { summary, byCategory, unlistedPickups } = data;
  const maxKg = byCategory.length > 0 ? byCategory[0].collectedKg : 0;

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          <Boxes className="h-5 w-5 text-primary" />
          Inventory
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Material you have collected, and what is still waiting to be listed.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Scale}
          label="Total collected"
          value={formatWeight(summary.totalCollectedKg, { decimals: 1 })}
          hint={`Across ${formatNumber(summary.completedPickups)} completed pickups`}
        />
        <StatTile
          icon={Store}
          label="Listed"
          value={formatWeight(summary.totalListedKg, { decimals: 1 })}
          hint={`${formatNumber(summary.activeListings)} active · ${formatNumber(summary.soldListings)} sold`}
          tone="emerald"
        />
        <StatTile
          icon={Package}
          label="Not yet listed"
          value={formatWeight(summary.unlistedKg, { decimals: 1 })}
          hint={`${formatNumber(summary.unlistedPickupCount)} pickups un-listed`}
          tone="amber"
        />
        <StatTile
          icon={TrendingUp}
          label="Listed share"
          value={
            summary.totalCollectedKg > 0
              ? `${Math.round((summary.totalListedKg / summary.totalCollectedKg) * 100)}%`
              : "—"
          }
          hint="Of everything you have collected"
        />
      </div>

      {/* Breakdown by material */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">By material</h2>
        <p className="text-xs text-muted-foreground">Total weight collected per scrap category</p>

        {byCategory.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Nothing collected yet"
            description="Complete a pickup and the materials you collect will show up here."
            className="py-10"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {byCategory.map((row, i) => {
              const category = getCategory(row.category);
              const Icon = category.icon;
              const pct = maxKg > 0 ? Math.max((row.collectedKg / maxKg) * 100, 3) : 0;

              return (
                <div key={row.category} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      category.tint
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{category.label}</p>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatWeight(row.collectedKg, { decimals: 1 })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={cn("h-full rounded-full", category.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Un-listed pickups — the actionable part */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Ready to list</h2>
            <p className="text-xs text-muted-foreground">
              Completed pickups you have not turned into a listing yet
            </p>
          </div>
          {unlistedPickups.length > 0 && (
            <Button size="sm" asChild>
              <Link to="/marketplace/listings/new">Create a listing</Link>
            </Button>
          )}
        </div>

        {unlistedPickups.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Everything is listed"
            description="Every completed pickup has already been turned into a marketplace listing."
            className="py-10"
          />
        ) : (
          <div className="mt-4 space-y-2.5">
            {unlistedPickups.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatWeight(p.totalWeightKg, { decimals: 1 })} collected
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.completedAt ? formatFriendlyDate(p.completedAt) : "—"} ·{" "}
                    {p.categories.map((c) => getCategory(c).label).join(", ") || "Uncategorised"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/marketplace/listings/new?pickupId=${p.id}`}>List this</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default InventoryPage;
