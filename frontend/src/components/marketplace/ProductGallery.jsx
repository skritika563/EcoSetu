/**
 * ProductGallery — the product detail image viewer.
 *
 * Falls back to the same tinted category tile ProductCard uses when a
 * listing has no photos, so an image-less listing looks intentional on both
 * screens rather than broken on one of them.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { getMarketplaceCategory } from "@/config/marketplace";
import { cn } from "@/lib/utils";

const ProductGallery = ({ images = [], category, title, className }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const categoryMeta = getMarketplaceCategory(category);
  const CategoryIcon = categoryMeta.icon;

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-border",
          categoryMeta.tint,
          className
        )}
      >
        <CategoryIcon className="h-10 w-10" />
        <span className="text-sm font-medium">{categoryMeta.label}</span>
        <span className="text-xs opacity-70">No photos provided</span>
      </div>
    );
  }

  const active = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted/40">
        <AnimatePresence mode="wait">
          <motion.img
            key={active.url}
            src={active.url}
            alt={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((img, i) => (
            <button
              key={img.publicId ?? img.url}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View photo ${i + 1} of ${images.length}`}
              aria-current={i === activeIndex}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === activeIndex ? "border-primary" : "border-border hover:border-muted-foreground/40"
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
