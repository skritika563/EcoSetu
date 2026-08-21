/**
 * MarketplaceTabs — the module's secondary navigation.
 *
 * MOBILE PATTERN, deliberately chosen: a horizontally scrollable pill row,
 * NOT extra items in the global bottom navigation. The bottom bar stays at
 * its four primary destinations (config/navigation.js) — adding six more
 * marketplace destinations there would wreck the app-wide navigation for
 * one module's sake. Desktop gets the same row, laid out inline.
 *
 * The scroll row hides its scrollbar but stays touch-scrollable, with the
 * container bleeding to the viewport edge on mobile so the last pill isn't
 * visually clipped mid-word.
 */

import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { getMarketplaceTabs } from "@/config/marketplace";
import { cn } from "@/lib/utils";

const MarketplaceTabs = ({ className }) => {
  const location = useLocation();
  const { role } = useAuth();
  const tabs = getMarketplaceTabs(role);

  const isActive = (to) =>
    to === "/marketplace"
      ? location.pathname === "/marketplace"
      : location.pathname.startsWith(to);

  return (
    <nav
      aria-label="Marketplace sections"
      className={cn(
        // -mx-4 + px-4 lets the row scroll edge-to-edge on mobile while its
        // content still lines up with the page gutter.
        "-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <div className="flex w-max min-w-full gap-1.5 border-b border-border pb-2 sm:w-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.to);
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.to === "/marketplace"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MarketplaceTabs;
