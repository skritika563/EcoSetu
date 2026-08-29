/**
 * ChatInboxPage — shared 1:1 chat inbox, reused by both Marketplace
 * (`contextType="marketplace_product"`) and Campaigns
 * (`contextType="campaign"`) — each section keeps its own conversations
 * separate (a seller doesn't want product chats mixed with campaign chats),
 * but it's the same UI and the same backend contract for both.
 *
 * Deep-linking into a SPECIFIC conversation, from anywhere in the app:
 *   /marketplace/messages?userId=<sellerId>&contextId=<productId>
 *   /campaigns/messages?userId=<organizerId>&contextId=<campaignId>
 * On mount, if those params are present, the conversation with that person
 * (about that product/campaign) is found-or-created and opened immediately
 * — "Message seller" / "Message organizer" buttons elsewhere in the app
 * just link here with those params, nothing fancier.
 *
 * Desktop: two-pane (conversation list | open thread). Mobile: one pane at
 * a time, thread replaces the list when a conversation is open, with a
 * back button to return to the list.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";

import useConversations from "@/hooks/useConversations";
import useConversationThread from "@/hooks/useConversationThread";
import * as messageService from "@/services/messageService";
import { formatRelativeTime, getInitials } from "@/lib/format";
import EmptyState from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const ConversationRow = ({ conversation, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
      active ? "bg-primary/10" : "hover:bg-muted/60"
    )}
  >
    <div className="relative shrink-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={conversation.otherUser?.profileImage} alt="" />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(conversation.otherUser?.name)}
        </AvatarFallback>
      </Avatar>
      {/* Unread indicator — a green dot on the avatar corner, at-a-glance
          even before reading the row's text (the numeric pill below still
          carries the exact count). */}
      {conversation.unreadCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
          aria-hidden="true"
        />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className={cn("truncate text-sm text-foreground", conversation.unreadCount > 0 ? "font-semibold" : "font-medium")}>
          {conversation.otherUser?.name ?? "Unknown user"}
        </p>
        {conversation.lastMessageAt && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("truncate text-xs", conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
          {conversation.lastMessage?.body || `Regarding: ${conversation.contextTitle ?? "—"}`}
        </p>
        {conversation.unreadCount > 0 && (
          <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {conversation.unreadCount}
          </span>
        )}
      </div>
    </div>
  </button>
);

const MessageBubble = ({ message, isMine }) => (
  <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
    <div
      className={cn(
        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
        isMine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"
      )}
    >
      {message.body}
    </div>
  </div>
);

const ChatThread = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const { data, loading, send } = useConversationThread(conversation.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [data.messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    setSending(true);
    try {
      await send(body);
    } catch (err) {
      toast.error(err.message || "Failed to send message.");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 lg:hidden" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={conversation.otherUser?.profileImage} alt="" />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(conversation.otherUser?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{conversation.otherUser?.name ?? "Unknown user"}</p>
          {conversation.contextTitle && (
            <p className="truncate text-xs text-muted-foreground">Regarding: {conversation.contextTitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading && data.messages.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className={cn("h-10 rounded-2xl", i % 2 ? "ml-auto w-1/2" : "w-2/3")} />
            ))}
          </div>
        ) : data.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.messages.map((m) => (
              <MessageBubble key={m.id} message={m} isMine={m.senderId === (user?._id || user?.id)} />
            ))}
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/60 p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending}
          aria-label="Message"
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={!draft.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

const ChatInboxPage = ({ contextType }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: conversations, loading, error, applyData, refetch } = useConversations(contextType);
  const [selectedId, setSelectedId] = useState(searchParams.get("conversationId") || null);
  const [resolving, setResolving] = useState(false);

  // Deep-link: ?userId=<recipient>&contextId=<product/campaign id> finds or
  // creates the conversation with that person and opens it — this is the
  // one-time bootstrap for a "Message seller/organizer" button elsewhere in
  // the app, not a recurring fetch, so it runs once per distinct pair of
  // params rather than on every render.
  useEffect(() => {
    const userId = searchParams.get("userId");
    const contextId = searchParams.get("contextId");
    if (!userId || !contextId) return;

    let cancelled = false;
    // Kicking off an async fetch in response to a URL param change — same
    // pattern hooks/useAsyncResource.js uses for its own load-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolving(true);
    messageService
      .getOrCreateConversation({ recipientId: userId, contextType, contextId })
      .then((conversation) => {
        if (cancelled) return;
        setSelectedId(conversation.id);
        applyData((prev) => {
          const withoutDupe = prev.filter((c) => c.id !== conversation.id);
          return [conversation, ...withoutDupe];
        });
        setSearchParams({ conversationId: conversation.id }, { replace: true });
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || "Couldn't open that conversation.");
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("userId"), searchParams.get("contextId")]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const selectConversation = (conversation) => {
    setSelectedId(conversation.id);
    setSearchParams({ conversationId: conversation.id }, { replace: true });
    if (conversation.unreadCount > 0) {
      applyData((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)));
      messageService.markConversationRead(conversation.id).then(refetch).catch(() => {});
    }
  };

  const backToList = () => {
    setSelectedId(null);
    searchParams.delete("conversationId");
    setSearchParams(searchParams, { replace: true });
  };

  // Esc leaves the open chat and returns to just the inbox (no thread
  // open) — same as WhatsApp Web. Works from anywhere on the page,
  // including while the composer input has focus, since that's exactly the
  // "done texting, hit Esc to leave" moment this is for.
  useEffect(() => {
    if (!selectedId) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") backToList();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <>
      <div className="grid h-[calc(100vh-14rem)] min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className={cn("flex flex-col border-border/60 lg:border-r", selectedConversation && "hidden lg:flex")}>
          <ScrollArea className="flex-1 p-2">
            {loading && conversations.length === 0 ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <p className="p-4 text-sm text-destructive">{error}</p>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Messages you start will show up here."
                className="py-12"
              />
            ) : (
              <AnimatePresence initial={false}>
                {conversations.map((c) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ConversationRow conversation={c} active={c.id === selectedId} onClick={() => selectConversation(c)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </ScrollArea>
        </div>

        {/* Thread */}
        <div className={cn("flex-col", selectedConversation ? "flex" : "hidden lg:flex")}>
          {resolving ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-8 w-40" />
            </div>
          ) : selectedConversation ? (
            <ChatThread conversation={selectedConversation} onBack={backToList} />
          ) : (
            <div className="hidden h-full items-center justify-center lg:flex">
              <p className="text-sm text-muted-foreground">Select a conversation to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatInboxPage;
