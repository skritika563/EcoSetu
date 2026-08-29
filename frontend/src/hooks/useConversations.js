/**
 * useConversations — a contextType-scoped conversation list (Marketplace or
 * Campaigns inbox), polled every 15s so unread counts and new messages show
 * up without a manual refresh.
 *
 * The poll deliberately does NOT go through useAsyncResource's `refetch` —
 * that path's error handling resets `data` back to `initialData` on ANY
 * failure (by design, for a first load that fails), which is exactly wrong
 * for a background poll: one transient blip (a token refresh race, a flaky
 * connection) would wipe an already-populated inbox back to empty, tearing
 * down whatever conversation was open mid-conversation. Instead, the poll
 * calls the service directly and only ever touches state on SUCCESS
 * (`applyData`) — a failed background tick is silently skipped, so the UI
 * never flickers or loses state because of it.
 */
import { useCallback, useEffect } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as messageService from "@/services/messageService";

const POLL_MS = 15000;

export const useConversations = (contextType) => {
  const fetcher = useCallback(() => messageService.listConversations(contextType), [contextType]);
  const resource = useAsyncResource(fetcher, { initialData: [] });
  const { applyData } = resource;

  useEffect(() => {
    const interval = setInterval(() => {
      messageService
        .listConversations(contextType)
        .then((result) => applyData(() => result))
        .catch((err) => console.error("Conversation list poll failed:", err.message));
    }, POLL_MS);
    return () => clearInterval(interval);
    // applyData is a stable reference (useAsyncResource memoizes it with an
    // empty dep array), so the only real dependency here is contextType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType]);

  return resource;
};

export default useConversations;
