/**
 * CampaignProgress — participants + scrap collected, as twin progress bars.
 *
 * Either row is omitted when the campaign didn't set that target (a
 * plantation/awareness drive may have no weight target at all) — an empty
 * "0 / 0 kg" bar would be noise, not information.
 */

import { Recycle, Users } from "lucide-react";

import { formatNumber, formatWeight } from "@/lib/format";
import ProgressBar from "@/components/common/ProgressBar";

const Row = ({ icon: Icon, label, value, max, valueLabel }) => {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{percent}%</span>
      </div>
      <ProgressBar value={value} max={max} label={`${label} progress`} />
      <p className="text-xs text-muted-foreground">{valueLabel}</p>
    </div>
  );
};

const CampaignProgress = ({ campaign, className }) => {
  const showParticipants = campaign.targetParticipants > 0;
  const showWeight = campaign.targetWeightKg > 0;

  if (!showParticipants && !showWeight) return null;

  return (
    <div className={className}>
      <div className="space-y-4">
        {showParticipants && (
          <Row
            icon={Users}
            label="Participants"
            value={campaign.participantCount}
            max={campaign.targetParticipants}
            valueLabel={`${formatNumber(campaign.participantCount)} / ${formatNumber(campaign.targetParticipants)} joined`}
          />
        )}
        {showWeight && (
          <Row
            icon={Recycle}
            label="Scrap collected"
            value={campaign.collectedWeightKg}
            max={campaign.targetWeightKg}
            valueLabel={`${formatWeight(campaign.collectedWeightKg)} / ${formatWeight(campaign.targetWeightKg)} collected`}
          />
        )}
      </div>
    </div>
  );
};

export default CampaignProgress;
