/**
 * useShake — transient "invalid input" shake flag for form validation feedback.
 *
 * Usage:
 *   const { shake, triggerShake } = useShake();
 *   <motion.div animate={shake ? shakeAnimation : {}} transition={shakeTransition}>
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const useShake = (duration = 400) => {
  const [shake, setShake] = useState(false);
  const timeoutRef = useRef(null);

  // Clear the pending timer on unmount so we never setState on a dead component.
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const triggerShake = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setShake(true);
    timeoutRef.current = setTimeout(() => setShake(false), duration);
  }, [duration]);

  return { shake, triggerShake };
};

export default useShake;
