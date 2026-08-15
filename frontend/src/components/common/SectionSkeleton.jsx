/**
 * SectionSkeleton — loading placeholders shaped like the content they replace.
 *
 * Built on the shadcn Skeleton primitive. Variants match the real layouts so
 * the page doesn't jump when data arrives.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Row of metric tiles. */
export const StatsSkeleton = ({ count = 4, className }) => (
  <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-7 w-24" />
      </div>
    ))}
  </div>
);

/** Large primary card (dashboard hero). */
export const HeroSkeleton = ({ className }) => (
  <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-3 h-7 w-64 max-w-full" />
    <Skeleton className="mt-2 h-4 w-80 max-w-full" />
    <div className="mt-6 flex gap-3">
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-10 w-28" />
    </div>
  </div>
);

/** Vertical list of items (activity, orders, campaigns). */
export const ListSkeleton = ({ count = 3, className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40 max-w-full" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <Skeleton className="h-5 w-14 shrink-0" />
      </div>
    ))}
  </div>
);

/** Grid of product cards. */
export const CardGridSkeleton = ({ count = 4, className }) => (
  <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
        <Skeleton className="h-24 w-full rounded-none" />
        <div className="space-y-2 p-3">
          <Skeleton className="h-3.5 w-28 max-w-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    ))}
  </div>
);
