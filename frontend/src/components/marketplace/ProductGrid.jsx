/**
 * ProductGrid — the responsive listing grid, plus its loading/empty states.
 *
 * Grid steps: 2 columns from the smallest supported width (320px) rather
 * than 1. Marketplace cards are image-led and compact, so two-up stays
 * legible and shows twice as much per screen; a single column of 4:3 tiles
 * would need a scroll per item. Steps up to 3 at sm, 4 at lg.
 */

import { PackageSearch } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/marketplace/ProductCard";
import { cn } from "@/lib/utils";

const GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

/** Skeleton shaped like a real card, so nothing jumps when data lands. */
export const ProductGridSkeleton = ({ count = 8, className }) => (
  <div className={cn(GRID_CLASS, className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="space-y-2 p-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const ProductGrid = ({
  products = [],
  loading = false,
  skeletonCount = 8,
  onWishlistToggled,
  emptyTitle = "No listings found",
  emptyDescription = "Try a different search or clear your filters.",
  emptyAction,
  className,
}) => {
  if (loading) return <ProductGridSkeleton count={skeletonCount} className={className} />;

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onClick}
        className="py-12"
      />
    );
  }

  return (
    <div className={cn(GRID_CLASS, className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onWishlistToggled={onWishlistToggled} />
      ))}
    </div>
  );
};

export default ProductGrid;
