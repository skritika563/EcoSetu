/**
 * PickupDetailsPage — full detail view for a single household/organization
 * pickup: status timeline, collector info while en route, final breakdown +
 * receipt once completed, and the rate-collector prompt.
 *
 * Two-column on desktop (info + timeline on the left, summary + actions on
 * the right); single column on mobile.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Construction, MapPin, Star, StickyNote } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePickupDetails } from "@/hooks/usePickupDetails";
import { getCategory } from "@/config/domain";
import { formatFriendlyDate, formatWeight } from "@/lib/format";
import { isPickupUpcoming } from "@/config/pickups";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import PickupStatusTimeline from "@/components/pickups/PickupStatusTimeline";
import CollectorInfoPanel from "@/components/pickups/CollectorInfoPanel";
import ReceiptView from "@/components/pickups/ReceiptView";
import RateCollectorDialog from "@/components/pickups/RateCollectorDialog";
import CancelPickupDialog from "@/components/pickups/CancelPickupDialog";
import { cn } from "@/lib/utils";

const PickupDetailsPage = () => {
  const { pickupId } = useParams();
  const { role } = useAuth();
  const { pickup, loading, error, actionPending, refetch, actions } = usePickupDetails(pickupId);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  if (role === "admin") {
    return (
      <PageContainer className="py-10">
        <EmptyState
          icon={Construction}
          title="Pickup management for administrators is coming soon"
          description="This surface is being designed for admins separately from the household/organization experience."
        />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="py-10">
        <ErrorState title="We couldn't load this pickup" description={error} onRetry={refetch} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!pickup) {
    return (
      <PageContainer className="py-10">
        <EmptyState title="Pickup not found" description="This pickup may have been removed." />
      </PageContainer>
    );
  }

  const showCollectorPanel = pickup.collector && (pickup.status === "on_the_way" || pickup.status === "in_progress");
  const isCompleted = pickup.status === "completed";
  const isCancelled = pickup.status === "cancelled";
  const canCancel = isPickupUpcoming(pickup.status);
  const displayCategories = isCompleted
    ? pickup.verifiedCategories.map((c) => c.category)
    : pickup.estimatedCategories ?? [];

  const handleCancel = async (reason) => {
    try {
      await actions.cancel(reason);
      toast.success("Pickup cancelled");
      setCancelOpen(false);
    } catch (err) {
      toast.error(err.message || "Couldn't cancel this pickup.");
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
        <Link to="/pickups">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          All pickups
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{pickup.id}</p>
          <h1 className="mt-0.5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {formatFriendlyDate(pickup.pickupDate)} · {pickup.pickupTimeSlot}
          </h1>
        </div>
        <StatusBadge status={pickup.status} className="text-sm" />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: journey */}
        <div className="space-y-6 lg:col-span-2">
          <PickupStatusTimeline
            status={pickup.status}
            statusHistory={pickup.statusHistory}
            cancellation={pickup.cancellation}
          />

          {showCollectorPanel && (
            <CollectorInfoPanel collector={pickup.collector} distanceKm={pickup.distanceKm} status={pickup.status} />
          )}

          {isCompleted && (
            <>
              <ReceiptView pickup={pickup} />
              <div className="rounded-xl border border-border bg-card p-4">
                {pickup.rating ? (
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`You rated this pickup ${pickup.rating.stars} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < pickup.rating.stars ? "fill-current text-amber-500" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {pickup.rating.review || "Thanks for your feedback"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-foreground">How was your pickup experience?</p>
                    <Button size="sm" variant="outline" onClick={() => setRateOpen(true)}>
                      Rate Collector
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: summary + actions */}
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">Pickup summary</h2>

            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="sr-only">Address</dt>
                  <dd className="text-foreground">
                    {pickup.pickupAddress?.line}, {pickup.pickupAddress?.city} {pickup.pickupAddress?.pincode}
                  </dd>
                </div>
              </div>

              <div className="flex gap-2.5">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="sr-only">Category</dt>
                  <dd className="text-foreground">
                    {displayCategories.length > 0 ? (
                      displayCategories.map((k) => getCategory(k).label).join(", ")
                    ) : (
                      <span className="text-muted-foreground">Category will be identified during pickup</span>
                    )}
                  </dd>
                  {!isCompleted && pickup.estimatedWeightKg && (
                    <dd className="mt-0.5 text-xs text-muted-foreground">
                      ~{formatWeight(pickup.estimatedWeightKg, { decimals: 0 })} estimated
                    </dd>
                  )}
                </div>
              </div>

              {pickup.notes && (
                <div className="flex gap-2.5">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <dd className="text-foreground">{pickup.notes}</dd>
                </div>
              )}
            </dl>

            {(canCancel || isCompleted) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-col gap-2">
                  {canCancel && (
                    <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                      Cancel Pickup
                    </Button>
                  )}
                  {isCompleted && !pickup.rating && (
                    <Button variant="outline" onClick={() => setRateOpen(true)}>
                      Rate Collector
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {!pickup.collector && !isCancelled && !isCompleted && (
            <EmptyState
              title="Finding a collector"
              description="You'll be notified as soon as a collector is assigned — usually within a few hours."
              className="py-8"
            />
          )}
        </aside>
      </div>

      <CancelPickupDialog
        pickup={cancelOpen ? pickup : null}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancel}
        submitting={actionPending}
      />

      <RateCollectorDialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        collectorName={pickup.collector?.name || "your collector"}
        submitting={actionPending}
        onSubmit={async (stars, review) => {
          try {
            await actions.rate(stars, review);
          } catch (err) {
            toast.error(err.message || "Couldn't submit your rating.");
          }
        }}
      />
    </PageContainer>
  );
};

export default PickupDetailsPage;
