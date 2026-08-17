/**
 * GeneralUserPickups — household / NGO / school / university pickup list.
 *
 * ONE page serves all four — organizationType never branches the structure,
 * only optional copy would. Tabs: Upcoming | Active | Completed | Cancelled
 * (config/pickups.js), with a search + category filter that doubles as the
 * "Pickup History" search spec calls for — Completed/Cancelled ARE the
 * history, not a separate page.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarPlus, Construction, Search, Truck } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePickups } from "@/hooks/usePickups";
import { cancelPickup } from "@/services/pickupService";
import { VERIFIABLE_CATEGORIES } from "@/data/pricingData";
import { USER_PICKUP_TABS } from "@/config/pickups";
import { getCategory } from "@/config/domain";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PickupCard from "@/components/pickups/PickupCard";
import CancelPickupDialog from "@/components/pickups/CancelPickupDialog";

const EMPTY_COPY = {
  upcoming: { title: "You don't have any upcoming pickups.", cta: true },
  active: { title: "No pickups are in progress right now.", cta: false },
  completed: { title: "Your completed pickups will appear here.", cta: false },
  cancelled: { title: "No cancelled pickups.", cta: false },
};

const GeneralUserPickups = () => {
  const { role } = useAuth();
  const { data, loading, error, refetch } = usePickups();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // All hooks must run in the same order on every render, so this is
  // computed unconditionally even though it's unused on the admin path below.
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((pickup) => {
      const matchesSearch =
        !search.trim() ||
        pickup.id.toLowerCase().includes(search.toLowerCase()) ||
        pickup.pickupAddress?.line?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        pickup.estimatedCategories?.includes(categoryFilter) ||
        pickup.verifiedCategories?.some((c) => c.category === categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [data, search, categoryFilter]);

  // Admin never gets fabricated pickup data on this route.
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

  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      // The server derives who's cancelling from the verified token — no
      // client-supplied actor field needed.
      await cancelPickup(cancelTarget.id, { reason });
      toast.success("Pickup cancelled");
      setCancelTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.message || "Couldn't cancel this pickup.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Pickups
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, manage and review every scrap pickup in one place.
          </p>
        </div>
        <Button asChild>
          <Link to="/pickups/new">
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            Schedule Pickup
          </Link>
        </Button>
      </header>

      {error ? (
        <ErrorState title="Unable to load pickups" description="Please try again." onRetry={refetch} />
      ) : (
        <>
          {/* Search + filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by pickup ID or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search pickups"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-48" aria-label="Filter by category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VERIFIABLE_CATEGORIES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {getCategory(key).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <ListSkeleton count={4} />
          ) : (
            <Tabs defaultValue="upcoming">
              <TabsList className="w-full sm:w-fit">
                {USER_PICKUP_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {USER_PICKUP_TABS.map((tab) => {
                const items = filtered.filter(tab.filter);
                const copy = EMPTY_COPY[tab.value];

                return (
                  <TabsContent key={tab.value} value={tab.value} className="mt-4">
                    {items.length === 0 ? (
                      <EmptyState
                        icon={Truck}
                        title={copy.title}
                        actionLabel={copy.cta ? "Schedule Pickup" : undefined}
                        onAction={copy.cta ? () => navigate("/pickups/new") : undefined}
                        className="py-12"
                      />
                    ) : (
                      <div className="space-y-3">
                        {items.map((pickup) => (
                          <PickupCard
                            key={pickup.id}
                            pickup={pickup}
                            tab={tab.value}
                            onCancel={tab.value === "upcoming" ? setCancelTarget : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </>
      )}

      <CancelPickupDialog
        pickup={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={handleCancel}
        submitting={cancelling}
      />
    </PageContainer>
  );
};

export default GeneralUserPickups;
