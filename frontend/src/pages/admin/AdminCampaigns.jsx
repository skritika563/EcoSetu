/**
 * AdminCampaigns — track, filter, and moderate NGO/School/University collection drives and campaigns.
 */
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Megaphone, Calendar, MapPin, Users, Scale, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { format } from "date-fns";
import * as adminService from "@/services/adminService";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // Moderation state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 20,
        status: activeTab === "all" ? "" : activeTab,
        search,
      };
      const res = await adminService.listCampaigns(params);
      setCampaigns(res.campaigns || []);
      setStatusCounts(res.statusCounts || {});
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleCancelCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      setActionLoading(true);
      await adminService.cancelCampaign(selectedCampaign.id, cancelReason || "Cancelled by admin");
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === selectedCampaign.id ? { ...c, status: "cancelled", lifecycleState: "cancelled" } : c
        )
      );
      setCancelDialogOpen(false);
      setCancelReason("");
    } catch (err) {
      alert(err.message || "Failed to cancel campaign");
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
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    activeTab === tab.value ? "bg-white/20 text-white" : "bg-muted text-foreground"
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
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Campaign Modal */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Cancel Campaign
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to cancel &ldquo;{selectedCampaign?.name}&rdquo;?
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground">
                Cancellation Reason (Optional)
              </label>
              <Input
                placeholder="Reason for cancellation…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={actionLoading}
              >
                Keep Active
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelCampaign}
                disabled={actionLoading}
              >
                {actionLoading ? "Cancelling…" : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaigns;
