/**
 * BottomNavigation — mobile primary navigation for authenticated users.
 *
 * Mobile gets a real mobile pattern rather than a shrunken desktop navbar:
 * primary destinations sit within thumb reach, while the top bar keeps only
 * brand, notifications and profile.
 *
 * Hidden on md+ (the navbar takes over) and for roles without a primary nav
 * (admin). Items share config/navigation.js with the desktop navbar.
 */

import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { getPrimaryNav } from "@/config/navigation";
import { notifyComingSoon } from "@/lib/comingSoon";
import { cn } from "@/lib/utils";

const itemClasses = (isActive) =>
  cn(
    "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  );

const BottomNavigation = () => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  const items = getPrimaryNav(role);
  if (!isAuthenticated || items.length === 0) return null;

  return (
    <nav
      id="bottom-navigation"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;

          if (!item.available) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => notifyComingSoon(item.label)}
                className={itemClasses(false)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          }

          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={itemClasses(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
