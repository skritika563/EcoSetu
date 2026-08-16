/**
 * MonthlyPlant — one month of sustainability activity, drawn as a small
 * flower garden.
 *
 * The number of flowers in bloom comes directly from the month's growth
 * stage — more sustainable actions that month, more flowers in the bed. This
 * reads more legibly at a glance than a single plant's height ever could:
 * counting blooms is instant, judging stem height is not.
 *
 * Deliberately restrained: one petal colour, soft brand greens for stems, no
 * faces, no bounce — a sustainability product, not a game.
 *
 * Accessibility: each garden is a real button with a full aria-label, so the
 * tooltip is never the only source of the numbers.
 */

import { motion, useReducedMotion } from "framer-motion";

import { getStageMeta } from "@/data/sustainabilityData";
import { formatNumber } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Flowers in bloom per growth stage — this IS the growth signal. */
const STAGE_FLOWER_COUNT = [0, 1, 2, 3, 4, 6];

const SOIL_Y = 66;
const BED_LEFT = 12;
const BED_RIGHT = 48;

/** Stable pseudo-random jitter so a given month's garden never reshuffles between renders. */
const jitter = (seed, spread) => {
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * spread;
};

/** Evenly-spaced flower slots across the bed, with small organic height/position variance. */
const buildFlowers = (count, stage) => {
  if (count === 0) return [];
  const baseHeight = 22 + stage * 4;

  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return {
      id: i,
      x: BED_LEFT + t * (BED_RIGHT - BED_LEFT) + jitter(i + 1, 3),
      stemHeight: Math.max(16, baseHeight + jitter(i + 7, 9)),
    };
  });
};

/** One 5-petal flower head, drawn at the local origin and positioned via `transform`. */
const FlowerHead = ({ x, y, delay, prefersReducedMotion }) => {
  const petalAngles = [0, 72, 144, 216, 288];

  return (
    <motion.g
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      {petalAngles.map((angle) => (
        <ellipse
          key={angle}
          cx={x}
          cy={y}
          rx="3.3"
          ry="1.7"
          fill="var(--ecosetu-accent)"
          transform={`rotate(${angle} ${x} ${y}) translate(3.1 0)`}
        />
      ))}
      <circle cx={x} cy={y} r="1.6" fill="var(--ecosetu-orange)" />
    </motion.g>
  );
};

const MonthlyPlant = ({ month, index = 0, isCurrent = false, className }) => {
  const prefersReducedMotion = useReducedMotion();

  const stageMeta = getStageMeta(month.growthStage);
  const flowerCount = STAGE_FLOWER_COUNT[month.growthStage] ?? 0;
  const flowers = buildFlowers(flowerCount, month.growthStage);
  const isEmpty = flowerCount === 0;

  const delay = prefersReducedMotion ? 0 : index * 0.05;

  const label =
    `${month.month}: ${stageMeta.label}, ${flowerCount} ${flowerCount === 1 ? "flower" : "flowers"} in bloom. ` +
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
            {/* Soil bed */}
            <ellipse cx="30" cy={SOIL_Y + 2} rx="20" ry="4.5" className="fill-muted" />
            <ellipse cx="30" cy={SOIL_Y} rx="17" ry="3.6" fill="var(--ecosetu-border)" opacity={0.9} />

            {/* Dormant month: a single unsprouted seed */}
            {isEmpty && <circle cx="30" cy={SOIL_Y - 1} r="2.4" className="fill-muted-foreground/40" />}

            {/* Each flower: stem, a small leaf, then the bloom on top */}
            {flowers.map((flower, i) => {
              const topY = SOIL_Y - flower.stemHeight;
              const stemDelay = delay + i * 0.07;
              const tone = i % 2 === 0 ? "var(--ecosetu-primary)" : "var(--ecosetu-secondary)";

              return (
                <g key={flower.id}>
                  <motion.line
                    x1={flower.x}
                    y1={SOIL_Y}
                    x2={flower.x}
                    y2={topY}
                    stroke={tone}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: stemDelay, ease: "easeOut" }}
                  />
                  <motion.ellipse
                    cx={flower.x + (i % 2 === 0 ? 3.2 : -3.2)}
                    cy={topY + flower.stemHeight * 0.42}
                    rx="3.4"
                    ry="1.6"
                    fill={tone}
                    transform={`rotate(${i % 2 === 0 ? -24 : 24} ${flower.x + (i % 2 === 0 ? 3.2 : -3.2)} ${topY + flower.stemHeight * 0.42})`}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: stemDelay + 0.15, ease: "easeOut" }}
                  />
                  <FlowerHead
                    x={flower.x}
                    y={topY}
                    delay={stemDelay + 0.25}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </g>
              );
            })}
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
        <p className="mt-0.5 text-xs opacity-90">
          {stageMeta.label} · {flowerCount} {flowerCount === 1 ? "flower" : "flowers"}
        </p>

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
