/**
 * OverviewPanel — the Management dashboard's landing tab: a real-time
 * snapshot (stat cards + progress), not the deeper charted history that
 * lives in the Analytics tab.
 *
 * Every number comes from `campaign.impact`, computed server-side by
 * campaignController.getCampaignById for every viewer — never recomputed
 * here, so this can never drift from what the campaign detail page itself
 * shows for the exact same campaign.
 */

import { Award, HandHeart, Recycle, Sparkles, Users } from "lucide-react";

import { formatNumber, formatWeight } from "@/lib/format";
import StatCard from "@/components/common/StatCard";
import CampaignProgress from "@/components/campaigns/CampaignProgress";

const OverviewPanel = ({ campaign }) => {
  const impact = campaign.impact ?? {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Participants" value={campaign.participantCount} icon={Users} />
        <StatCard label="Volunteers" value={campaign.volunteerCount} icon={HandHeart} />
        <StatCard label="Scrap collected" value={campaign.collectedWeightKg} format={(v) => formatWeight(v)} icon={Recycle} />
        <StatCard label="CO₂ saved" value={impact.co2SavedKg ?? 0} format={(v) => `${formatNumber(v, { decimals: 1 })} kg`} icon={Sparkles} />
      </div>

      <div className="max-w-xs">
        <StatCard label="Eco Points generated" value={impact.totalEcoPointsGenerated ?? 0} icon={Award} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-heading text-sm font-semibold text-foreground">Target progress</h3>
        <CampaignProgress campaign={campaign} />
      </div>
    </div>
  );
};

export default OverviewPanel;
