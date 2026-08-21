/**
 * WishlistPage — saved listings, persisted server-side per user.
 *
 * Removing a card here drops it from the list immediately (optimistically)
 * and confirms against the backend; a failure refetches the authoritative
 * list rather than guessing what should still be there.
 */

import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import { useWishlist } from "@/hooks/useWishlist";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import ProductGrid from "@/components/marketplace/ProductGrid";

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, loading, error, refetch } = useWishlist();

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <MarketplaceHeader
        title="Wishlist"
        description="Listings you've saved. Only you can see this."
      />

      {error ? (
        <ErrorState title="Unable to load your wishlist" description={error} onRetry={refetch} />
      ) : (
        <ProductGrid
          products={wishlist}
          loading={loading}
          // Removing from the grid re-syncs from the server, so a heart
          // toggled off here disappears rather than lingering as a saved card.
          onWishlistToggled={() => refetch()}
          emptyTitle="Nothing saved yet"
          emptyDescription="Tap the heart on any listing to keep it here for later."
          emptyAction={{ label: "Browse the marketplace", onClick: () => navigate("/marketplace") }}
        />
      )}

      {!loading && !error && wishlist.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Heart className="h-3 w-3" />
          {wishlist.length} saved {wishlist.length === 1 ? "listing" : "listings"}
        </p>
      )}
    </PageContainer>
  );
};

export default WishlistPage;
