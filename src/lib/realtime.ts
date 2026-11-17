import type { Server } from "socket.io";

export function getIO(): Server | null {
  return (globalThis as unknown as { __everlinkIO?: Server }).__everlinkIO ?? null;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  getIO()?.to(`conv:${conversationId}`).emit(event, payload);
}

export function emitToLiveRoom(roomId: string, event: string, payload: unknown) {
  getIO()?.to(`live:${roomId}`).emit(event, payload);
}
