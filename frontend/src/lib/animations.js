/**
 * Shared Framer Motion presets.
 *
 * Keep animation values here so every module animates identically — the design
 * system is as much about motion consistency as it is about colour and spacing.
 */

/** Fade + rise. `custom` sets the delay: <motion.div variants={fadeUp} custom={0.1} /> */
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: "easeOut" },
  }),
};

/** Horizontal slide for multi-step wizards. `custom` is the direction (1 | -1). */
export const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

/** Invalid-input shake. Pair with useShake(). */
export const shakeAnimation = { x: [-8, 8, -8, 8, 0] };
export const shakeTransition = { duration: 0.3 };

/** Card / panel entrance used by auth and dashboard pages. */
export const cardEntrance = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};
