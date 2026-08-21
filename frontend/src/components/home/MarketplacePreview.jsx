/**
 * MarketplacePreview — a handful of real listings on the Home dashboard.
 *
 * Now that the Marketplace module exists, this shows REAL listings from
 * /api/marketplace (via useDashboardData) and links into the real module —
 * it previously rendered mock data behind a "coming soon" toast, which
 * would now be both fake and a dead end.
 *
 * Reuses the marketplace's own ProductCard rather than keeping a
 * near-duplicate card here, so a listing looks and behaves identically on
 * Home and in the marketplace itself.
 */

import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";

import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import ProductCard from "@/components/marketplace/ProductCard";

const MarketplacePreview = ({ listings = [], className }) => {
  const navigate = useNavigate();

  return (
    <section className={className} aria-label="Marketplace preview">
      <SectionHeader
        title="From the marketplace"
        description="Reusable and recovered goods listed near you"
        actionLabel="View Marketplace"
        onAction={() => navigate("/marketplace")}
      />

      {listings.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No listings yet"
          description="Recovered materials and reusable goods will show up here as people list them."
          actionLabel="Browse the marketplace"
          onAction={() => navigate("/marketplace")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ProductCard key={listing.id} product={listing} />
          ))}
        </div>
      )}
    </section>
  );
};

export default MarketplacePreview;
