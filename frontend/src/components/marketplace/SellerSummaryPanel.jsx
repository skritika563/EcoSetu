/**
 * SellerSummaryPanel — "My Marketplace": sales, listings, orders, items sold.
 *
 * Shown to every role, but given prominence for collectors, who sell as a
 * core part of their work rather than occasionally. It lives INSIDE the
 * Marketplace module (not as a separate dashboard) so a collector's selling
 * activity stays in the same place as their buying — Home remains their
 * operational pickup dashboard, untouched.
 *
 * Every figure is a real aggregate from GET /api/marketplace/my-stats. A
 * brand-new seller correctly sees four zeros; nothing here is seeded or
 * estimated to make the panel look populated.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, IndianRupee, Package, PackageCheck, ShoppingBag } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Metric = ({ icon: Icon, value, label, highlight }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-[11px] font-medium uppercase tracking-wide">{label}</span>
    </div>
    <p
      className={cn(
        "mt-1 font-heading font-semibold tabular-nums text-foreground",
        highlight ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
      )}
    >
      {value}
    </p>
  </div>
);

const SellerSummaryPanel = ({ stats, loading, className }) => {
  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-label="My marketplace"
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">My Marketplace</h2>
        <Button variant="ghost" size="sm" asChild className="-mr-2 h-7 text-xs text-primary hover:text-primary">
          <Link to="/marketplace/listings/new">List an item</Link>
        </Button>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Metric
          icon={IndianRupee}
          label="Sales this month"
          value={formatCurrency(stats.salesThisMonth)}
          highlight
        />
        <Metric icon={Package} label="Active listings" value={stats.activeListings} />
        <Metric icon={ShoppingBag} label="Pending orders" value={stats.pendingOrders} />
        <Metric icon={PackageCheck} label="Items sold" value={stats.itemsSold} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
          <Link to="/marketplace/listings">
            Manage Listings
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
          <Link to="/marketplace/orders">
            Orders Received
            {stats.pendingOrders > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {stats.pendingOrders}
              </span>
            )}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </motion.section>
  );
};

export default SellerSummaryPanel;
