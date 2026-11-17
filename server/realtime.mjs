// Socket.IO realtime layer. Runs in the same Node process as Next.js.
// Handles presence, conversation delivery, typing, read receipts, live-room
// signaling (WebRTC) and live chat.
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient({ log: ["error"] });

const SESSION_COOKIE = "everlink_session";
const onlineCounts = new Map();
const PRESENCE_COUNTS = "everlink:presence:counts";
const PRESENCE_ONLINE = "everlink:presence:online";
let sharedRedis = null;

function presenceJoinLocal(userId) {
  onlineCounts.set(userId, (onlineCounts.get(userId) || 0) + 1);
  return { online: Array.from(onlineCounts.keys()), first: onlineCounts.get(userId) === 1 };
}

async function presenceJoin(userId) {
  if (sharedRedis) {
    try {
      const count = await sharedRedis.hincrby(PRESENCE_COUNTS, userId, 1);
      await sharedRedis.sadd(PRESENCE_ONLINE, userId);
      await sharedRedis.expire(PRESENCE_COUNTS, 86400);
      await sharedRedis.expire(PRESENCE_ONLINE, 86400);
      const online = await sharedRedis.smembers(PRESENCE_ONLINE);
      return { online, first: count === 1 };
    } catch (error) {
      console.error("[socket] presence redis error, using local state:", error.message);
      sharedRedis = null;
    }
  }
  return presenceJoinLocal(userId);
}

async function presenceLeave(userId) {
  if (sharedRedis) {
    try {
      const remaining = await sharedRedis.hincrby(PRESENCE_COUNTS, userId, -1);
      if (remaining <= 0) {
        await sharedRedis.hdel(PRESENCE_COUNTS, userId);
        await sharedRedis.srem(PRESENCE_ONLINE, userId);
        return { offline: true };
      }
      return { offline: false };
    } catch (error) {
      console.error("[socket] presence redis error, using local state:", error.message);
      sharedRedis = null;
    }
  }
  const remaining = (onlineCounts.get(userId) || 1) - 1;
  if (remaining <= 0) {
    onlineCounts.delete(userId);
    return { offline: true };
  }
  onlineCounts.set(userId, remaining);
  return { offline: false };
}

async function presenceCount(userId) {
  if (sharedRedis) {
    try {
      return Number(await sharedRedis.hget(PRESENCE_COUNTS, userId)) || 0;
    } catch {
      /* fall through to local count */
    }
  }
  return onlineCounts.get(userId) || 0;
}

// Never send the full user row over the socket: it contains passwordHash and email.
const socketAuthorSelect = {
  id: true,
  username: true,
  verified: true,
  profile: { select: { displayName: true, avatarUrl: true, countryCode: true } },
};

function mapSocketAuthor(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
    verified: user.verified,
    countryCode: user.profile?.countryCode ?? null,
  };
}

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function makeThrottle(limit, windowMs) {
  let count = 0;
  let resetAt = Date.now() + windowMs;
  return () => {
    const now = Date.now();
    if (now > resetAt) {
      count = 0;
      resetAt = now + windowMs;
    }
    count += 1;
    return count <= limit;
  };
}

