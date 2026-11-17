import "server-only";
import { db } from "@/lib/db";
import { badRequest, conflict, forbidden } from "@/lib/api";
import { canRandomMatch } from "@/lib/utils";
import { mapAuthor } from "@/lib/queries";
import { emitToUser } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import type { SessionUser } from "@/lib/auth";

type QueueEntry = {
  userId: string;
  topics: string[];
  language: string | null;
  joinedAt: number;
};

type MatchInfo = { conversationId: string; partnerId: string; matchedAt: number };

const store = globalThis as unknown as {
  __everlinkConnectQueue?: QueueEntry[];
  __everlinkConnectMatches?: Map<string, MatchInfo>;
  __everlinkConnectHistory?: Map<string, number[]>;
  __everlinkConnectLastPartner?: Map<string, string>;
};

const queue = (store.__everlinkConnectQueue ??= []);
const matches = (store.__everlinkConnectMatches ??= new Map());
const history = (store.__everlinkConnectHistory ??= new Map());
const lastPartner = (store.__everlinkConnectLastPartner ??= new Map());

const MATCH_WINDOW_MS = 60 * 60 * 1000;
const MAX_MATCHES_PER_HOUR = 10;
const COOLDOWN_MS = 5_000;

function pruneQueue() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i]!.joinedAt < cutoff) queue.splice(i, 1);
  }
}

export function connectStatus(userId: string) {
  pruneQueue();
  const match = matches.get(userId);
  const waiting = queue.some((entry) => entry.userId === userId);
  return {
    state: match ? ("matched" as const) : waiting ? ("waiting" as const) : ("idle" as const),
    match: match ?? null,
    waitingCount: queue.length,
  };
}

export async function leaveQueue(userId: string) {
  const index = queue.findIndex((entry) => entry.userId === userId);
  if (index >= 0) queue.splice(index, 1);
  return connectStatus(userId);
}

export async function endMatch(userId: string) {
  const match = matches.get(userId);
  if (!match) return;
  matches.delete(userId);
  const partnerMatch = matches.get(match.partnerId);
  if (partnerMatch?.conversationId === match.conversationId) matches.delete(match.partnerId);
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: match.conversationId, userId } },
  });
  if (membership) {
    await db.conversationMember.update({ where: { id: membership.id }, data: { leftAt: new Date() } });
  }
  await db.message
    .create({
      data: {
        conversationId: match.conversationId,
        senderId: userId,
        body: "This random connection has ended. You can start a new one whenever you like.",
      },
    })
    .catch(() => {});
}

export async function joinQueue(
  user: SessionUser,
  preferences: { topics: string[]; language: string | null }
): Promise<{ status: "matched" | "waiting"; conversationId?: string; partner?: ReturnType<typeof mapAuthor> }> {
  if (!user.onboardedAt) throw badRequest("Finish setting up your profile first.");
  if (user.settings?.allowRandomConnect === false) {
    throw forbidden("Random Connect is turned off in your settings.");
  }

  const now = Date.now();
  const recent = (history.get(user.id) ?? []).filter((t: number) => now - t < MATCH_WINDOW_MS);
  history.set(user.id, recent);
  if (recent.length >= MAX_MATCHES_PER_HOUR) throw conflict("You have reached the hourly limit for new connections.");
  const last = recent[recent.length - 1];
  if (last && now - last < COOLDOWN_MS) throw conflict("Give the previous conversation a moment before matching again.");

  pruneQueue();
  if (queue.some((entry) => entry.userId === user.id)) return { status: "waiting" };

  const me = { userId: user.id, topics: preferences.topics, language: preferences.language, joinedAt: now };
  queue.push(me);

  // Find the oldest compatible waiting person. Both queue entries are removed
  // before any awaits so two concurrent joins cannot claim the same partner.
  const candidates = queue.filter((entry) => entry.userId !== user.id);
  for (const candidate of candidates) {
    if (lastPartner.get(user.id) === candidate.userId) continue;
    const candidateUser = await db.user.findFirst({
      where: { id: candidate.userId, status: "ACTIVE", deletedAt: null, onboardedAt: { not: null } },
      select: {
        id: true,
        username: true,
        dateOfBirth: true,
        profile: true,
        verified: true,
        settings: { select: { allowRandomConnect: true, connectLanguage: true } },
        languages: { select: { code: true } },
        blocksMade: { where: { blockedId: user.id }, select: { id: true } },
        blocksReceived: { where: { blockerId: user.id }, select: { id: true } },
      },
    });
    if (!candidateUser) continue;
    if (candidateUser.settings?.allowRandomConnect === false) continue;
    if (!canRandomMatch(user.dateOfBirth, candidateUser.dateOfBirth)) continue;
    if (candidateUser.blocksMade.length || candidateUser.blocksReceived.length) continue;

    const language = preferences.language;
    const candidateLanguage = candidateUser.settings?.connectLanguage ?? candidateUser.languages[0]?.code ?? null;
    if (language && candidateLanguage && language !== candidateLanguage) continue;

    const sharedTopics = preferences.topics.filter((topic) => candidate.topics.includes(topic));
    if (preferences.topics.length && candidate.topics.length && sharedTopics.length === 0) continue;

    // Reserve both entries.
    const meIndex = queue.findIndex((entry) => entry.userId === user.id);
    const candidateIndex = queue.findIndex((entry) => entry.userId === candidate.userId);
    if (meIndex < 0 || candidateIndex < 0) continue;
    queue.splice(Math.max(meIndex, candidateIndex), 1);
    queue.splice(Math.min(meIndex, candidateIndex), 1);

    try {
      const conversation = await db.conversation.create({
        data: {
          type: "RANDOM",
          createdById: user.id,
          members: { create: [{ userId: user.id }, { userId: candidate.userId }] },
        },
        select: { id: true },
      });
      const partner = mapAuthor({ ...candidateUser, profile: candidateUser.profile });
      const matchInfo: MatchInfo = { conversationId: conversation.id, partnerId: candidate.userId, matchedAt: now };
      matches.set(user.id, matchInfo);
      matches.set(candidate.userId, {
        conversationId: conversation.id,
        partnerId: user.id,
        matchedAt: now,
      });
      lastPartner.set(user.id, candidate.userId);
      lastPartner.set(candidate.userId, user.id);
      history.set(user.id, [...(history.get(user.id) ?? []).filter((t: number) => now - t < MATCH_WINDOW_MS), now]);
      history.set(candidate.userId, [
        ...(history.get(candidate.userId) ?? []).filter((t: number) => now - t < MATCH_WINDOW_MS),
        now,
      ]);
      emitToUser(candidate.userId, "connect:matched", {
        conversationId: conversation.id,
        partner: mapAuthor({
          id: user.id,
          username: user.username,
          verified: user.verified,
          profile: {
            displayName: user.profile?.displayName || user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
            countryCode: user.profile?.countryCode ?? null,
          },
        }),
      });
      await createNotification({
        userId: candidate.userId,
        type: "SYSTEM",
        actorId: user.id,
        title: "You have a new Random Connect",
        body: sharedTopics.length ? `Matched on ${sharedTopics.join(", ")}` : "Someone new is waiting to say hello.",
        link: `/messages/${conversation.id}`,
        entityType: "CONVERSATION",
        entityId: conversation.id,
        dedupeKey: `connect:${conversation.id}:${candidate.userId}`,
      });
      return {
        status: "matched",
        conversationId: conversation.id,
        partner,
      };
    } catch {
      queue.push(me, candidate);
      continue;
    }
  }

  return { status: "waiting" };
}
