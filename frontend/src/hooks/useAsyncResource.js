/**
 * useAsyncResource — the fetch/loading/error/stale-guard pattern the app's
 * data hooks all share, factored into one place.
 *
 * Every existing hook (useDashboardData, usePickups, useAddresses…) hand-rolls
 * the same shape: a request counter to discard responses that resolve after
 * unmount or after their inputs changed, plus {data, loading, error, refetch}.
 * The marketplace needs six more of those, so the pattern lives here rather
 * than being copy-pasted six more times. It returns the exact same contract,
 * so a hook built on it is indistinguishable to its callers.
 *
 * @param {Function} fetcher - async () => data. MUST be memoized by the
 *   caller (useCallback), since it's this hook's re-fetch trigger.
 * @param {object} [options]
 * @param {*} [options.initialData] - value before the first load resolves
 * @param {boolean} [options.enabled] - skip fetching entirely when false
 * @param {string} [options.errorMessage] - fallback when the error has no message
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const useAsyncResource = (
  fetcher,
  { initialData = null, enabled = true, errorMessage = "Something went wrong. Please try again." } = {}
) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Guards against a resolved request writing state after unmount, or after
  // the inputs changed mid-flight and its response is already stale.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (requestRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Resource load failed:", err);
      setError(err.message || errorMessage);
      setData(initialData);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
    // initialData is intentionally omitted: callers routinely pass an inline
    // [] or {}, which is a new reference every render and would make this
    // callback — and therefore the effect below — fire in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, enabled, errorMessage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      // Invalidate anything in flight on unmount.
      requestRef.current += 1;
    };
  }, [load]);

  /**
   * Apply an already-fetched value without a network round trip — used after
   * a mutation returns the updated resource, so the UI updates instantly and
   * without flashing the loading state.
   */
  const applyData = useCallback((next) => {
    setData((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  return { data, loading, error, refetch: load, applyData };
};

export default useAsyncResource;
