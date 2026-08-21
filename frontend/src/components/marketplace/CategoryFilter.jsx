/**
 * CategoryFilter — the horizontally scrollable category chip row.
 *
 * Same mobile-first reasoning as MarketplaceTabs: thirteen categories can't
 * wrap into a readable block on a 320px screen, so they scroll. On desktop
 * the same row simply has room to show more at once.
 */

import { CATEGORY_KEYS, getMarketplaceCategory } from "@/config/marketplace";
import { cn } from "@/lib/utils";

const CategoryFilter = ({ value = "all", onChange, className }) => (
  <div
    className={cn(
      "-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className
    )}
  >
    <div className="flex w-max min-w-full gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        aria-pressed={value === "all"}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          value === "all"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-foreground hover:bg-muted/50"
        )}
      >
        All
      </button>

      {CATEGORY_KEYS.map((key) => {
        const category = getMarketplaceCategory(key);
        const Icon = category.icon;
        const active = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? "all" : key)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {category.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default CategoryFilter;
