/**
 * useDebouncedValue — returns `value` only after it has stopped changing for
 * `delay` ms.
 *
 * Used by the marketplace search box so typing "coffee table" fires one
 * request instead of twelve.
 */

import { useEffect, useState } from "react";

export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
