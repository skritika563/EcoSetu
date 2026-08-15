/**
 * YearlyEcoTree — the whole year's activity as a single growing tree.
 *
 * One leaf cluster per active month, positioned deterministically around the
 * canopy. Cluster size and colour scale with that month's Eco Activity Score,
 * so a strong month is visibly denser and deeper green.
 *
 * Performance: clusters, not individual activities. Twelve clusters of up to
 * six leaves caps the tree at ~72 shapes regardless of how active the user is.
 *
 * Accessibility: the SVG is purely decorative; interaction lives on real
 * overlaid buttons with full aria-labels, so the tree is keyboard-navigable
 * and the tooltip is never the only source of the numbers.
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { TREE_STAGES } from "@/data/sustainabilityData";
import { formatNumber } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VIEW_W = 240;
const VIEW_H = 220;
const GROUND_Y = 198;
const TRUNK_X = 120;

/** Twelve deterministic canopy anchors, roughly crown-shaped. */
const CANOPY_ANCHORS = [
  { x: 120, y: 54 }, { x: 88, y: 64 }, { x: 152, y: 64 },
  { x: 104, y: 82 }, { x: 136, y: 82 }, { x: 66, y: 88 },
  { x: 174, y: 88 }, { x: 120, y: 104 }, { x: 80, y: 114 },
  { x: 160, y: 114 }, { x: 98, y: 132 }, { x: 142, y: 132 },
];

/** Green ramp — also drives the legend, so colour always means the same thing. */
const LEAF_TONES = ["#A8CBB4", "#7FB394", "var(--ecosetu-secondary)", "var(--ecosetu-primary)"];

/** Legend entries — colour always means the same thing as the canopy. */
const TONE_LEGEND = [
  { tone: LEAF_TONES[0], label: "New activity" },
  { tone: LEAF_TONES[1], label: "Growing" },
  { tone: LEAF_TONES[2], label: "Active month" },
  { tone: LEAF_TONES[3], label: "High activity" },
];

const toneFor = (intensity) => {
  if (intensity >= 0.75) return LEAF_TONES[3];
  if (intensity >= 0.5) return LEAF_TONES[2];
  if (intensity >= 0.25) return LEAF_TONES[1];
  return LEAF_TONES[0];
};

/** Stable pseudo-random offsets so the canopy never reshuffles between renders. */
const jitter = (seed, spread) => {
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * spread;
};

const buildCluster = (anchor, monthIndex, intensity) => {
  const leafCount = 3 + Math.round(intensity * 3); // 3–6
  const tone = toneFor(intensity);
  const radius = 9 + intensity * 5;

  return Array.from({ length: leafCount }, (_, i) => {
    const angle = (i / leafCount) * Math.PI * 2 + monthIndex;
    return {
      id: `${monthIndex}-${i}`,
      cx: anchor.x + Math.cos(angle) * radius + jitter(monthIndex * 7 + i, 4),
      cy: anchor.y + Math.sin(angle) * radius * 0.72 + jitter(monthIndex * 13 + i, 3),
      rx: 7.5 + intensity * 2.2,
      ry: 4.6 + intensity * 1.4,
      rotate: (angle * 180) / Math.PI + jitter(monthIndex + i, 30),
      tone,
    };
  });
};

