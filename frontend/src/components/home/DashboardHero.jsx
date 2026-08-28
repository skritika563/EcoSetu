/**
 * DashboardHero — the one primary action card on Home.
 *
 * Two states:
 *   no upcoming pickup → "Ready to recycle?" + Schedule Pickup
 *   upcoming pickup    → date, slot, collector and status + View Pickup
 *
 * Summary only. The full status timeline and pickup history belong to the
 * Pickups module.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarPlus, Clock, MapPin, Recycle, Star, Truck, UserCheck } from "lucide-react";

import { getCategory } from "@/config/domain";
import { formatFriendlyDate, formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

const shellClasses =
  "relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6";

/* ─── Empty state: no pickup scheduled ───────────────────────────────────── */
const ReadyToRecycle = ({ isOrganization }) => (
  <div className={cn(shellClasses, "bg-primary/[0.04]")}>
    {/* One restrained decorative mark, not a gradient wash */}
    <Recycle
      className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 text-primary/[0.06]"
      aria-hidden="true"
    />

    <div className="relative max-w-lg">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Recycle className="h-3.5 w-3.5" />
        No pickup scheduled
      </span>

      <h2 className="mt-3 font-heading text-xl font-semibold text-foreground sm:text-2xl">
        Ready to recycle?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {isOrganization
          ? "Book a bulk collection for your campus or office. A verified collector weighs everything on site and pays at fair, transparent rates."
          : "Book a pickup and a verified collector comes to your door. Your scrap is weighed on the spot and you're paid at fair rates — no haggling."}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/pickups/new">
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            Schedule Pickup
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/scan">Scan my scrap</Link>
        </Button>
      </div>
    </div>
  </div>
);

/* ─── Populated state: pickup on the way ─────────────────────────────────── */
const UpcomingPickup = ({ pickup }) => {
  const { collector, address, categories = [], estimatedWeightKg } = pickup;

  return (
    <div className={shellClasses}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Upcoming pickup
          </span>
          <h2 className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {formatFriendlyDate(pickup.scheduledFor)}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {pickup.timeSlot}
          </p>
        </div>
        <StatusBadge status={pickup.status} />
      </div>

      {/* Collector + address */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {collector ? <UserCheck className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            {collector ? (
              <>
                <p className="truncate text-sm font-medium text-foreground">{collector.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-current text-amber-500" />
                  {collector.rating} · {collector.totalPickups} pickups
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Finding a collector</p>
                <p className="text-xs text-muted-foreground">Usually assigned within a few hours</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{address?.line}</p>
            <p className="text-xs text-muted-foreground">
              {address?.city}
              {estimatedWeightKg ? ` · ~${formatWeight(estimatedWeightKg, { decimals: 0 })}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Expected categories */}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {categories.map((key) => {
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
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`/pickups/${pickup.id}`}>View Pickup</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/pickups">All pickups</Link>
        </Button>
      </div>
    </div>
  );
};

const DashboardHero = ({ pickup, isOrganization = false }) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    aria-label="Pickup summary"
  >
    {pickup ? (
      <UpcomingPickup pickup={pickup} />
    ) : (
      <ReadyToRecycle isOrganization={isOrganization} />
    )}
  </motion.section>
);

export default DashboardHero;
