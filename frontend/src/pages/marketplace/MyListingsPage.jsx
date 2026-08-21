/**
 * MyListingsPage — the seller's own listings, split by status.
 *
 * This is the only surface where drafts, inactive and sold listings are
 * visible; the backend scopes /products/mine to the authenticated seller, so
 * there is no client-side ownership filtering that could be wrong.
 *
 * Deleting a listing that already has orders DEACTIVATES it instead — the
 * backend decides which happened and says so in the response, and the toast
 * reflects the real outcome rather than assuming a delete.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, PackagePlus, Pencil, Trash2 } from "lucide-react";

import { useListings } from "@/hooks/useListings";
import { LISTING_TABS, getMarketplaceCategory } from "@/config/marketplace";
import { formatCurrency, formatFriendlyDate } from "@/lib/format";
import * as productService from "@/services/productService";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import { cn } from "@/lib/utils";

const EMPTY_COPY = {
  active: "You don't have any active listings.",
  draft: "No drafts saved.",
  sold: "Nothing sold yet.",
  inactive: "No inactive listings.",
};

const ListingRow = ({ listing, onDelete, onMarkSold }) => {
  const category = getMarketplaceCategory(listing.category);
  const CategoryIcon = category.icon;
  const image = listing.images?.[0]?.url ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex gap-3 rounded-xl border border-border bg-card p-3 sm:p-4"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border sm:h-20 sm:w-20">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", category.tint)}>
            <CategoryIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{listing.title}</p>

        <p className="mt-1 font-heading text-sm font-semibold text-foreground">
          {formatCurrency(listing.price)}
          {listing.unit === "kg" && <span className="text-xs font-normal text-muted-foreground">/kg</span>}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            {listing.quantity} {listing.unit === "kg" ? "kg" : "left"}
          </span>
          <span>·</span>
          <span>
            {listing.views} {listing.views === 1 ? "view" : "views"}
          </span>
          <span>·</span>
          <span>{formatFriendlyDate(listing.createdAt)}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
            <Link to={`/marketplace/product/${listing.id}`}>
              <Eye className="mr-1 h-3 w-3" />
              View
            </Link>
          </Button>

          {listing.status !== "sold" && (
            <>
              <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
                <Link to={`/marketplace/listings/${listing.id}/edit`}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onMarkSold(listing)}
              >
                Mark sold
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(listing)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const MyListingsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("active");
  const { listings, loading, error, refetch, removeLocal, patchLocal } = useListings(tab);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [working, setWorking] = useState(false);

  const handleDelete = async () => {
    setWorking(true);
    try {
      const result = await productService.deleteProduct(deleteTarget.id);
      // The backend decides delete vs deactivate — report what it actually did.
      if (result.deactivated) {
        toast.success("This listing has orders, so it was deactivated instead of deleted.");
        refetch();
      } else {
        toast.success("Listing deleted");
        removeLocal(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Couldn't delete this listing.");
    } finally {
      setWorking(false);
    }
  };

  const handleMarkSold = async (listing) => {
    try {
      await productService.markProductSold(listing.id);
      toast.success("Marked as sold");
      // It no longer belongs in the current tab — drop it locally rather
      // than leaving a "sold" row sitting under Active.
      if (tab !== "sold") removeLocal(listing.id);
      else patchLocal(listing.id, { status: "sold" });
    } catch (err) {
      toast.error(err.message || "Couldn't update this listing.");
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <MarketplaceHeader title="My Listings" description="Everything you've put up for sale." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-fit">
          {LISTING_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {LISTING_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {error ? (
              <ErrorState title="Unable to load your listings" description={error} onRetry={refetch} />
            ) : loading ? (
              <ListSkeleton count={3} />
            ) : listings.length === 0 ? (
              <EmptyState
                icon={PackagePlus}
                title={EMPTY_COPY[t.value]}
                description={
                  t.value === "active"
                    ? "List something you no longer need — someone else probably does."
                    : undefined
                }
                actionLabel={t.value === "active" ? "Create a listing" : undefined}
                onAction={t.value === "active" ? () => navigate("/marketplace/listings/new") : undefined}
                className="py-12"
              />
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    onDelete={setDeleteTarget}
                    onMarkSold={handleMarkSold}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.title}" will be removed from the marketplace. If it already has orders,
              it will be deactivated instead so those orders stay intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={working}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={working}>
              {working ? "Deleting…" : "Delete listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default MyListingsPage;