const YearlyEcoTree = ({ months = [], summary, className }) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeMonth, setActiveMonth] = useState(null);

  const treeStage = summary?.treeStage ?? 0;
  const stageMeta = TREE_STAGES[treeStage] ?? TREE_STAGES[0];

  const activeMonths = months.filter((m) => m.contributionScore > 0);
  const peakScore = Math.max(...months.map((m) => m.contributionScore), 1);

  // Trunk and canopy scale gently with the year's overall stage.
  const trunkTop = GROUND_Y - (74 + treeStage * 7);
  const canopyScale = 0.62 + treeStage * 0.076;

  const clusters = activeMonths.map((month) => {
    const monthIndex = months.indexOf(month);
    const anchor = CANOPY_ANCHORS[monthIndex % CANOPY_ANCHORS.length];
    const intensity = Math.min(1, month.contributionScore / peakScore);
    return { month, monthIndex, anchor, intensity, leaves: buildCluster(anchor, monthIndex, intensity) };
  });

  const isEmpty = clusters.length === 0;

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-center", className)}>
      {/* ─── Tree ─────────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:w-[22rem]">
        <div className="relative aspect-[240/220] w-full">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Your ${summary?.year ?? ""} eco tree: ${stageMeta.label}, grown from ${activeMonths.length} active months.`}
          >
            {/* Ground */}
            <ellipse cx={TRUNK_X} cy={GROUND_Y + 4} rx="62" ry="7" className="fill-muted" />

            {/* Trunk */}
            <motion.path
              d={`M ${TRUNK_X - 8} ${GROUND_Y}
                  C ${TRUNK_X - 6} ${GROUND_Y - 30}, ${TRUNK_X - 4} ${trunkTop + 30}, ${TRUNK_X - 3} ${trunkTop}
                  L ${TRUNK_X + 3} ${trunkTop}
                  C ${TRUNK_X + 4} ${trunkTop + 30}, ${TRUNK_X + 6} ${GROUND_Y - 30}, ${TRUNK_X + 8} ${GROUND_Y} Z`}
              fill="#8A6244"
              initial={prefersReducedMotion ? false : { scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: `${TRUNK_X}px ${GROUND_Y}px` }}
            />

            {/* Branches — appear as the tree matures */}
            {treeStage >= 2 && (
              <motion.g
                stroke="#8A6244"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <path d={`M ${TRUNK_X} ${trunkTop + 34} Q ${TRUNK_X - 26} ${trunkTop + 20} ${TRUNK_X - 38} ${trunkTop + 2}`} />
                <path d={`M ${TRUNK_X} ${trunkTop + 34} Q ${TRUNK_X + 26} ${trunkTop + 20} ${TRUNK_X + 38} ${trunkTop + 2}`} />
                {treeStage >= 4 && (
                  <>
                    <path d={`M ${TRUNK_X} ${trunkTop + 58} Q ${TRUNK_X - 30} ${trunkTop + 52} ${TRUNK_X - 44} ${trunkTop + 34}`} />
                    <path d={`M ${TRUNK_X} ${trunkTop + 58} Q ${TRUNK_X + 30} ${trunkTop + 52} ${TRUNK_X + 44} ${trunkTop + 34}`} />
                  </>
                )}
              </motion.g>
            )}

            {/* Canopy — one cluster per active month */}
            <g
              style={{ transformOrigin: `${TRUNK_X}px 100px` }}
              transform={`translate(${TRUNK_X} 100) scale(${canopyScale}) translate(${-TRUNK_X} ${-100})`}
            >
              {clusters.map(({ month, monthIndex, leaves }, clusterIndex) => (
                <motion.g
                  key={month.month}
                  animate={{
                    scale: activeMonth === monthIndex ? 1.12 : 1,
                    opacity: activeMonth === null || activeMonth === monthIndex ? 1 : 0.45,
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    transformOrigin: `${CANOPY_ANCHORS[monthIndex % CANOPY_ANCHORS.length].x}px ${
                      CANOPY_ANCHORS[monthIndex % CANOPY_ANCHORS.length].y
                    }px`,
                  }}
                >
                  {leaves.map((leaf, leafIndex) => (
                    <motion.ellipse
                      key={leaf.id}
                      cx={leaf.cx}
                      cy={leaf.cy}
                      rx={leaf.rx}
                      ry={leaf.ry}
                      fill={leaf.tone}
                      transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
                      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.5 + clusterIndex * 0.06 + leafIndex * 0.02,
                        ease: "easeOut",
                      }}
                      style={{ transformOrigin: `${leaf.cx}px ${leaf.cy}px` }}
                    />
                  ))}
                </motion.g>
              ))}

              {/* Brand-new account: two small starter leaves */}
              {isEmpty && (
                <>
                  <ellipse cx={TRUNK_X - 9} cy={trunkTop + 4} rx="8" ry="4.4" fill={LEAF_TONES[0]} transform={`rotate(-28 ${TRUNK_X - 9} ${trunkTop + 4})`} />
                  <ellipse cx={TRUNK_X + 9} cy={trunkTop + 1} rx="8" ry="4.4" fill={LEAF_TONES[0]} transform={`rotate(28 ${TRUNK_X + 9} ${trunkTop + 1})`} />
                </>
              )}
            </g>
          </svg>

          {/* Interaction layer — real buttons over each cluster */}
          {clusters.map(({ month, monthIndex, anchor }) => {
            const cx = TRUNK_X + (anchor.x - TRUNK_X) * canopyScale;
            const cy = 100 + (anchor.y - 100) * canopyScale;

            return (
              <Tooltip key={month.month}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveMonth(monthIndex)}
                    onMouseLeave={() => setActiveMonth(null)}
                    onFocus={() => setActiveMonth(monthIndex)}
                    onBlur={() => setActiveMonth(null)}
                    aria-label={`${month.month}: ${month.activities} eco activities, ${formatNumber(month.wasteRecycled, { decimals: 1 })} kilograms recycled, ${month.pickups} pickups, ${month.reuse} reuse actions, ${month.campaigns} campaigns.`}
                    className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    style={{ left: `${(cx / VIEW_W) * 100}%`, top: `${(cy / VIEW_H) * 100}%` }}
                  />
                </TooltipTrigger>

                <TooltipContent side="top" className="max-w-[14rem]">
                  <p className="font-heading text-sm font-semibold">{month.month}</p>
                  <p className="mt-0.5 text-xs opacity-90">{month.activities} eco activities</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs opacity-90">
                    <li>{month.pickups} pickups</li>
                    <li>{month.reuse} marketplace reuse actions</li>
                    <li>{month.campaigns + month.contributions} campaign actions</li>
                    <li>{formatNumber(month.wasteRecycled, { decimals: 1 })} kg recycled</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {TONE_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden="true">
                <ellipse cx="8" cy="5" rx="7.5" ry="4.2" fill={item.tone} />
              </svg>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* ─── Year summary ─────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {summary?.year}
        </p>
        <h3 className="mt-1 font-heading text-lg font-semibold text-foreground">
          {stageMeta.label}
        </h3>

        <dl className="mt-4 space-y-2.5">
          {[
            ["Eco activities", formatNumber(summary?.activities ?? 0)],
            ["Recycled", `${formatNumber(summary?.scrapRecycledKg ?? 0, { decimals: 1 })} kg`],
            ["CO₂ estimated saved", `${formatNumber(summary?.co2SavedKg ?? 0, { decimals: 1 })} kg`],
            ["Eco Points", formatNumber(summary?.ecoPoints ?? 0)],
          ].map(([term, value]) => (
            <div key={term} className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0">
              <dt className="text-sm text-muted-foreground">{term}</dt>
              <dd className="font-heading text-sm font-semibold tabular-nums text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {isEmpty ? (
            "Your tree is ready to grow. Complete a pickup or join a campaign to grow your first leaves."
          ) : (
            <>
              You&apos;ve grown{" "}
              <span className="font-medium text-foreground">
                {summary.activeMonths} active {summary.activeMonths === 1 ? "month" : "months"}
              </span>{" "}
              this year. Your tree is growing stronger — keep going. 🌱
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default YearlyEcoTree;
