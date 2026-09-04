/**
 * MoneyBagAnimation — decorative illustration for the Eco Points card: the
 * reward-medal artwork (src/assets/reward-icon.svg) gently floating, with a
 * few sparkles looping around it.
 *
 * Purely decorative (aria-hidden) — the number above it is the actual data.
 * Sized to a fixed, modest box (not flex-1 filling the card) so it can't
 * dominate the card the way the original money-bag drawing did; the
 * remaining vertical space is absorbed by centering it in the flex
 * container, not by stretching the artwork.
 *
 * The medal's own gold/teal/cream fills are untouched — only its two
 * unstyled outline/engraving paths were switched to `currentColor` in the
 * source file (root `fill` changed from a hardcoded black to `currentColor`),
 * so this wraps the markup in an element that pins that color to black in
 * both themes (deliberately not theme-aware — the outline is meant to stay
 * black even in dark mode).
 */

import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";

import rewardIconMarkup from "@/assets/reward-icon.svg?raw";

const SparklePoint = ({ style, delay, duration, size = 11 }) => (
  <motion.span
    className="absolute text-amber-400 dark:text-amber-300"
    style={style}
    initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], rotate: [0, 25, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <Sparkle size={size} fill="currentColor" strokeWidth={0} />
  </motion.span>
);

const MoneyBagAnimation = ({ className }) => (
  <div className={className} aria-hidden="true">
    <div className="relative flex h-full w-full items-center justify-center">
      <SparklePoint style={{ left: "16%", top: "12%" }} delay={0} duration={2.2} size={11} />
      <SparklePoint style={{ right: "14%", top: "20%" }} delay={0.7} duration={2.6} size={9} />
      <SparklePoint style={{ left: "12%", bottom: "18%" }} delay={1.3} duration={2.4} size={10} />
      <SparklePoint style={{ right: "18%", bottom: "12%" }} delay={0.4} duration={2.8} size={8} />

      <motion.div
        className="h-20 w-20 text-black [&>svg]:block [&>svg]:h-full [&>svg]:w-full sm:h-24 sm:w-24"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        dangerouslySetInnerHTML={{ __html: rewardIconMarkup }}
      />
    </div>
  </div>
);

export default MoneyBagAnimation;
