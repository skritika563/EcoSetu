/**
 * usePickupDetails — a single pickup plus the actions that can be taken on it.
 *
 * Both the household/organization Pickup Details page and the collector's Job
 * Details page use this hook — the record and its state machine are identical
 * from either side, only which actions get called differs.
 *
 * Actions resolve directly from the service's return value rather than
 * triggering a full refetch, so the UI updates instantly without a network
 * round trip in between. Every action call is now a real request — the
 * server derives the actor (who's accepting, who's cancelling) from the
 * verified Firebase token, never from anything this hook sends.
 *
 * There is no push/websocket layer yet, so the OTHER party's changes (e.g.
 * the collector tapping "I'm on my way") don't reach this page on their own
 * — a background poll is what closes that gap: every few seconds, silently
 * refetch and swap in the latest pickup if anything changed, without ever
 * flashing the loading skeleton the initial load uses. Stops polling once
 * the pickup reaches a terminal state (nothing left to change) or while an
 * action is in flight (so a poll response can't race with it), and pauses
 * entirely while the tab isn't visible.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import * as pickupService from "@/services/pickupService";

const POLL_INTERVAL_MS = 6000;

export const usePickupDetails = (pickupId) => {
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

  // Same fetch as `load`, minus the loading/error UI state — a background
  // poll failing or racing shouldn't flash a skeleton or blow away
  // whatever's already correctly on screen.
  const silentRefetch = useCallback(async () => {
    if (!pickupId) return;
    const requestId = ++requestRef.current;
    try {
      const result = await pickupService.getPickupById(pickupId);
      if (requestRef.current !== requestId) return;
      setPickup(result);
    } catch (err) {
      console.error("Pickup poll failed:", err);
    }
  }, [pickupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  // Deliberately keyed on the STATUS STRING, not the `pickup` object itself
  // — a new object arrives every poll, and depending on the whole object
  // would tear down and recreate this interval every 6 seconds for no
  // reason. Depending on the primitive status value means it only resets
  // when something meaningful (the status actually changing, or an action
  // starting/finishing) happens.
  const status = pickup?.status;
  const isTerminal = status === "completed" || status === "cancelled";

  useEffect(() => {
    if (!status || isTerminal || actionPending) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") silentRefetch();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, isTerminal, actionPending, silentRefetch]);

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
      (reason) => runAction(() => pickupService.cancelPickup(pickupId, { reason })),
      [pickupId, runAction]
    ),
    rate: useCallback(
      (stars, review) => runAction(() => pickupService.rateCollector(pickupId, { stars, review })),
      [pickupId, runAction]
    ),
    // The server assigns the currently authenticated collector — there is
    // nothing for the client to supply beyond the pickup id.
    accept: useCallback(() => runAction(() => pickupService.acceptJob(pickupId)), [pickupId, runAction]),
    startNavigation: useCallback(
      () => runAction(() => pickupService.updateJobStatus(pickupId, "on_the_way")),
      [pickupId, runAction]
    ),
    startPickup: useCallback(
      () => runAction(() => pickupService.updateJobStatus(pickupId, "in_progress")),
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

  // For callers that already have a fresh, server-returned pickup in hand
  // (e.g. ScrapVerificationForm's photo upload, which gets the updated
  // pickup back directly in its own response) and just need it applied to
  // this hook's state — no network call, and critically no `loading` flip,
  // which would unmount the whole detail page (including any in-progress
  // form state, like partially-entered verification rows) and remount it
  // from the skeleton. `refetch` is for "go get it again"; this is for
  // "here it is, already fetched."
  const applyUpdate = useCallback((updatedPickup) => setPickup(updatedPickup), []);

  return { pickup, loading, error, actionPending, refetch: load, applyUpdate, actions };
};

export default usePickupDetails;
