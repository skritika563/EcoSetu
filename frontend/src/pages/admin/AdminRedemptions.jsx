/**
 * AdminRedemptions — the reward-redemption ledger and manual fulfilment
 * tracking.
 *
 * THIS IS THE ANSWER TO "how do we track donations": a donation-type reward
 * (Reward.effect === "none") has no automated fulfilment — an admin has to
 * actually arrange the tree-planting or the drive sponsorship externally,
 * then come here and mark it "Fulfilled". Automated-effect redemptions
 * (marketplace_discount, pickup_fee_waiver) also show up here once spent,
 * purely for visibility — they're already self-fulfilling by then, nothing
 * to action, so their row's buttons are naturally absent (only "issued"
 * rows are actionable — see ParticipantsPanel-style pattern elsewhere).
 */

import { Check, ChevronLeft, ChevronRight, Gift, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import useAdminRedemptions from "@/hooks/useAdminRedemptions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/admin/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const EFFECT_LABELS = {
  none: "Manual (needs fulfilment)",
  marketplace_discount: "Marketplace discount",
  pickup_fee_waiver: "Pickup fee waiver",
};

const STATUS_COLORS = {
  issued: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const AdminRedemptions = () => {
  const { data, loading, error, filters, updateFilters, setPage, updateStatus } = useAdminRedemptions();
  const redemptions = data?.redemptions ?? [];
  const statusCounts = data?.statusCounts ?? {};
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const handleAction = async (id, status) => {
    try {
      await updateStatus(id, status);
      toast.success(status === "fulfilled" ? "Marked fulfilled" : "Redemption cancelled");
    } catch (err) {
      toast.error(err.message || "Couldn't update this redemption.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Reward Redemptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track Eco Points redemptions — action the ones with no automated fulfilment (donations).
          </p>
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => updateFilters({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({pagination.total})</SelectItem>
            <SelectItem value="issued">Issued ({statusCounts.issued ?? 0})</SelectItem>
            <SelectItem value="fulfilled">Fulfilled ({statusCounts.fulfilled ?? 0})</SelectItem>
            <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled ?? 0})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : redemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No redemptions found"
          description="Redemptions will appear here as users spend Eco Points."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="hidden border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[160px_1fr_120px_140px_140px_120px_160px]">
            <span>User</span>
            <span>Reward</span>
            <span>Points</span>
            <span>Type</span>
            <span>Code</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {redemptions.map((r) => (
            <div
              key={r.id}
              className="grid items-center gap-3 border-b border-border/30 px-4 py-3 text-xs transition hover:bg-muted/20 last:border-b-0 md:grid-cols-[160px_1fr_120px_140px_140px_120px_160px]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.user?.name ?? "Unknown"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{r.user?.email}</p>
              </div>

              <span className="truncate font-medium text-foreground">{r.rewardName}</span>

              <span className="tabular-nums text-muted-foreground">{r.pointsSpent} pts</span>

              <span className="text-muted-foreground">{EFFECT_LABELS[r.effect] ?? r.effect}</span>

              <code className="truncate font-mono text-[11px] text-muted-foreground">{r.code}</code>

              <div>
                <Badge variant="outline" className={`border-0 text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}>
                  {r.status}
                </Badge>
              </div>

              <div className="flex justify-end gap-1.5">
                {r.status === "issued" && r.effect === "none" && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleAction(r.id, "fulfilled")}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Fulfil
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => handleAction(r.id, "cancelled")}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </>
                )}
                {r.status !== "issued" && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>
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
    </div>
  );
};

export default AdminRedemptions;
