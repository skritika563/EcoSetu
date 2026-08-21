/**
 * MarketplaceBrowse — the marketplace landing page.
 *
 * TWO MODES, one page:
 *   - Idle (no search, no filters): curated section rows — Featured, Nearby,
 *     Recently Added, Under ₹500, Trending. Each is a real backend query
 *     (see productController.getProductSections), not a client-side reshuffle.
 *   - Searching/filtering: a single flat result grid, because rows of
 *     sections are the wrong shape for "show me what matches".
 *
 * Sections that come back empty simply don't render — a brand-new
 * marketplace with no eco-verified listings shows no Featured row rather
 * than an empty shelf.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useProducts, useProductSections, useMarketplaceStats } from "@/hooks/useProducts";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { EMPTY_FILTERS, countActiveFilters } from "@/config/marketplace";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import SectionHeader from "@/components/common/SectionHeader";
import { Input } from "@/components/ui/input";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import CategoryFilter from "@/components/marketplace/CategoryFilter";
import ProductFilters from "@/components/marketplace/ProductFilters";
import ProductGrid, { ProductGridSkeleton } from "@/components/marketplace/ProductGrid";
import ProductCard from "@/components/marketplace/ProductCard";
import SellerSummaryPanel from "@/components/marketplace/SellerSummaryPanel";

/** A horizontally scrollable row — used for every curated section. */
const SectionRow = ({ title, description, products, onWishlistToggled }) => {
  if (!products || products.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} description={description} className="mb-3" />
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-3 sm:gap-4">
          {products.map((product) => (
            <div key={product.id} className="w-[46vw] max-w-[220px] shrink-0 sm:w-52">
              <ProductCard product={product} onWishlistToggled={onWishlistToggled} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MarketplaceBrowse = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Debounced so typing doesn't fire a request per keystroke.
  const search = useDebouncedValue(searchInput, 350);

  const isFiltering =
    !!search.trim() || category !== "all" || countActiveFilters(filters) > 0;

  const queryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      category,
      condition: filters.condition,
      city: filters.city?.trim() || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      ecoVerified: filters.ecoVerified ? "true" : undefined,
      sort: filters.sort,
    }),
    [search, category, filters]
  );

  // Only the active mode fetches — an idle browse (curated sections) never
  // also runs a full filtered query in the background.
  const {
    products,
    pagination,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
    patchProduct,
  } = useProducts(queryFilters, { enabled: isFiltering });

  const {
    sections,
    loading: sectionsLoading,
    error: sectionsError,
    refetch: refetchSections,
    patchProduct: patchSectionProduct,
  } = useProductSections();

  const { stats, loading: statsLoading } = useMarketplaceStats();

  const handleWishlistToggled = (productId, isWishlisted) => {
    patchProduct(productId, { isWishlisted });
    patchSectionProduct(productId, { isWishlisted });
  };

  const error = isFiltering ? productsError : sectionsError;
  const retry = isFiltering ? refetchProducts : refetchSections;

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <MarketplaceHeader description="Buy and sell reusable, recovered and upcycled goods." />

      {/* Seller panel — real aggregates. Given prominence for collectors,
          for whom selling is core work rather than occasional. */}
      {(role === "collector" || (stats && (stats.activeListings > 0 || stats.itemsSold > 0))) && (
        <SellerSummaryPanel stats={stats} loading={statsLoading} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, material, category or city"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          aria-label="Search the marketplace"
        />
      </div>

      <CategoryFilter value={category} onChange={setCategory} />

      <ProductFilters filters={filters} onChange={setFilters} />

      {error ? (
        <ErrorState title="Unable to load the marketplace" description={error} onRetry={retry} />
      ) : isFiltering ? (
        <div className="space-y-3">
          {!productsLoading && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? "listing" : "listings"} found
            </p>
          )}
          <ProductGrid
            products={products}
            loading={productsLoading}
            onWishlistToggled={handleWishlistToggled}
            emptyTitle="No listings match your search"
            emptyDescription="Try a different term, or clear your filters to see everything."
          />
        </div>
      ) : sectionsLoading ? (
        <ProductGridSkeleton count={8} />
      ) : sections ? (
        <div className="space-y-8">
          <SectionRow
            title="EcoSetu Verified"
            description="Collected and verified through our own pickup network"
            products={sections.featured}
            onWishlistToggled={handleWishlistToggled}
          />
          <SectionRow
            title={sections.viewerCity ? `Near you in ${sections.viewerCity}` : "Nearby"}
            products={sections.nearby}
            onWishlistToggled={handleWishlistToggled}
          />
          <SectionRow
            title="Recently added"
            products={sections.recent}
            onWishlistToggled={handleWishlistToggled}
          />
          <SectionRow
            title="Under ₹500"
            products={sections.underFive}
            onWishlistToggled={handleWishlistToggled}
          />
          <SectionRow
            title="Trending"
            description="Most viewed this week"
            products={sections.trending}
            onWishlistToggled={handleWishlistToggled}
          />

          {/* Genuinely empty marketplace — every section came back empty. */}
          {["featured", "nearby", "recent", "underFive", "trending"].every(
            (key) => (sections[key] ?? []).length === 0
          ) && (
            <ProductGrid
              products={[]}
              emptyTitle="The marketplace is empty right now"
              emptyDescription="Be the first to list something — recovered materials, reusable goods or upcycled products."
              emptyAction={{ label: "Sell an item", onClick: () => navigate("/marketplace/listings/new") }}
            />
          )}
        </div>
      ) : null}
    </PageContainer>
  );
};

export default MarketplaceBrowse;
