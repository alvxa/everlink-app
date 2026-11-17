"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Languages,
  Loader2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Square,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, MenuItem } from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiUpload, errorMessage } from "@/lib/client";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { useRealtime } from "@/components/realtime/realtime-provider";
import type {
  AuthorDTO,
  ConversationDetailDTO,
  ConversationSummaryDTO,
  MessageAttachmentDTO,
  MessageDTO,
} from "@/lib/types";
import type { FeedViewer } from "@/components/feed/post-card";

type Uploaded = { url: string; kind: string; mime: string; size: number; name?: string; duration?: number };

function previewFor(message: ConversationSummaryDTO) {
  if (!message.lastMessage) return "No messages yet";
  return `${message.lastMessage.senderId ? `${message.lastMessage.senderName.split(" ")[0]}: ` : ""}${message.lastMessage.body || "Attachment"}`;
}

export function MessagesShell({
  viewer,
  conversations,
  active,
  initialMessages = [],
  initialCursor = null,
  initialUnread = 0,
}: {
  viewer: FeedViewer;
  conversations: ConversationSummaryDTO[];
  active?: ConversationDetailDTO;
  initialMessages?: MessageDTO[];
  initialCursor?: string | null;
  initialUnread?: number;
}) {
  const [query, setQuery] = React.useState("");
  const [newChatOpen, setNewChatOpen] = React.useState(false);

  const filtered = conversations.filter((conversation) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      conversation.title.toLowerCase().includes(q) ||
      conversation.members.some((member) => member.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-full lg:flex">
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col border-line bg-surface/60 backdrop-blur-2xl dark:border-white/10 lg:w-[340px] lg:border-r",
          active ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="sticky top-0 z-10 border-b border-line bg-transparent px-4 pb-3 pt-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[21px] font-bold tracking-tight text-ink">Messages</h1>
            <Button size="sm" onClick={() => setNewChatOpen(true)}>
              <Send className="h-3.5 w-3.5" /> New
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-electric/50 focus-within:shadow-[0_0_24px_-14px_rgba(139,92,246,.9)] dark:border-white/10 dark:bg-white/[0.04]">
            <Search className="h-4 w-4 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              className="h-9 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>
        <div className="hide-scrollbar stagger-list min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-ink-faint">
              No conversations yet. Start one with the New button.
            </p>
          ) : (
            filtered.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className={cn(
                  "flex items-center gap-3 border-b border-line/70 px-4 py-3 transition hover:bg-surface-2 dark:border-white/[0.06] dark:hover:bg-white/[0.04]",
                  active?.id === conversation.id && "bg-gradient-to-r from-electric/20 to-transparent shadow-[inset_2px_0_0_rgba(167,139,250,.9)]"
                )}
              >
                {conversation.type === "DIRECT" && conversation.otherUser ? (
                  <Avatar src={conversation.otherUser.avatarUrl} name={conversation.otherUser.displayName} size="md" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Users className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{conversation.title}</p>
                    <span className="shrink-0 text-[10.5px] text-ink-faint">{timeAgo(conversation.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-[12px]", conversation.unread > 0 ? "font-semibold text-ink" : "text-ink-muted")}>
                      {previewFor(conversation)}
                    </p>
                    {conversation.unread > 0 && (
                      <span className="unread-pulse inline-flex min-w-[18px] items-center justify-center rounded-full bg-electric px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {conversation.unread > 99 ? "99+" : conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>

      <section className={cn("h-full min-h-0 min-w-0 flex-1 bg-transparent", active ? "flex" : "hidden lg:flex", "flex-col")}>
        {active ? (
          <ChatPane
            key={active.id}
            viewer={viewer}
            conversation={active}
            initialMessages={initialMessages}
            initialCursor={initialCursor}
            initialUnread={initialUnread}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-electric/25 to-ocean/10 text-brand shadow-[0_0_34px_-14px_rgba(139,92,246,.9)] dark:border-white/10">
              <Send className="h-7 w-7" />
            </span>
            <h2 className="font-display text-lg font-semibold text-ink">Your conversations live here</h2>
            <p className="mt-1.5 max-w-xs text-[13px] leading-6 text-ink-muted">
              Pick a conversation on the left, or start a new one with someone from around the world.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setNewChatOpen(true)}>
              Start a conversation
            </Button>
          </div>
        )}
      </section>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} viewer={viewer} />
    </div>
  );
}

function ChatPane({
  viewer,
  conversation,
  initialMessages,
  initialCursor,
  initialUnread,
}: {
  viewer: FeedViewer;
  conversation: ConversationDetailDTO;
  initialMessages: MessageDTO[];
  initialCursor: string | null;
  initialUnread: number;
}) {
  const { socket, online, connected } = useRealtime();
  const [messages, setMessages] = React.useState(initialMessages);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [text, setText] = React.useState("");
  const [attachments, setAttachments] = React.useState<Uploaded[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [typingName, setTypingName] = React.useState<string | null>(null);
  const [replyTo, setReplyTo] = React.useState<MessageDTO | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [partnerReadAt, setPartnerReadAt] = React.useState<number | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const typingTimer = React.useRef<number | null>(null);

  const other = conversation.otherUser;
  const isOnline = other ? online.has(other.id) : conversation.members.some((member) => member.id !== viewer.id && online.has(member.id));

  const scrollToBottom = React.useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const refreshMessages = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ messages: MessageDTO[]; nextCursor: string | null }>(
        `/api/v1/conversations/${conversation.id}/messages`
      );
      setMessages(data.messages);
    } catch {
      /* ignore refresh failure */
    }
  }, [conversation.id]);

  React.useEffect(() => {
    apiFetch(`/api/v1/conversations/${conversation.id}/read`, { method: "POST" }).catch(() => {});
    if (initialUnread > 0) {
      window.dispatchEvent(new CustomEvent("everlink:messages-read", { detail: { count: initialUnread } }));
    }
  }, [conversation.id, initialUnread]);

  React.useEffect(() => {
    if (!socket) return;
    socket.emit("conversation:subscribe", { conversationId: conversation.id });
    socket.emit("message:read", { conversationId: conversation.id });

    const onNew = (payload: { conversationId?: string }) => {
      if (payload?.conversationId !== conversation.id) return;
      socket.emit("message:read", { conversationId: conversation.id });
      apiFetch(`/api/v1/conversations/${conversation.id}/read`, { method: "POST" }).catch(() => {});
      void refreshMessages();
    };
    const onTyping = (payload: { conversationId?: string; userId?: string; displayName?: string; typing?: boolean }) => {
      if (payload?.conversationId !== conversation.id || payload.userId === viewer.id) return;
      setTypingName(payload.typing ? payload.displayName || "Someone" : null);
    };
    const onRead = (payload: { conversationId?: string; userId?: string; at?: string }) => {
      if (payload?.conversationId !== conversation.id || payload.userId === viewer.id) return;
      setPartnerReadAt(payload.at ? new Date(payload.at).getTime() : Date.now());
    };
    socket.on("message:new", onNew);
    socket.on("typing", onTyping);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNew);
      socket.off("typing", onTyping);
      socket.off("message:read", onRead);
    };
  }, [socket, conversation.id, viewer.id, refreshMessages]);

  function emitTyping(typing: boolean) {
    socket?.emit("typing", { conversationId: conversation.id, typing });
  }

  function onChangeText(value: string) {
    setText(value);
    emitTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => emitTyping(false), 2200);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 5 - attachments.length)) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "MESSAGE");
        const data = await apiUpload<{ upload: { url: string; mime: string; size: number; originalName?: string } }>(
          "/api/v1/uploads",
          form
        );
        const kind = data.upload.mime.startsWith("image/")
          ? "image"
          : data.upload.mime.startsWith("video/")
            ? "video"
            : data.upload.mime.startsWith("audio/")
              ? "audio"
              : "file";
        setAttachments((prev) => [
          ...prev,
          {
            url: data.upload.url,
            kind,
            mime: data.upload.mime,
            size: data.upload.size,
            name: data.upload.originalName || file.name,
          },
        ]);
      } catch (error) {
        toast({ title: "Upload failed", description: errorMessage(error), variant: "error" });
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 800) return;
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type });
        setUploading(true);
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("kind", "MESSAGE");
          const data = await apiUpload<{ upload: { url: string; mime: string; size: number } }>("/api/v1/uploads", form);
          setAttachments((prev) => [
            ...prev,
            { url: data.upload.url, kind: "audio", mime: data.upload.mime, size: data.upload.size, name: "Voice note" },
          ]);
        } catch (error) {
          toast({ title: "Could not upload voice note", description: errorMessage(error), variant: "error" });
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast({ title: "Microphone unavailable", description: "Allow microphone access to record a voice note.", variant: "warning" });
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending || (!text.trim() && attachments.length === 0)) return;
    setSending(true);
    try {
      const data = await apiFetch<{ message: MessageDTO }>(`/api/v1/conversations/${conversation.id}/messages`, {
        method: "POST",
        json: {
          body: text.trim(),
          replyToId: replyTo?.id ?? null,
          attachments: attachments.map((item) => ({
            url: item.url,
            kind: item.kind,
            mime: item.mime,
            size: item.size,
            name: item.name,
            duration: item.duration,
          })),
        },
      });
      setMessages((prev) => [...prev, data.message]);
      setText("");
      setAttachments([]);
      setReplyTo(null);
      emitTyping(false);
      scrollToBottom();
    } catch (error) {
      toast({ title: "Message not sent", description: errorMessage(error), variant: "error" });
    } finally {
      setSending(false);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiFetch<{ messages: MessageDTO[]; nextCursor: string | null }>(
        `/api/v1/conversations/${conversation.id}/messages?cursor=${encodeURIComponent(cursor)}`
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function translateMessage(message: MessageDTO) {
    if (translations[message.id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      return;
    }
    try {
      const target = (typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en") || "en";
      const data = await apiFetch<{ text: string }>("/api/v1/translate", {
        method: "POST",
        json: { text: message.body, targetLang: target, sourceType: "MESSAGE", sourceId: message.id },
      });
      if (data.text.trim() === message.body.trim()) {
        toast({ title: "Already in your language", variant: "info" });
        return;
      }
      setTranslations((prev) => ({ ...prev, [message.id]: data.text }));
    } catch (error) {
      toast({ title: "Translation unavailable", description: errorMessage(error), variant: "warning" });
    }
  }

  async function setArchived(archived: boolean) {
    try {
      await apiFetch(`/api/v1/conversations/${conversation.id}`, { method: "PATCH", json: { archived } });
      toast({ title: archived ? "Conversation archived" : "Conversation unarchived", variant: "success" });
      window.location.href = "/messages";
    } catch (error) {
      toast({ title: "Could not update conversation", description: errorMessage(error), variant: "error" });
    }
  }

  async function leaveConversation() {
    if (!confirm("Leave this conversation?")) return;
    try {
      await apiFetch(`/api/v1/conversations/${conversation.id}`, { method: "DELETE" });
      window.location.href = "/messages";
    } catch (error) {
      toast({ title: "Could not leave conversation", description: errorMessage(error), variant: "error" });
    }
  }

  let lastDate = "";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-surface/50 px-3 py-2.5 backdrop-blur dark:border-white/10 sm:px-4">
        <Link href="/messages" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {other ? (
          <Link href={`/profile/${other.username}`} className="flex min-w-0 items-center gap-2.5">
            <Avatar src={other.avatarUrl} name={other.displayName} size="md" online={isOnline} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{conversation.title}</p>
              <p className="text-[11px] text-ink-faint">
                {typingName ? `${typingName} is typing...` : isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{conversation.title}</p>
              <p className="text-[11px] text-ink-faint">
                {conversation.members.length} members{typingName ? ` · ${typingName} is typing...` : ""}
              </p>
            </div>
          </div>
        )}
        <span className={cn("ml-auto hidden text-[11px] lg:block", connected ? "text-mint" : "text-ink-faint")}>
          {connected ? "Live" : "Reconnecting"}
        </span>
        <Dropdown
          trigger={
            <button type="button" aria-label="Conversation options" className="rounded-lg p-2 text-ink-faint hover:bg-surface-3 hover:text-ink">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          {(close) => (
            <div className="w-48">
              <MenuItem onClick={() => { close(); void setArchived(true); }}>Archive conversation</MenuItem>
              <MenuItem danger onClick={() => { close(); void leaveConversation(); }}>Leave conversation</MenuItem>
            </div>
          )}
        </Dropdown>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-transparent px-3 py-4 sm:px-5">
        {cursor && (
          <div className="flex justify-center">
            <button type="button" onClick={loadMore} className="text-[12px] font-semibold text-brand hover:underline">
              {loadingMore ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        )}
        {messages.map((message) => {
          const mine = message.sender.id === viewer.id;
          const date = new Date(message.createdAt).toDateString();
          const showDate = date !== lastDate;
          lastDate = date;
          const read = partnerReadAt && new Date(message.createdAt).getTime() <= partnerReadAt;
          return (
            <React.Fragment key={message.id}>
              {showDate && (
                <div className="flex items-center gap-3 py-2">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
                    {new Date(message.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && <Avatar src={message.sender.avatarUrl} name={message.sender.displayName} size="sm" className="mt-auto" />}
                <div className={cn("max-w-[78%] sm:max-w-[70%]", mine && "items-end text-right")}>
                  {!mine && conversation.type !== "DIRECT" && (
                    <p className="mb-0.5 pl-1 text-[11px] font-semibold text-ink-muted">{message.sender.displayName}</p>
                  )}
                  <div
                    className={cn(
                      "group relative rounded-2xl px-3.5 py-2 text-left",
                      mine ? "rounded-br-md bg-gradient-to-br from-electric to-[#4338ca] text-white shadow-[0_10px_26px_-18px_rgba(139,92,246,1)]" : "rounded-bl-md border border-line bg-surface-2 text-ink dark:border-white/10 dark:bg-white/[0.055]"
                    )}
                  >
                    {message.replyTo && (
                      <p className={cn("mb-1 border-l-2 pl-2 text-[11px]", mine ? "border-white/50 text-white/85" : "border-brand/50 text-ink-muted")}>
                        {message.replyTo.senderName}: {message.replyTo.body.slice(0, 80)}
                      </p>
                    )}
                    {message.body && (
                      <p className="whitespace-pre-wrap break-words text-[13.5px] leading-5">{translations[message.id] ?? message.body}</p>
                    )}
                    {message.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-1.5">
                        {message.attachments.map((attachment) => (
                          <AttachmentView key={attachment.id} attachment={attachment} mine={mine} />
                        ))}
                      </div>
                    )}
                    <div className={cn("mt-1 flex items-center gap-1.5 text-[10px]", mine ? "justify-end text-white/80" : "text-ink-muted")}>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && read && <span>Read</span>}
                    </div>
                  </div>
                  <div className={cn("mt-0.5 flex items-center gap-1 opacity-0 transition group-focus-within:opacity-100 hover:opacity-100", mine ? "justify-end" : "")}>
                    <button
                      type="button"
                      onClick={() => setReplyTo(message)}
                      className="rounded px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint hover:text-brand"
                    >
                      Reply
                    </button>
                    {message.body && (
                      <button
                        type="button"
                        onClick={() => translateMessage(message)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint hover:text-brand"
                      >
                        <Languages className="h-3 w-3" /> {translations[message.id] ? "Original" : "Translate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {typingName && (
          <p className="flex items-center gap-2 pl-10 text-[11.5px] italic text-ink-faint">
            {typingName} is typing
            <span className="typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-line bg-surface/60 px-3 py-2.5 backdrop-blur dark:border-white/10 sm:px-4">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-[11.5px] text-ink-muted">
            Replying to <strong>{replyTo.sender.displayName}</strong>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-ink-faint hover:text-ink" aria-label="Cancel reply">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((item, index) => (
              <span key={item.url} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink-muted">
                <Paperclip className="h-3 w-3" /> {item.name || item.kind}
                <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))} aria-label="Remove attachment">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" hidden multiple onChange={(event) => uploadFiles(event.target.files)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full p-2 text-ink-faint hover:bg-surface-3 hover:text-ink disabled:opacity-40"
            aria-label="Attach a file"
          >
            {uploading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Paperclip className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={toggleRecording}
            className={cn(
              "rounded-full p-2 transition",
              recording ? "bg-red-500/15 text-red-500" : "text-ink-faint hover:bg-surface-3 hover:text-ink"
            )}
            aria-label={recording ? "Stop recording" : "Record voice note"}
          >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}
          </button>
          <textarea
            value={text}
            onChange={(event) => onChangeText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(event as unknown as React.FormEvent);
              }
            }}
            rows={1}
            maxLength={5000}
            placeholder={recording ? "Recording voice note..." : "Write a message..."}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-electric/60 dark:border-white/10 dark:bg-white/[0.04]"
          />
          <Button type="submit" size="icon-sm" loading={sending} disabled={!text.trim() && attachments.length === 0} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function AttachmentView({ attachment, mine }: { attachment: MessageAttachmentDTO; mine: boolean }) {
  if (attachment.kind === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.name || "Image attachment"} className="max-h-64 w-auto max-w-full object-cover" />
      </a>
    );
  }
  if (attachment.kind === "video") {
    return <video src={attachment.url} controls className="max-h-64 w-full rounded-xl" />;
  }
  if (attachment.kind === "audio") {
    return <audio src={attachment.url} controls className="w-56 max-w-full" />;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]", mine ? "bg-white/15 text-white" : "bg-surface-2 text-ink-muted")}
    >
      <Paperclip className="h-3.5 w-3.5" />
      <span className="truncate">{attachment.name || "File"}</span>
      <span className="shrink-0 opacity-70">{Math.ceil(attachment.size / 1024)} KB</span>
    </a>
  );
}

function NewChatDialog({
  open,
  onOpenChange,
  viewer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewer: FeedViewer;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"direct" | "group">("direct");
  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<AuthorDTO[]>([]);
  const [selected, setSelected] = React.useState<AuthorDTO[]>([]);
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "20" });
    if (query.trim()) params.set("q", query.trim());
    const timer = window.setTimeout(() => {
      apiFetch<{ people: AuthorDTO[] }>(`/api/v1/users/suggestions?${params.toString()}`)
        .then((data) => setPeople(data.people))
        .catch(() => setPeople([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  async function startDirect(person: AuthorDTO) {
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ conversationId: string }>("/api/v1/conversations", {
        method: "POST",
        json: { type: "DIRECT", usernames: [person.username], memberIds: [] },
      });
      onOpenChange(false);
      router.push(`/messages/${data.conversationId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function startGroup() {
    if (selected.length < 2) {
      setError("Pick at least two people for a group.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ conversationId: string }>("/api/v1/conversations", {
        method: "POST",
        json: {
          type: "GROUP",
          usernames: selected.map((person) => person.username),
          memberIds: [],
          title: title.trim() || "New group",
        },
      });
      onOpenChange(false);
      router.push(`/messages/${data.conversationId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New conversation"
      description={`Start a direct chat or bring up to ${formatCount(50)} people into a group.`}
      size="md"
    >
      <div className="px-5 py-4">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {(["direct", "group"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold capitalize transition",
                mode === item ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {mode === "group" && (
          <div className="mt-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="Group name"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[13.5px] text-ink outline-none focus:border-electric/60"
            />
            {selected.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.map((person) => (
                  <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11.5px] font-medium text-brand">
                    {person.displayName}
                    <button type="button" onClick={() => setSelected((prev) => prev.filter((p) => p.id !== person.id))} aria-label="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <Search className="h-4 w-4 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name or username"
            className="h-9 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        <div className="mt-2 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-[12.5px] text-ink-faint">Searching...</p>
          ) : people.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-faint">No people found.</p>
          ) : (
            people
              .filter((person) => person.id !== viewer.id)
              .map((person) => {
                const picked = selected.some((item) => item.id === person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      if (mode === "direct") void startDirect(person);
                      else setSelected((prev) => (picked ? prev.filter((p) => p.id !== person.id) : [...prev, person]));
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2",
                      picked && "bg-brand-soft/60"
                    )}
                  >
                    <Avatar src={person.avatarUrl} name={person.displayName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{person.displayName}</span>
                      <span className="block truncate text-[11px] text-ink-faint">@{person.username}</span>
                    </span>
                    {mode === "group" && (
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", picked ? "border-brand bg-brand text-white" : "border-line text-transparent")}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
          )}
        </div>
        {error && <p className="mt-2 text-[12.5px] text-red-500">{error}</p>}
        {mode === "group" && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={startGroup} loading={pending} disabled={selected.length < 2}>
              Create group
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
