/**
 * SellerProfilePage — a buyer-facing view of a collector: who they are,
 * their rating, and how to reach them.
 *
 * Deliberately simple by design, not by omission: this page does NOT show
 * the seller's active listings or sales stats to a buyer — that's the
 * seller's own business, not something every visitor should be able to
 * pull up (see marketplaceOrderController/productController's
 * getSellerProfile, which only ever returns {seller, bio} for this route).
 * `bio` is a placeholder (always null) until the profile module adds one.
 */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, MapPin, Phone, Star } from "lucide-react";

import { useSellerProfile } from "@/hooks/useProducts";
import { formatFriendlyDate, getInitials } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ROLE_LABELS = {
  household: "Household",
  organization: "Organization",
  collector: "EcoSetu Collector",
};

const BackLink = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to="/marketplace">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Marketplace
    </Link>
  </Button>
);

const SellerProfilePage = () => {
  const { sellerId } = useParams();
  const { seller, bio, loading, error, refetch } = useSellerProfile(sellerId);

  if (error) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <ErrorState title="We couldn't load this seller" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!seller) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState title="Seller not found" className="mt-4" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          {seller.profileImage && <AvatarImage src={seller.profileImage} alt="" />}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {getInitials(seller.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight text-foreground">
            <span className="truncate">{seller.name}</span>
            {seller.verified && (
              <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified by EcoSetu" />
            )}
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{ROLE_LABELS[seller.role] ?? seller.role}</span>
            {seller.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                {seller.rating.toFixed(1)}
              </span>
            )}
            {seller.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {seller.city}
              </span>
            )}
            {seller.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {seller.phone}
              </span>
            )}
          </div>

          {seller.memberSince && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              On EcoSetu since {formatFriendlyDate(seller.memberSince)}
            </p>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">About</h2>
        {bio ? (
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{bio}</p>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            This collector hasn't added a bio yet.
          </p>
        )}
      </div>
    </PageContainer>
  );
};

export default SellerProfilePage;
