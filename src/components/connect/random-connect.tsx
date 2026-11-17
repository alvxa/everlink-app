"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, MessageSquare, RefreshCw, Shuffle, ShieldCheck, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { apiFetch, errorMessage } from "@/lib/client";
import { INTERESTS, LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AuthorDTO } from "@/lib/types";

type Status = "idle" | "waiting" | "matched";

type ConnectState = {
  state: Status;
  match: { conversationId: string; partnerId: string; matchedAt: number } | null;
  waitingCount: number;
  conversationId?: string;
  partner?: AuthorDTO;
};

export function RandomConnect({
  enabled,
  defaultTopics,
  defaultLanguage,
}: {
  enabled: boolean;
  defaultTopics: string[];
  defaultLanguage: string | null;
}) {
  const { socket } = useRealtime();
  const [status, setStatus] = React.useState<Status>("idle");
  const [waitingCount, setWaitingCount] = React.useState(0);
  const [partner, setPartner] = React.useState<AuthorDTO | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [topics, setTopics] = React.useState<string[]>(defaultTopics.slice(0, 5));
  const [language, setLanguage] = React.useState(defaultLanguage ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const applyState = React.useCallback((data: ConnectState) => {
    setWaitingCount(data.waitingCount ?? 0);
    if (data.state === "matched" && data.conversationId) {
      setStatus("matched");
      setConversationId(data.conversationId);
      if (data.partner) setPartner(data.partner);
    } else if (data.state === "waiting") {
      setStatus("waiting");
    } else {
      setStatus("idle");
    }
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<ConnectState>("/api/v1/connect");
      applyState(data);
      if (data.state === "matched" && data.match) {
        setConversationId(data.match.conversationId);
      }
    } catch {
      /* status refresh is best effort */
    }
  }, [applyState]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (status !== "waiting") return;
    const interval = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(interval);
  }, [status, refresh]);

  React.useEffect(() => {
    if (!socket) return;
    const onMatched = (payload: { conversationId: string; partner?: AuthorDTO }) => {
      setStatus("matched");
      setConversationId(payload.conversationId);
      if (payload.partner) setPartner(payload.partner);
    };
    socket.on("connect:matched", onMatched);
    return () => {
      socket.off("connect:matched", onMatched);
    };
  }, [socket]);

  async function act(action: "join" | "leave" | "skip") {
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<ConnectState>("/api/v1/connect", {
        method: "POST",
        json: { action, topics: action === "join" ? topics : [], language: language || null },
      });
      if (action === "skip" || action === "leave") {
        setPartner(null);
        setConversationId(null);
      }
      if (action === "join" && data.state === "matched" && data.conversationId) {
        setConversationId(data.conversationId);
        if (data.partner) setPartner(data.partner);
        setStatus("matched");
        return;
      }
      applyState(data);
    } catch (err) {
      setError(errorMessage(err));
      toast({ title: "Random Connect", description: errorMessage(err), variant: "error" });
    } finally {
      setPending(false);
    }
  }

  function toggleTopic(topic: string) {
    setTopics((prev) => (prev.includes(topic) ? prev.filter((item) => item !== topic) : prev.length >= 5 ? prev : [...prev, topic]));
  }

  if (!enabled) {
    return (
      <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Shuffle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold text-ink">Random Connect is turned off</h2>
        <p className="mt-2 max-w-sm text-[13.5px] leading-6 text-ink-muted">
          You can enable it again from Privacy settings whenever you want to meet someone new.
        </p>
        <Link
          href="/settings"
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-surface-3 px-4 text-[13px] font-semibold text-ink hover:bg-line/60"
        >
          Open settings
        </Link>
      </div>
    );
  }

  if (status === "matched" && conversationId) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-fuchsia-500/25 via-electric/20 to-cyan-400/15 px-6 py-10 text-center">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-surface/60 p-1 shadow-[0_0_40px_-10px_rgba(192,38,211,.8)]">
            {partner ? (
              <Avatar src={partner.avatarUrl} name={partner.displayName} size="2xl" neon />
            ) : (
              <UserRound className="h-9 w-9 text-ink-faint" />
            )}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">
            {partner ? `You matched with ${partner.displayName}` : "You have a new connection"}
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Say hello, find common ground, and keep it kind. You can skip to meet someone else at any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={`/messages/${conversationId}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-electric to-ocean px-5 text-[14px] font-semibold text-white shadow-[0_14px_36px_-16px_rgba(139,92,246,1)] ring-1 ring-inset ring-white/20"
            >
              <MessageSquare className="h-4 w-4" /> Open conversation
            </Link>
            <Button variant="outline" loading={pending} onClick={() => act("skip")}>
              <RefreshCw className="h-4 w-4" /> Skip
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card overflow-hidden">
        <div className="relative bg-gradient-to-br from-fuchsia-500/20 via-electric/20 to-cyan-400/10 px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brand shadow-[0_0_34px_-10px_rgba(139,92,246,.9)]">
            {status === "waiting" && (
              <>
                <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-fuchsia-400/60" aria-hidden />
                <span
                  className="absolute inset-0 animate-pulse-ring rounded-2xl border border-cyan-300/40"
                  style={{ animationDelay: "1.2s" }}
                  aria-hidden
                />
              </>
            )}
            {status === "waiting" ? <Loader2 className="h-7 w-7 animate-spin" /> : <Shuffle className="h-7 w-7" />}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">
            {status === "waiting" ? "Looking for someone new..." : "Meet someone beyond your circle"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-ink-muted">
            {status === "waiting"
              ? "We will match you with a compatible person. Keep this page open or come back shortly."
              : "Share your interests and we will pair you with someone who matches, with age-safe matching always on."}
          </p>
          {status === "waiting" && (
            <p className="mt-2 text-[11.5px] font-medium text-ink-faint">
              {waitingCount} {waitingCount === 1 ? "person" : "people"} in the queue
            </p>
          )}
        </div>

        <div className="space-y-4 p-5">
          {status === "idle" && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ink">Topics you enjoy</p>
                  <span className="text-[11px] text-ink-faint">Up to 5</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.slice(0, 16).map((topic) => {
                    const selected = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                          selected
                            ? "border-brand/35 bg-gradient-to-r from-fuchsia-500/10 to-electric/10 text-brand shadow-[0_4px_14px_-12px_rgba(124,58,237,.4)] dark:border-fuchsia-400/40 dark:from-fuchsia-500/20 dark:to-electric/20 dark:text-[#e9d5ff] dark:shadow-[0_0_18px_-10px_rgba(192,38,211,.9)]"
                            : "border-line bg-surface text-ink-muted hover:border-electric/40 hover:text-ink"
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="connect-language" className="mb-1.5 block text-[13px] font-semibold text-ink">
                  Preferred conversation language
                </label>
                <select
                  id="connect-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-[13.5px] text-ink outline-none"
                >
                  <option value="">Any language</option>
                  {LANGUAGES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button className="w-full" size="lg" loading={pending} onClick={() => act("join")}>
                {!pending && <Shuffle className="h-4 w-4" />}
                Start Random Connect
              </Button>
            </>
          )}

          {status === "waiting" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="flex-1" loading={pending} onClick={() => act("leave")}>
                <X className="h-4 w-4" /> Leave queue
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => refresh()}>
                <RefreshCw className="h-4 w-4" /> Check again
              </Button>
            </div>
          )}

          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>

      <div className="surface-card flex items-start gap-3 p-4">
        <span className="icon-tile mt-0.5 h-9 w-9">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink">Safety comes first</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">
            Matching respects age groups, blocks, and your privacy settings. Report anything uncomfortable and leave at any
            time.
          </p>
        </div>
      </div>
    </div>
  );
}
