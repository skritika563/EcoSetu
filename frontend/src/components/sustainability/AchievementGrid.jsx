/**
 * AchievementGrid — unlocked and locked milestones.
 *
 * Locked entries stay visible but muted: they are the motivation, so hiding
 * them would remove the point. Progress is real (computed from the user's
 * totals), never decorative.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";

import { formatNumber } from "@/lib/format";
import ProgressBar from "@/components/common/ProgressBar";
import AchievementDialog from "@/components/sustainability/AchievementDialog";
import { ACHIEVEMENT_ICONS, FALLBACK_ACHIEVEMENT_ICON } from "@/components/sustainability/achievementIcons";
import { cn } from "@/lib/utils";

const AchievementCard = ({ achievement, index, onSelect }) => {
  const prefersReducedMotion = useReducedMotion();
  const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? FALLBACK_ACHIEVEMENT_ICON;
  const { unlocked, current, target, unit } = achievement;
  const percent = Math.min(100, Math.round((current / target) * 100));

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(achievement)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      aria-label={`${achievement.name}. ${unlocked ? "Unlocked" : `Locked, ${percent} percent complete`}. ${achievement.description}`}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors",
        unlocked
          ? "border-border bg-card hover:border-primary/30"
          : "border-dashed border-border bg-muted/25 hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/70"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium",
            unlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {achievement.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {unlocked
            ? achievement.description
            : `${formatNumber(current, { decimals: unit === "kg" ? 1 : 0 })} / ${formatNumber(target)} ${unit}`}
        </p>
      </div>

      {!unlocked && (
        <ProgressBar
          value={current}
          max={target}
          className="h-1"
          barClassName="bg-muted-foreground/40"
          label={`${achievement.name} progress`}
        />
      )}
    </motion.button>
  );
};

const AchievementGrid = ({ achievements = [], className }) => {
  const [selected, setSelected] = useState(null);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-foreground">Achievements</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Milestones on your sustainability journey
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {unlockedCount} of {achievements.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {achievements.map((achievement, index) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            index={index}
            onSelect={setSelected}
          />
        ))}
      </div>

      <AchievementDialog
        achievement={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </section>
  );
};

export default AchievementGrid;
