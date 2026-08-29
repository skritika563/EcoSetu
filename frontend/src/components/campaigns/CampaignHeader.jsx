/**
 * CampaignHeader — the shared title row every Campaigns page sits under.
 * Mirrors components/marketplace/MarketplaceHeader.jsx's title/description/
 * action shape (no tabs row — Campaigns' own status filter lives inline on
 * the browse page, not as page-level navigation).
 */

import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Plus, UserCircle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import useUnreadMessageCount from "@/hooks/useUnreadMessageCount";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `showMineLink` gives every role a one-click path to their own personal
 * campaign list from the browse page — organizers to what they run
 * (MyCampaignsPage), everyone else to what they've joined
 * (MyParticipationPage). Off by default so pages that already ARE one of
 * those lists (MyCampaignsPage itself) don't link to themselves.
 *
 * `showBack` renders a "back" row above the title, for pages reached from
 * more than one place (e.g. MyParticipationPage, opened from Home's quick
 * actions as well as from the browse page) where there's no single "parent"
 * nav item to fall back on — `navigate(-1)` just retraces however the
 * viewer actually got here. Off by default: CampaignsBrowse/MyCampaignsPage
 * ARE the destination the top nav's "Campaigns" item points at, so they
 * don't need one.
 */
const CampaignHeader = ({
  title = "Campaigns",
  description,
  action,
  showCreateAction = false,
  showMineLink = false,
  showBack = false,
  className,
}) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isOrganizer = role === "organization";
  const unreadCount = useUnreadMessageCount("campaign");

  return (
    <div className={cn("space-y-2", className)}>
      {showBack && (
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showMineLink && (
            <Button variant="outline" size="sm" asChild>
              <Link to={isOrganizer ? "/campaigns/mine" : "/campaigns/mine/participation"}>
                <UserCircle className="mr-1.5 h-4 w-4" />
                My Campaigns
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
          >
            <Link to="/campaigns/messages">
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          {action ??
            (showCreateAction && isOrganizer && (
              <Button asChild size="sm">
                <Link to="/campaigns/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create campaign
                </Link>
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignHeader;
