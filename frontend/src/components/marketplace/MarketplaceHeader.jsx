/**
 * MarketplaceHeader — the shared title row + secondary nav every marketplace
 * page sits under, so the module reads as one surface rather than several
 * loosely-related screens.
 *
 * "Sell an item" is collector-only — selling is restricted to collectors
 * (see App.jsx's route split and marketplaceRoutes.js's `sellerOnly` gate),
 * so household/organization never see a button that would just 403 the
 * moment they clicked it.
 *
 * Wishlist and Messages are icon shortcuts at the extreme right of the
 * title row — not tabs, not a save-for-later or a conversation list someone
 * spends time browsing, just quick jumps. The wishlist heart is always
 * filled red so it reads as "wishlist" at a glance rather than looking like
 * an unfilled toggle waiting to be pressed.
 */

import { Link } from "react-router-dom";
import { Heart, MessageCircle, Plus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import useUnreadMessageCount from "@/hooks/useUnreadMessageCount";
import { Button } from "@/components/ui/button";
import MarketplaceTabs from "@/components/marketplace/MarketplaceTabs";
import { cn } from "@/lib/utils";

const MarketplaceHeader = ({ title = "Marketplace", description, action, className }) => {
  const { role } = useAuth();
  const unreadCount = useUnreadMessageCount("marketplace_product");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {action ??
            (role === "collector" && (
              <Button asChild size="sm">
                <Link to="/marketplace/listings/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Sell an item
                </Link>
              </Button>
            ))}

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
          >
            <Link to="/marketplace/messages">
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
            aria-label="Wishlist"
          >
            <Link to="/marketplace/wishlist">
              <Heart className="h-5 w-5 fill-current" />
            </Link>
          </Button>
        </div>
      </div>

      <MarketplaceTabs />
    </div>
  );
};

export default MarketplaceHeader;
