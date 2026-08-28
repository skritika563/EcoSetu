/**
 * AdminPickups — monitor, filter, and review all pickups across the platform.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ChevronLeft, ChevronRight, Truck, Calendar, MapPin, X } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import useAdminPickups from "@/hooks/useAdminPickups";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
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
  { value: "pending", label: "Pending" },
  { value: "collector_assigned", label: "Assigned" },
  { value: "on_the_way", label: "On The Way" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const AdminPickups = () => {
  const navigate = useNavigate();
  const { data, loading, error, filters, updateFilters, setPage, collectors } = useAdminPickups();
  const [searchInput, setSearchInput] = useState("");

  const pickups = data?.pickups ?? [];
  const statusCounts = data?.statusCounts ?? {};
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const hasDateOrCollectorFilter = filters.collectorId || filters.dateFrom || filters.dateTo;

  const clearAdvancedFilters = () => {
    updateFilters({ collectorId: "", dateFrom: "", dateTo: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Pickup Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and inspect platform pickups across all stages
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

      {/* Search + Advanced Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or collector name/email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              <Filter className="mr-1.5 h-3.5 w-3.5" /> Search
            </Button>
          </form>

          {/* Collector filter */}
          <Select
            value={filters.collectorId || "all"}
            onValueChange={(v) => updateFilters({ collectorId: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Collectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collectors</SelectItem>
              {collectors.map((c) => (
                <SelectItem key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pickup date</span>
          </div>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="h-8 w-auto text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="h-8 w-auto text-xs"
            aria-label="To date"
          />
          {hasDateOrCollectorFilter && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAdvancedFilters}>
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Pickups Table / List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : pickups.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No pickups found"
          description="There are no pickups matching your active filter criteria."
        />
      ) : (
        <div className="space-y-3">
          {pickups.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              onClick={() => navigate(`/admin/pickups/${p.id}`)}
              className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Left / Info */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    #{p.id.slice(-6).toUpperCase()}
                  </span>
                  <StatusBadge status={p.status} />
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                    {p.pickupType}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">
                    Customer: {p.customer?.name || "Unknown"}
                  </span>
                  <span>Collector: {p.collector?.name || "Unassigned"}</span>
                  {p.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> {p.city}
                    </span>
                  )}
                  {p.pickupDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      {format(new Date(p.pickupDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>

              {/* Right / Financials */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <p className="font-heading text-base font-bold text-foreground">
                    ₹{p.totalAmount || 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.totalWeight > 0 ? `${p.totalWeight} kg verified` : "Weight pending"}
                  </p>
                </div>
                {p.paymentStatus && (
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.paymentStatus}
                  </span>
                )}
              </div>
            </motion.div>
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
    </div>
  );
};

export default AdminPickups;
