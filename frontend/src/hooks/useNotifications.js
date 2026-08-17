/**
 * useNotifications — the navbar bell's data source.
 *
 * Backed by /api/notifications (services/notificationService.js). Read state
 * now persists in MongoDB rather than resetting on reload — markAsRead/
 * markAllAsRead optimistically update local state, then confirm against the
 * server, so the bell feels instant without waiting on a round trip.
 *
 * There's no push layer yet, so a notification fired by someone else's
 * action (a collector accepting your pickup, a status update) wouldn't
 * otherwise show up until the next full page load — a background poll is
 * what closes that gap, silently refreshing the list every few seconds
 * without ever flashing the loading state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as notificationService from "@/services/notificationService";

const POLL_INTERVAL_MS = 15000;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await notificationService.getNotifications();
      if (requestRef.current !== requestId) return;
      setNotifications(result);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // Deliberately not `load()` — this must never toggle `loading` to
      // true, or the bell's dropdown would flash empty every 15s for
      // anyone who happens to have it open while a poll lands.
      notificationService
        .getNotifications()
        .then((result) => setNotifications(result))
        .catch((err) => console.error("Notification poll failed:", err));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    notificationService.markAsRead(id).catch((err) => console.error("Failed to mark notification read:", err));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    notificationService.markAllAsRead().catch((err) => console.error("Failed to mark all notifications read:", err));
  }, []);

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch: load };
};

export default useNotifications;
