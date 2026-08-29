/**
 * useUnreadMessageCount — a section-scoped unread badge count (Marketplace
 * or Campaigns), polled every 15s. Powers the small numeric badge on each
 * section header's Messages icon.
 *
 * Same "poll bypasses refetch's error-reset" reasoning as
 * useConversations.js — a transient failed poll should never flash the
 * badge back to 0, it should just sit still until the next successful tick.
 */
import { useCallback, useEffect } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as messageService from "@/services/messageService";

const POLL_MS = 15000;

export const useUnreadMessageCount = (contextType) => {
  const fetcher = useCallback(() => messageService.getUnreadCount(contextType), [contextType]);
  const { data, applyData } = useAsyncResource(fetcher, { initialData: { unreadCount: 0 } });

  useEffect(() => {
    const interval = setInterval(() => {
      messageService
        .getUnreadCount(contextType)
        .then((result) => applyData(() => result))
        .catch((err) => console.error("Unread count poll failed:", err.message));
    }, POLL_MS);
    return () => clearInterval(interval);
    // applyData is stable — see useConversations.js's identical comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType]);

  return data.unreadCount;
};

export default useUnreadMessageCount;