export async function attachRealtime(server) {
  const io = new Server(server, {
    path: "/socket.io",
    maxHttpBufferSize: 1_000_000,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    serveClient: false,
  });

  if (process.env.REDIS_URL) {
    let pub = null;
    let sub = null;
    try {
      const [{ createAdapter }, { default: Redis }] = await Promise.all([
        import("@socket.io/redis-adapter"),
        import("ioredis"),
      ]);
      const options = {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      };
      pub = new Redis(process.env.REDIS_URL, options);
      sub = pub.duplicate();
      pub.on("error", (error) => console.error("[socket] redis pub error:", error.message));
      sub.on("error", (error) => console.error("[socket] redis sub error:", error.message));
      await Promise.race([
        Promise.all([pub.connect(), sub.connect()]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("connection timeout")), 3000)),
      ]);
      io.adapter(createAdapter(pub, sub));
      sharedRedis = pub;
      console.log("[socket] redis adapter enabled for multi-instance realtime");
    } catch (error) {
      console.error("[socket] redis adapter unavailable, continuing single-process:", error.message);
      try {
        pub?.disconnect();
        sub?.disconnect();
      } catch {
        /* ignore cleanup errors */
      }
      sharedRedis = null;
    }
  }

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[SESSION_COOKIE];
      if (!token) return next(new Error("unauthorized"));
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: { include: { profile: true, settings: true } } },
      });
      if (!session || session.pending2fa || session.expiresAt.getTime() < Date.now()) {
        return next(new Error("unauthorized"));
      }
      if (session.user.status !== "ACTIVE" || session.user.deletedAt) return next(new Error("unauthorized"));
      socket.data.user = session.user;
      socket.data.sessionId = session.id;
      next();
    } catch (error) {
      console.error("[socket] auth error", error);
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    const userId = user.id;
    const displayName = user.profile?.displayName || user.username;
    const msgThrottle = makeThrottle(20, 60_000);
    const eventThrottle = makeThrottle(60, 60_000);

    socket.join(`user:${userId}`);

    // Presence
    const presence = await presenceJoin(userId);
    socket.emit("presence:init", { online: presence.online });
    if (presence.first && user.settings?.showOnlineStatus !== false) {
      socket.broadcast.emit("presence:update", { userId, online: true });
    }

    // Join conversation rooms
    const memberships = await prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });
    for (const m of memberships) socket.join(`conv:${m.conversationId}`);

    socket.on("conversation:subscribe", async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        const member = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!member || member.leftAt) return ack?.({ ok: false });
        socket.join(`conv:${conversationId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on("message:send", async (payload, ack) => {
      try {
        if (!msgThrottle()) return ack?.({ ok: false, error: "Slow down a little." });
        const conversationId = String(payload?.conversationId || "");
        let body = typeof payload?.body === "string" ? payload.body.trim() : "";
        const replyToId = typeof payload?.replyToId === "string" ? payload.replyToId : null;
        if (!conversationId || !body || body.length > 5000) return ack?.({ ok: false, error: "Invalid message." });

        const member = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
          include: {
            conversation: { include: { members: { where: { leftAt: null }, select: { userId: true } } } },
          },
        });
        if (!member || member.leftAt) return ack?.({ ok: false, error: "You are not in this conversation." });

        const otherIds = member.conversation.members.map((m) => m.userId).filter((id) => id !== userId);
        if (otherIds.length === 0) return ack?.({ ok: false, error: "This conversation has no other members." });
        const blocked = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: { in: otherIds } },
              { blockerId: { in: otherIds }, blockedId: userId },
            ],
          },
        });
        if (blocked) return ack?.({ ok: false, error: "This conversation is unavailable." });

        if (replyToId) {
          const reply = await prisma.message.findFirst({ where: { id: replyToId, conversationId } });
          if (!reply) return ack?.({ ok: false, error: "The message you replied to no longer exists." });
        }

        const message = await prisma.message.create({
          data: { conversationId, senderId: userId, body, replyToId },
          include: {
            sender: { select: socketAuthorSelect },
            attachments: true,
            replyTo: { select: { id: true, body: true, sender: { select: socketAuthorSelect } } },
          },
        });
        await prisma.$transaction([
          prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
          prisma.conversationMember.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { lastReadAt: new Date() },
          }),
        ]);
        const messagePayload = {
          id: message.id,
          conversationId: message.conversationId,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          editedAt: message.editedAt?.toISOString() ?? null,
          sender: mapSocketAuthor(message.sender),
          attachments: message.attachments,
          replyTo: message.replyTo
            ? { id: message.replyTo.id, body: message.replyTo.body, senderName: mapSocketAuthor(message.replyTo.sender).displayName }
            : null,
        };
        io.to(`conv:${conversationId}`).emit("message:new", messagePayload);
        socket.emit("message:delivered", { messageId: message.id, conversationId });

        for (const recipientId of otherIds) {
          try {
            const settings = await prisma.userSettings.findUnique({ where: { userId: recipientId } });
            if (settings && settings.notifyMessages === false) continue;
            await prisma.notification.create({
              data: {
                userId: recipientId,
                type: "MESSAGE",
                actorId: userId,
                entityType: "MESSAGE",
                entityId: message.id,
                title: `New message from ${displayName}`,
                body: body.slice(0, 120),
                link: `/messages?c=${conversationId}`,
                dedupeKey: `message:${message.id}`,
              },
            });
            io.to(`user:${recipientId}`).emit("notification:new", { type: "MESSAGE", link: `/messages?c=${conversationId}` });
          } catch (err) {
            if (err?.code !== "P2002") console.error("[socket] notification error", err);
          }
        }
        ack?.({ ok: true, message: messagePayload });
      } catch (error) {
        console.error("[socket] message:send", error);
        ack?.({ ok: false, error: "Message could not be sent." });
      }
    });

    socket.on("typing", async (payload) => {
      if (!eventThrottle()) return;
      const conversationId = String(payload?.conversationId || "");
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        username: user.username,
        displayName,
        typing: Boolean(payload?.typing),
      });
    });

    socket.on("message:read", async (payload) => {
      try {
        const conversationId = String(payload?.conversationId || "");
        if (!conversationId) return;
        const at = new Date();
        await prisma.conversationMember.updateMany({
          where: { conversationId, userId },
          data: { lastReadAt: at },
        });
        socket.to(`conv:${conversationId}`).emit("message:read", { conversationId, userId, at });
      } catch {
        /* ignore */
      }
    });

    // Live rooms
    socket.data.liveRooms = new Set();

    socket.on("live:join", async (payload, ack) => {
      try {
        const roomId = String(payload?.roomId || "");
        if (!roomId) return ack?.({ ok: false });
        const roomSockets = io.sockets.adapter.rooms.get(`live:${roomId}`);
        const peers = [];
        if (roomSockets) {
          for (const socketId of roomSockets) {
            if (socketId === socket.id) continue;
            const peer = io.sockets.sockets.get(socketId);
            if (peer?.data?.user) {
              peers.push({
                socketId,
                userId: peer.data.user.id,
                username: peer.data.user.username,
                displayName: peer.data.user.profile?.displayName || peer.data.user.username,
              });
            }
          }
        }
        socket.join(`live:${roomId}`);
        socket.data.liveRooms.add(roomId);
        socket.emit("live:peers", { roomId, peers });
        socket.to(`live:${roomId}`).emit("live:peer-joined", {
          roomId,
          socketId: socket.id,
          userId,
          username: user.username,
          displayName,
        });
        ack?.({ ok: true, peers });
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on("live:leave", (payload) => {
      const roomId = String(payload?.roomId || "");
      leaveLiveRoom(roomId);
    });

    function leaveLiveRoom(roomId) {
      if (!roomId) return;
      socket.leave(`live:${roomId}`);
      if (socket.data.liveRooms) socket.data.liveRooms.delete(roomId);
      socket.to(`live:${roomId}`).emit("live:peer-left", { roomId, socketId: socket.id, userId });
    }

    socket.on("webrtc:signal", (payload) => {
      if (!eventThrottle()) return;
      const roomId = String(payload?.roomId || "");
      const targetSocketId = String(payload?.targetSocketId || "");
      const data = payload?.data;
      if (!roomId || !targetSocketId || !socket.data.liveRooms?.has(roomId)) return;
      const target = io.sockets.sockets.get(targetSocketId);
      if (!target?.data?.liveRooms?.has(roomId) || !data || typeof data !== "object") return;
      if (!["offer", "answer", "ice"].includes(data.kind)) return;
      target.emit("webrtc:signal", {
        roomId,
        fromSocketId: socket.id,
        fromUserId: userId,
        fromDisplayName: displayName,
        data,
      });
    });

    socket.on("live:chat", (payload) => {
      if (!eventThrottle()) return;
      const roomId = String(payload?.roomId || "");
      const body = typeof payload?.body === "string" ? payload.body.trim().slice(0, 500) : "";
      if (!roomId || !body || !socket.data.liveRooms?.has(roomId)) return;
      io.to(`live:${roomId}`).emit("live:chat", {
        roomId,
        userId,
        username: user.username,
        displayName,
        body,
        at: new Date().toISOString(),
      });
    });

    socket.on("live:media-state", async (payload) => {
      const roomId = String(payload?.roomId || "");
      if (!roomId || !socket.data.liveRooms?.has(roomId)) return;
      const muted = Boolean(payload?.muted);
      const cameraOn = Boolean(payload?.cameraOn);
      socket.to(`live:${roomId}`).emit("live:media-state", { roomId, userId, muted, cameraOn });
      await prisma.liveRoomParticipant
        .updateMany({ where: { roomId, userId }, data: { muted, cameraOn } })
        .catch(() => {});
    });

    socket.on("disconnect", async () => {
      const presence = await presenceLeave(userId);
      if (presence.offline && user.settings?.showOnlineStatus !== false) {
        io.emit("presence:update", { userId, online: false });
      }

      for (const roomId of socket.data.liveRooms || []) {
        socket.to(`live:${roomId}`).emit("live:peer-left", { roomId, socketId: socket.id, userId });
        const stillOnline = sharedRedis
          ? (await presenceCount(userId)) > 0
          : Array.from(io.sockets.sockets.values()).some(
              (s) => s.data?.user?.id === userId && s.data.liveRooms?.has(roomId)
            );
        if (!stillOnline) {
          await prisma.liveRoomParticipant
            .updateMany({ where: { roomId, userId, leftAt: null }, data: { leftAt: new Date() } })
            .catch(() => {});
        }
      }
    });
  });

  return io;
}
