/**
 * SellerCard — who's selling, shown on the product detail page.
 *
 * Every value here is real and server-supplied. `rating` is only present for
 * collectors (the only role that currently carries one), and the component
 * simply omits the stars for everyone else rather than inventing a default —
 * a fabricated "5.0" next to a stranger's name would be actively misleading
 * to a buyer deciding whether to trust them.
 *
 * OWNER VIEW: when the viewer owns this listing, "seller" is just them —
 * a "View seller profile" link would send them to look at their own
 * profile, which isn't useful. `isOwner` swaps that one action for "View
 * customer details", pointing at Orders Received where the people who
 * bought from them actually show up.
 */

import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, MessageCircle, Star, Users } from "lucide-react";

import { formatFriendlyDate, getInitials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  household: "Household",
  organization: "Organization",
  collector: "EcoSetu Collector",
};

const SellerCard = ({ seller, onContact, isOwner = false, onViewCustomers, viewingCustomers, className }) => {
  if (!seller) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seller</p>

      <div className="mt-3 flex items-center gap-3">
        <Avatar className="h-11 w-11">
          {seller.profileImage && <AvatarImage src={seller.profileImage} alt="" />}
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(seller.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
            <span className="truncate">{seller.name}</span>
            {seller.verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified by EcoSetu" />
            )}
          </p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[seller.role] ?? seller.role}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {seller.rating != null && (
          <p className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />
            {seller.rating.toFixed(1)} collector rating
          </p>
        )}
        {seller.city && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {seller.city}
          </p>
        )}
        {seller.memberSince && <p>On EcoSetu since {formatFriendlyDate(seller.memberSince)}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={onViewCustomers} disabled={viewingCustomers}>
            <Users className="mr-1.5 h-3.5 w-3.5" />
            {viewingCustomers ? "Checking…" : "View customer details"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/marketplace/seller/${seller.id}`}>View seller profile</Link>
            </Button>
            {onContact && (
              <Button variant="ghost" size="sm" onClick={onContact}>
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Contact seller
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SellerCard;
