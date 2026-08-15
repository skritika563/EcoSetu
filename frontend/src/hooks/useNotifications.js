/**
 * useNotifications — mock notification feed for the navbar bell.
 *
 * UI-only: there is no backend notification system yet. Read state lives in
 * component state, so it resets on reload — that is intentional for a mock.
 * Replace the initial load with `api.get("/notifications")` and the mutations
 * with PATCH calls when the module lands.
 */

import { useCallback, useMemo, useState } from "react";

import { getNotifications } from "@/data/notificationData";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState(() => getNotifications());

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
};

export default useNotifications;
