/**
 * MonthlyPlant — one month of sustainability activity, drawn as a growing plant.
 *
 * The plant is built from primitives (stem, leaves, soil) whose count and
 * height come from the month's Eco Activity Score, so growth is a direct,
 * honest read of activity rather than decoration.
 *
 * Deliberately restrained: soft brand greens, no faces, no bounce — a
 * sustainability product, not a game.
 *
 * Accessibility: each plant is a real button with a full aria-label, so the
 * tooltip is never the only source of the numbers.
 */

import { motion, useReducedMotion } from "framer-motion";

import { getStageMeta } from "@/data/sustainabilityData";
import { formatNumber } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Stem height (SVG units) and leaf count per growth stage. */
const STAGE_SHAPE = [
  { stem: 0, leaves: 0, buds: 0 },
  { stem: 13, leaves: 1, buds: 0 },
  { stem: 21, leaves: 2, buds: 0 },
  { stem: 31, leaves: 4, buds: 0 },
  { stem: 41, leaves: 6, buds: 1 },
  { stem: 49, leaves: 8, buds: 2 },
];

const SOIL_Y = 66;
const CENTRE_X = 30;

/** Deterministic leaf placement: alternating sides, evenly spaced up the stem. */
const buildLeaves = (count, stemHeight) =>
  Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const t = (i + 1) / (count + 1);
    const y = SOIL_Y - stemHeight * t - 2;
    const scale = 0.72 + (1 - t) * 0.45;

    return {
      id: i,
      x: CENTRE_X + side * 2,
      y,
      rotate: side * -28 - t * 8,
      scale,
      side,
      tone: i % 2 === 0 ? "var(--ecosetu-primary)" : "var(--ecosetu-secondary)",
    };
  });

const MonthlyPlant = ({ month, index = 0, isCurrent = false, className }) => {
  const prefersReducedMotion = useReducedMotion();

  const stageMeta = getStageMeta(month.growthStage);
  const shape = STAGE_SHAPE[month.growthStage] ?? STAGE_SHAPE[0];
  const leaves = buildLeaves(shape.leaves, shape.stem);
  const isEmpty = month.growthStage === 0;

  const delay = prefersReducedMotion ? 0 : index * 0.05;

  const label =
    `${month.month}: ${stageMeta.label}. ` +
    (isEmpty
      ? "No activity recorded."
      : `${month.activities} eco activities, ${formatNumber(month.wasteRecycled, { decimals: 1 })} kilograms recycled, ` +
        `${formatNumber(month.co2Saved, { decimals: 1 })} kilograms CO2 saved, ${formatNumber(month.ecoPoints)} Eco Points.`);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "group flex flex-col items-center gap-1.5 rounded-xl border border-transparent p-2 transition-colors",
            "hover:border-border hover:bg-muted/40 focus-visible:border-border focus-visible:bg-muted/40",
            className
          )}
        >
          <svg
            viewBox="0 0 60 76"
            className="h-20 w-full max-w-[68px]"
            role="presentation"
            aria-hidden="true"
          >
            {/* Soil */}
            <ellipse
              cx={CENTRE_X}
              cy={SOIL_Y + 2}
              rx="18"
              ry="4.5"
              className={cn("transition-colors", isEmpty ? "fill-muted" : "fill-muted")}
            />
            <ellipse
              cx={CENTRE_X}
              cy={SOIL_Y}
              rx="15"
              ry="3.6"
              fill="var(--ecosetu-border)"
              opacity={0.9}
            />

            {/* Dormant month: a single unsprouted seed */}
            {isEmpty && (
              <circle cx={CENTRE_X} cy={SOIL_Y - 1} r="2.4" className="fill-muted-foreground/40" />
            )}

            {/* Stem */}
            {shape.stem > 0 && (
              <motion.path
                d={`M ${CENTRE_X} ${SOIL_Y} Q ${CENTRE_X + 1.5} ${SOIL_Y - shape.stem / 2} ${CENTRE_X} ${SOIL_Y - shape.stem}`}
                stroke="var(--ecosetu-primary)"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
                initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.55, delay, ease: "easeOut" }}
              />
            )}

            {/* Leaves */}
            {leaves.map((leaf) => (
              <motion.ellipse
                key={leaf.id}
                cx={0}
                cy={0}
                rx="8.4"
                ry="4.1"
                fill={leaf.tone}
                transform={`translate(${leaf.x + leaf.side * 7.2} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.scale})`}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: delay + 0.25 + leaf.id * 0.05,
                  ease: "easeOut",
                }}
                style={{ transformOrigin: `${leaf.x + leaf.side * 7.2}px ${leaf.y}px` }}
              />
            ))}

            {/* Buds — only on the strongest months */}
            {Array.from({ length: shape.buds }, (_, i) => (
              <motion.circle
                key={`bud-${i}`}
                cx={CENTRE_X + (i === 0 ? -5 : 6)}
                cy={SOIL_Y - shape.stem + (i === 0 ? 2 : 7)}
                r="2.6"
                fill="var(--ecosetu-accent)"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: delay + 0.6 + i * 0.08, ease: "easeOut" }}
              />
            ))}
          </svg>

          <span
            className={cn(
              "text-xs font-medium transition-colors",
              isCurrent ? "text-primary" : isEmpty ? "text-muted-foreground/60" : "text-muted-foreground"
            )}
          >
            {month.shortMonth}
          </span>
        </button>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-[15rem]">
        <p className="font-heading text-sm font-semibold">
          {month.month} {new Date().getFullYear()}
        </p>
        <p className="mt-0.5 text-xs opacity-90">{stageMeta.label}</p>

        {isEmpty ? (
          <p className="mt-1.5 text-xs opacity-80">No activity recorded this month.</p>
        ) : (
          <dl className="mt-1.5 space-y-0.5 text-xs opacity-90">
            <div className="flex justify-between gap-4">
              <dt>Eco activities</dt>
              <dd className="tabular-nums">{month.activities}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Recycled</dt>
              <dd className="tabular-nums">
                {formatNumber(month.wasteRecycled, { decimals: 1 })} kg
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>CO₂ saved</dt>
              <dd className="tabular-nums">
                {formatNumber(month.co2Saved, { decimals: 1 })} kg
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Eco Points</dt>
              <dd className="tabular-nums">{formatNumber(month.ecoPoints)}</dd>
            </div>
          </dl>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default MonthlyPlant;
