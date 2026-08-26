/**
 * CampaignCard — one campaign in a grid.
 *
 * The whole card is one link to the campaign's detail page for every role —
 * mirrors ProductCard's own precedent exactly. The detail page itself is
 * where the CTA actually lives (Join/Volunteer for everyone else, Manage
 * for the owner — see CampaignDetailsPage), the same way ProductDetailsPage
 * shows Buy vs Edit/Manage depending on who's looking. The pill at the
 * bottom of the card is just a preview of which one applies, not a second
 * interactive target nested inside the link.
 *
 * IMAGE FALLBACK: a campaign with no banner yet renders a tinted category
 * tile with the category's icon, same reasoning as ProductCard's no-photo
 * state — most campaigns start without a banner, so it's a designed state.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Users } from "lucide-react";

import { getCampaignCategory, getCampaignType, getCampaignTypeLabel } from "@/config/campaigns";
import { formatNumber, formatWeight } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import ProgressBar from "@/components/common/ProgressBar";
import { cn } from "@/lib/utils";

const dateRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString("en-IN", { day: "numeric", month: sameMonth ? undefined : "short" });
  const endFmt = e.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${startFmt} – ${endFmt}`;
};

const CampaignCard = ({ campaign, className }) => {
  const type = getCampaignType(campaign.campaignType);
  const TypeIcon = type.icon;
  const typeLabel = getCampaignTypeLabel(campaign);
  const image = campaign.bannerImage?.url ?? null;

  const ctaLabel = campaign.isOwner
    ? "Manage campaign"
    : campaign.viewerParticipation?.isVolunteer || campaign.viewerParticipation?.isParticipant
      ? "View campaign — you're in"
      : "View campaign";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn("group h-full", className)}
    >
      <Link
        to={`/campaigns/${campaign.id}`}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/40">
          {image ? (
            <img
              src={image}
              alt={campaign.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className={cn("flex h-full w-full flex-col items-center justify-center gap-1.5", type.tint)}>
              <TypeIcon className="h-7 w-7" />
              <span className="text-[11px] font-medium">{typeLabel}</span>
            </div>
          )}
          <div className="absolute left-2 top-2">
            <StatusBadge status={campaign.status} className="shadow-sm" />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{campaign.name}</p>

          {campaign.organization && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{campaign.organization.name}</span>
              {campaign.organization.verified && (
                <BadgeCheck className="h-3 w-3 shrink-0 text-primary" aria-label="Verified organization" />
              )}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", type.tint)}>
              <TypeIcon className="h-3 w-3" />
              {typeLabel}
            </span>
            {campaign.categories?.map((key) => {
              const cat = getCampaignCategory(key);
              return (
                <span key={key} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {cat.label}
                </span>
              );
            })}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{dateRange(campaign.startDate, campaign.endDate)}</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {campaign.location?.city}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              {formatNumber(campaign.participantCount)} participants
            </span>
          </div>

          {campaign.targetWeightKg > 0 && (
            <div className="mt-3">
              <ProgressBar
                value={campaign.collectedWeightKg}
                max={campaign.targetWeightKg}
                label={`${campaign.name} collection progress`}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {formatWeight(campaign.collectedWeightKg)} / {formatWeight(campaign.targetWeightKg)} collected
              </p>
            </div>
          )}
          {campaign.targetSaplings > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Target: {formatNumber(campaign.targetSaplings)} saplings</p>
          )}
          {campaign.expectedStalls > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{formatNumber(campaign.expectedStalls)} stalls expected</p>
          )}

          <div className="mt-auto pt-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                campaign.isOwner ? "bg-ecosetu-orange/15 text-ecosetu-orange" : "bg-primary/10 text-primary"
              )}
            >
              {ctaLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CampaignCard;
