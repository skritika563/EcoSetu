/**
 * MarketplacePreview — a handful of live listings, nothing more.
 *
 * Browsing, filtering, cart and checkout all belong to the Marketplace module.
 * Listings without an image fall back to a category tile, so real Cloudinary
 * URLs can be dropped into the data later with no component change.
 */

import { BadgeCheck, MapPin, Store } from "lucide-react";

import { getCategory } from "@/config/domain";
import { notifyComingSoon } from "@/lib/comingSoon";
import { formatCurrency } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";

const ListingCard = ({ listing }) => {
  const category = getCategory(listing.category);
  const CategoryIcon = category.icon;

  return (
    <button
      type="button"
      onClick={() => notifyComingSoon("Marketplace")}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/30"
    >
      {/* Image, or a category tile until real images exist */}
      <div className={cn("flex h-24 items-center justify-center", category.tint)}>
        {listing.image ? (
          <img
            src={listing.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <CategoryIcon className="h-7 w-7 opacity-70" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-sm font-medium text-foreground">{listing.name}</p>

        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {listing.location.area}, {listing.location.city}
          </span>
        </p>

        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="font-heading text-sm font-semibold text-foreground">
            {formatCurrency(listing.pricePerKg, { decimals: 2 })}
            <span className="text-xs font-normal text-muted-foreground">/kg</span>
          </span>
          {listing.seller.verified && (
            <span
              className="flex items-center gap-0.5 text-[11px] font-medium text-primary"
              title={`${listing.seller.name} is a verified collector`}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const MarketplacePreview = ({ listings = [], className }) => (
  <section className={className} aria-label="Marketplace preview">
    <SectionHeader
      title="From the marketplace"
      description="Recycled material listed by verified collectors near you"
      actionLabel="View Marketplace"
      onAction={() => notifyComingSoon("Marketplace")}
    />

    {listings.length === 0 ? (
      <EmptyState
        icon={Store}
        title="No listings nearby yet"
        description="Verified collectors in your city will list sorted material here."
      />
    ) : (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    )}
  </section>
);

export default MarketplacePreview;
