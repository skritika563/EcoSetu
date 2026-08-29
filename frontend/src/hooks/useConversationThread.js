/**
 * useConversationThread — messages for one open conversation, polled every
 * 4s while a conversation is selected (no WebSocket infra in this backend,
 * see backend/routes/index.js — polling is the whole app's existing
 * real-time story). Also exposes `send`, which optimistically appends the
 * sent message so the composer feels instant instead of waiting for the
 * next poll tick.
 *
 * Like useConversations, the poll bypasses `refetch`'s error handling on
 * purpose — a failed background tick must never blank out an already-open
 * conversation (that was flashing the whole chat pane empty mid-type; see
 * useConversations.js's header comment for the full explanation). Only a
 * successful poll ever touches state, via `applyData`.
 */
import { useCallback, useEffect } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import * as messageService from "@/services/messageService";

const POLL_MS = 4000;

export const useConversationThread = (conversationId) => {
  const fetcher = useCallback(() => messageService.getMessages(conversationId), [conversationId]);
  const resource = useAsyncResource(fetcher, {
    initialData: { messages: [], hasMore: false },
    enabled: !!conversationId,
  });
  const { applyData } = resource;

  useEffect(() => {
    if (!conversationId) return undefined;
    const interval = setInterval(() => {
      messageService
        .getMessages(conversationId)
        .then((result) => applyData(() => result))
        .catch((err) => console.error("Message poll failed:", err.message));
    }, POLL_MS);
    return () => clearInterval(interval);
    // applyData is stable — see useConversations.js's identical comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const send = useCallback(
    async (body) => {
      const message = await messageService.sendMessage(conversationId, body);
      resource.applyData((prev) => ({ ...prev, messages: [...prev.messages, message] }));
      return message;
    },
    [conversationId, resource]
  );

  return { ...resource, send };
};

export default useConversationThread;
