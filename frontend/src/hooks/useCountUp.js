/**
 * useCountUp — animates a number from 0 to its value on mount.
 *
 * Falls back to the final value immediately when animation would be pointless
 * or unwanted: reduced-motion users, an explicitly disabled counter, or a page
 * loaded in a background tab (no animation frames run there, so the number
 * would otherwise sit at zero until the tab is focused).
 *
 * Returns the formatted string so callers stay declarative.
 */

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

export const useCountUp = (value = 0, { enabled = true, duration = 0.9, format } = {}) => {
  const prefersReducedMotion = useReducedMotion();

  // Read once at mount — a tab that is hidden now gets the final value directly.
  const [isVisible] = useState(() => typeof document === "undefined" || !document.hidden);

  const shouldAnimate = enabled && !prefersReducedMotion && isVisible;

  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return undefined;

    // onUpdate fires from the animation loop, not synchronously here.
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: setAnimatedValue,
    });

    return () => controls.stop();
  }, [value, shouldAnimate, duration]);

  // Derived, never assigned in an effect: no cascading render on the static path.
  const current = shouldAnimate ? animatedValue : value;

  return format ? format(current) : Math.round(current).toLocaleString("en-IN");
};

export default useCountUp;
