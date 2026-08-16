/**
 * CollectorInfoPanel — shown on Pickup Details once a collector is en route.
 *
 * Real-time GPS tracking isn't built yet — the map is a clearly-labelled
 * static placeholder, not a live view, per spec.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Clock, MapPin, MessageCircle, Navigation, Star, Truck } from "lucide-react";

import { notifyComingSoon } from "@/lib/comingSoon";
import { getInitials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const CollectorInfoPanel = ({ collector, distanceKm, status }) => {
  const prefersReducedMotion = useReducedMotion();
  if (!collector) return null;

  const eta = distanceKm != null ? Math.max(4, Math.round(distanceKm * 4)) : null;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(collector.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{collector.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-amber-500" />
            {collector.rating} · {collector.totalPickups} pickups
          </p>
        </div>
        <Button size="icon" variant="outline" aria-label="Contact collector" onClick={() => notifyComingSoon("In-app calling")}>
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {collector.vehicle && (
          <div className="rounded-lg bg-muted/40 p-2.5">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Truck className="h-3 w-3" />
              Vehicle
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-foreground">{collector.vehicle}</p>
          </div>
        )}
        {eta != null && status !== "in_progress" && (
          <div className="rounded-lg bg-muted/40 p-2.5">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              ETA
            </p>
            <p className="mt-0.5 text-xs font-medium text-foreground">~{eta} min</p>
          </div>
        )}
        {distanceKm != null && (
          <div className="rounded-lg bg-muted/40 p-2.5">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Navigation className="h-3 w-3" />
              Distance
            </p>
            <p className="mt-0.5 text-xs font-medium text-foreground">{distanceKm} km</p>
          </div>
        )}
      </div>

      {status === "in_progress" ? (
        <p className="mt-4 rounded-lg bg-primary/5 p-3 text-sm text-foreground">
          Your scrap is being verified and weighed.
        </p>
      ) : (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">Map preview — demo data</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">Live GPS tracking is coming soon</p>
        </div>
      )}
    </motion.div>
  );
};

export default CollectorInfoPanel;
