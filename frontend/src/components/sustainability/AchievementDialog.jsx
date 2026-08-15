/**
 * AchievementDialog — detail for a single achievement.
 *
 * Shows real progress against the requirement rather than a bare locked badge,
 * so a locked achievement reads as "almost there" instead of "denied".
 */

import { formatNumber } from "@/lib/format";
import ProgressBar from "@/components/common/ProgressBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACHIEVEMENT_ICONS, FALLBACK_ACHIEVEMENT_ICON } from "@/components/sustainability/achievementIcons";
import { cn } from "@/lib/utils";

const AchievementDialog = ({ achievement, open, onOpenChange }) => {
  if (!achievement) return null;

  const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? FALLBACK_ACHIEVEMENT_ICON;
  const { current, target, unit, unlocked } = achievement;
  const remaining = Math.max(0, target - current);
  const percent = Math.min(100, (current / target) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="font-heading text-base">{achievement.name}</DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unlocked ? "Unlocked" : "Locked"}
                {unlocked && achievement.unlockedAt ? ` · ${achievement.unlockedAt}` : ""}
              </p>
            </div>
          </div>
          <DialogDescription className="text-left">{achievement.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatNumber(current, { decimals: unit === "kg" ? 1 : 0 })} /{" "}
              {formatNumber(target)} {unit}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(percent)}%</span>
          </div>

          <ProgressBar value={current} max={target} label={`${achievement.name} progress`} />

          <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
            {unlocked ? (
              <>
                🎉 Achievement unlocked — you&apos;ve joined the{" "}
                <span className="font-medium text-foreground">{achievement.name}</span>.
              </>
            ) : (
              <>
                Almost there. {formatNumber(remaining, { decimals: unit === "kg" ? 1 : 0 })}{" "}
                {unit} to go to unlock this achievement.
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementDialog;
