/**
 * AdminAuditLog — view append-only administrative actions log for auditability and compliance.
 */
import { ClipboardList, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import useAdminAuditLog from "@/hooks/useAdminAuditLog";
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

const ACTION_COLORS = {
  user_role_changed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  user_activated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  user_deactivated: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  user_deleted: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  scrap_rate_updated: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  product_deactivated: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  product_restored: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  campaign_cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  notification_sent: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  pickup_cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const AdminAuditLog = () => {
  const { data, loading, error, filters, updateFilters, setPage } = useAdminAuditLog();
  const logs = data?.logs ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable record of all administrative operations performed on the platform
          </p>
        </div>

        {/* Filter */}
        <Select
          value={filters.action || "all"}
          onValueChange={(v) => updateFilters({ action: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="user_role_changed">User Role Changed</SelectItem>
            <SelectItem value="user_activated">User Activated</SelectItem>
            <SelectItem value="user_deactivated">User Deactivated</SelectItem>
            <SelectItem value="user_deleted">User Deleted</SelectItem>
            <SelectItem value="scrap_rate_updated">Scrap Rate Updated</SelectItem>
            <SelectItem value="product_deactivated">Product Deactivated</SelectItem>
            <SelectItem value="product_restored">Product Restored</SelectItem>
            <SelectItem value="campaign_cancelled">Campaign Cancelled</SelectItem>
            <SelectItem value="notification_sent">Notification Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit entries found"
          description="Administrative mutations will automatically appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="hidden border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[160px_160px_120px_1fr_140px]">
            <span>Admin</span>
            <span>Action</span>
            <span>Target Type</span>
            <span>Details / Metadata</span>
            <span className="text-right">Timestamp</span>
          </div>

          {logs.map((log) => (
            <div
              key={log.id}
              className="grid items-center gap-3 border-b border-border/30 px-4 py-3 text-xs transition hover:bg-muted/20 last:border-b-0 md:grid-cols-[160px_160px_120px_1fr_140px]"
            >
              {/* Admin info */}
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="truncate font-medium text-foreground">
                  {log.admin?.name || "Admin"}
                </span>
              </div>

              {/* Action badge */}
              <div>
                <Badge
                  variant="outline"
                  className={`border-0 text-[10px] font-semibold ${
                    ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {log.action?.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* Target Type */}
              <span className="capitalize text-muted-foreground">{log.targetType}</span>

              {/* Metadata details */}
              <div className="font-mono text-[11px] text-muted-foreground truncate">
                {log.metadata ? JSON.stringify(log.metadata) : "—"}
              </div>

              {/* Timestamp */}
              <span className="text-right text-muted-foreground">
                {log.createdAt ? format(new Date(log.createdAt), "MMM d, p") : "—"}
              </span>
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

export default AdminAuditLog;
