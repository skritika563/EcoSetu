/**
 * usePickupDetails — a single pickup plus the actions that can be taken on it.
 *
 * Both the household/organization Pickup Details page and the collector's Job
 * Details page use this hook — the record and its state machine are identical
 * from either side, only which actions get called differs.
 *
 * Actions resolve directly from the service's return value rather than
 * triggering a full refetch, so the UI updates instantly without a network
 * round trip in between.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import * as pickupService from "@/services/pickupService";

export const usePickupDetails = (pickupId) => {
  const { user } = useAuth();

  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionPending, setActionPending] = useState(false);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!pickupId) return;
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await pickupService.getPickupById(pickupId);
      if (requestRef.current !== requestId) return;
      setPickup(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Pickup details load failed:", err);
      setError(err.message || "Unable to load this pickup. Please try again.");
      setPickup(null);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [pickupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  /** Wrap a service call: run it, apply the result, surface errors via toast-friendly rejection. */
  const runAction = useCallback(async (fn) => {
    setActionPending(true);
    try {
      const result = await fn();
      setPickup(result);
      return result;
    } finally {
      setActionPending(false);
    }
  }, []);

  const actions = {
    cancel: useCallback(
      (reason) => runAction(() => pickupService.cancelPickup(pickupId, { reason, cancelledBy: "household" })),
      [pickupId, runAction]
    ),
    rate: useCallback(
      (stars, review) => runAction(() => pickupService.rateCollector(pickupId, { stars, review })),
      [pickupId, runAction]
    ),
    accept: useCallback(
      () =>
        runAction(() =>
          pickupService.acceptJob(pickupId, {
            id: "ME",
            name: user?.name || "You",
            rating: 4.8,
            totalPickups: 128,
            verified: true,
            vehicle: "Your registered vehicle",
          })
        ),
      [pickupId, runAction, user?.name]
    ),
    startNavigation: useCallback(
      () => runAction(() => pickupService.updateJobStatus(pickupId, "on_the_way", "Collector started navigation")),
      [pickupId, runAction]
    ),
    startPickup: useCallback(
      () => runAction(() => pickupService.updateJobStatus(pickupId, "in_progress", "Verifying scrap on site")),
      [pickupId, runAction]
    ),
    reportIssue: useCallback(
      (reason) => runAction(() => pickupService.reportJobIssue(pickupId, reason)),
      [pickupId, runAction]
    ),
    verify: useCallback(
      (verifiedCategories) => runAction(() => pickupService.verifyAndCompletePickup(pickupId, verifiedCategories)),
      [pickupId, runAction]
    ),
  };

  return { pickup, loading, error, actionPending, refetch: load, actions };
};

export default usePickupDetails;
