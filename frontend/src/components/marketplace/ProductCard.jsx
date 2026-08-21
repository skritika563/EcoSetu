/**
 * ProductCard — one marketplace listing in a grid or a scroll row.
 *
 * IMAGE FALLBACK: a listing with no photo renders a tinted category tile
 * with the category's own icon, not a broken <img> or a grey box. Most
 * genuine listings start without photos, so the no-image case is a designed
 * state rather than an error state.
 *
 * Keyed by the real product id everywhere — never an array index.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";

import { getMarketplaceCategory, getCondition } from "@/config/marketplace";
import { formatCurrency } from "@/lib/format";
import WishlistButton from "@/components/marketplace/WishlistButton";
import { cn } from "@/lib/utils";

const ProductCard = ({ product, onWishlistToggled, className }) => {
  const category = getMarketplaceCategory(product.category);
  const CategoryIcon = category.icon;
  const image = product.images?.[0]?.url ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn("group h-full", className)}
    >
      <Link
        to={`/marketplace/product/${product.id}`}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
      >
        {/* Media */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
          {image ? (
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className={cn("flex h-full w-full flex-col items-center justify-center gap-1.5", category.tint)}>
              <CategoryIcon className="h-7 w-7" />
              <span className="text-[11px] font-medium">{category.label}</span>
            </div>
          )}

          <div className="absolute right-2 top-2">
            <WishlistButton
              productId={product.id}
              isWishlisted={product.isWishlisted}
              onToggled={onWishlistToggled}
              size="sm"
            />
          </div>

          {/* Provenance — only ever shown when the listing is genuinely
              linked to a completed EcoSetu pickup (backend sets ecoVerified
              from a real sourcePickup ref; it can't be self-declared). */}
          {product.ecoVerified && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
              <ShieldCheck className="h-3 w-3" />
              EcoSetu Verified
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.title}</p>

          <p className="mt-1.5 font-heading text-base font-semibold text-foreground">
            {formatCurrency(product.price)}
            {product.unit === "kg" && (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">/kg</span>
            )}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", category.tint)}>
              <CategoryIcon className="h-3 w-3" />
              {category.label}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {getCondition(product.condition).label}
            </span>
          </div>

          {/* Footer pinned to the bottom so cards in a row line up regardless
              of how many lines the title wrapped to. */}
          <div className="mt-auto space-y-1 pt-2.5">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {product.location?.area ? `${product.location.area}, ` : ""}
                {product.location?.city}
              </span>
            </p>

            {product.seller && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="truncate">{product.seller.name}</span>
                {product.seller.verified && (
                  <BadgeCheck className="h-3 w-3 shrink-0 text-primary" aria-label="Verified seller" />
                )}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
