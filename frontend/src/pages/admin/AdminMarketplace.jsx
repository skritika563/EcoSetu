/**
 * AdminMarketplace — overview of marketplace listings and orders with toggle active/inactive moderation.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Search, Filter, Store, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import useAdminMarketplace from "@/hooks/useAdminMarketplace";
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

const AdminMarketplace = () => {
  const { overview, products, filters, updateFilters, setPage, toggleProductStatus } = useAdminMarketplace();
  const [searchInput, setSearchInput] = useState("");

  const productList = products.data?.products ?? [];
  const pagination = products.data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  // Moderation state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleToggleStatus = async () => {
    if (!selectedProduct) return;
    try {
      setActionLoading(true);
      const nextStatus = await toggleProductStatus(selectedProduct);
      setConfirmDialogOpen(false);
      toast.success(nextStatus === "active" ? "Listing restored" : "Listing deactivated");
    } catch (err) {
      toast.error(err.message || "Failed to update product status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Marketplace Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor product listings, seller activity, and order transactions
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Listings</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {overview.data?.totalListings ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Active Listings</p>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-600">
                {overview.data?.activeListings ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Orders</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {overview.data?.totalOrders ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Marketplace Revenue</p>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                ₹{overview.data?.totalRevenue?.toLocaleString() ?? 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search listings by title or description…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Search
          </Button>
        </form>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => updateFilters({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      {products.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : products.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {products.error}
        </div>
      ) : productList.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No products found"
          description="No marketplace products matched your filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="hidden border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[1fr_120px_100px_120px_120px_100px]">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Seller</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {productList.map((p) => (
            <div
              key={p.id}
              className="grid items-center gap-3 border-b border-border/30 px-4 py-3 text-sm transition hover:bg-muted/20 last:border-b-0 md:grid-cols-[1fr_120px_100px_120px_120px_100px]"
            >
              {/* Product title & thumbnail */}
              <div className="flex items-center gap-3">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-10 w-10 rounded-lg object-cover border border-border/40"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>

              {/* Category */}
              <p className="capitalize text-muted-foreground">{p.category?.replace(/_/g, " ")}</p>

              {/* Price */}
              <p className="font-semibold text-foreground">₹{p.price}</p>

              {/* Seller */}
              <p className="truncate text-muted-foreground">{p.seller?.name || "Unknown"}</p>

              {/* Status */}
              <div>
                <StatusBadge status={p.status} />
              </div>

              {/* Action Button */}
              <div className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(p);
                    setConfirmDialogOpen(true);
                  }}
                >
                  {p.status === "active" ? "Deactivate" : "Restore"}
                </Button>
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={selectedProduct?.status === "active" ? "Deactivate Listing" : "Restore Listing"}
        description={`Are you sure you want to ${
          selectedProduct?.status === "active" ? "deactivate" : "restore"
        } "${selectedProduct?.title}"? ${
          selectedProduct?.status === "active"
            ? "It will be hidden from the marketplace browse feed."
            : "It will become visible again to buyers."
        }`}
        confirmLabel={selectedProduct?.status === "active" ? "Deactivate" : "Restore"}
        variant={selectedProduct?.status === "active" ? "destructive" : "default"}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
};

export default AdminMarketplace;
