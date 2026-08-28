/**
 * AdminCampaigns — track, filter, and moderate NGO/School/University collection drives and campaigns.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Search, Filter, Megaphone, Calendar, MapPin, Users, Scale, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { format } from "date-fns";
import useAdminCampaigns from "@/hooks/useAdminCampaigns";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const AdminCampaigns = () => {
  const { data, loading, error, filters, updateFilters, setPage, cancelCampaign } = useAdminCampaigns();
  const [searchInput, setSearchInput] = useState("");

  const campaigns = data?.campaigns ?? [];
  const statusCounts = data?.statusCounts ?? {};
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  // Moderation state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleCancelCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      setActionLoading(true);
      await cancelCampaign(selectedCampaign.id, cancelReason || "Cancelled by admin");
      setCancelDialogOpen(false);
      setCancelReason("");
      toast.success("Campaign cancelled");
    } catch (err) {
      toast.error(err.message || "Failed to cancel campaign");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Campaign Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review community drives, institution drives, and environmental initiatives
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "all" ? pagination.total : statusCounts[tab.value] ?? 0;
          const active = (filters.status || "all") === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => updateFilters({ status: tab.value === "all" ? "" : tab.value })}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    active ? "bg-white/20 text-white" : "bg-muted text-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by name or description…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Search
          </Button>
        </form>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description="There are no campaigns matching your filter."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="space-y-3">
                {/* Header tag and status */}
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    {c.type}
                  </span>
                  <StatusBadge status={c.status} />
                </div>

                {/* Title and Org */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground line-clamp-1">
                    {c.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    by {c.organizer?.name || "Unknown Organization"}
                  </p>
                </div>

                {/* Meta details */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {c.startDate ? format(new Date(c.startDate), "MMM d") : "—"} -{" "}
                      {c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}
                    </span>
                  </div>

                  {c.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{c.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {c.participantCount || 0} joined
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="h-3.5 w-3.5" /> {c.collectedWeightKg || 0} kg collected
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              {c.status !== "cancelled" && (
                <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setSelectedCampaign(c);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" /> Cancel Campaign
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setPage(filters.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setPage(filters.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Campaign — shared ConfirmDialog (proper focus trap, Escape-to-close,
          backdrop click, and entrance animation via Radix, same as every other
          destructive confirmation in the app) with the reason field as its one
          piece of extra content. */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancelReason("");
        }}
        title="Cancel Campaign"
        description={`Are you sure you want to cancel "${selectedCampaign?.name}"?`}
        confirmLabel="Confirm Cancel"
        cancelLabel="Keep Active"
        loading={actionLoading}
        onConfirm={handleCancelCampaign}
      >
        <Label htmlFor="cancel-reason" className="text-xs font-medium text-muted-foreground">
          Cancellation reason (optional)
        </Label>
        <Input
          id="cancel-reason"
          placeholder="Reason for cancellation…"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="mt-1.5"
        />
      </ConfirmDialog>
    </div>
  );
};

export default AdminCampaigns;
