import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { ApiError, badRequest } from "./api";
import { UPLOAD_LIMITS } from "./constants";
import { allowedMimeByKind } from "./validation";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/webm": "weba",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function startsWith(buf: Buffer, bytes: number[], offset = 0) {
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Signature validation prevents disguising executables/HTML as media. */
export function validMagicBytes(mime: string, buf: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return startsWith(buf, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(buf, [0x89, 0x50, 0x4e, 0x47]);
    case "image/gif":
      return startsWith(buf, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && buf.toString("ascii", 8, 12) === "WEBP";
    case "video/mp4":
    case "video/quicktime":
    case "audio/mp4":
      return buf.toString("ascii", 4, 8) === "ftyp";
    case "video/webm":
    case "audio/webm":
      return startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]);
    case "audio/ogg":
      return startsWith(buf, [0x4f, 0x67, 0x67, 0x53]) || startsWith(buf, [0x4f, 0x70, 0x75, 0x53]);
    case "audio/mpeg":
      return startsWith(buf, [0x49, 0x44, 0x33]) || (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0);
    case "application/pdf":
      return startsWith(buf, [0x25, 0x50, 0x44, 0x46]);
    case "application/zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return startsWith(buf, [0x50, 0x4b]);
    case "application/msword":
      return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0]);
    case "text/plain":
      return !buf.subarray(0, 512).includes(0);
    default:
      return false;
  }
}

function sizeLimit(mime: string) {
  if (mime.startsWith("image/")) return UPLOAD_LIMITS.image;
  if (mime.startsWith("video/")) return UPLOAD_LIMITS.video;
  if (mime.startsWith("audio/")) return UPLOAD_LIMITS.audio;
  return UPLOAD_LIMITS.file;
}

export type SavedUpload = {
  id: string;
  url: string;
  mime: string;
  size: number;
  kind: string;
  originalName: string;
};

export async function saveUpload(file: File, kind: string, ownerId: string): Promise<SavedUpload> {
  const mime = (file.type || "").toLowerCase();
  const allowed = allowedMimeByKind[kind] ?? [];
  if (!allowed.includes(mime)) {
    throw badRequest("That file type is not allowed for this upload.");
  }
  if (file.size <= 0) throw badRequest("The uploaded file is empty.");
  if (file.size > sizeLimit(mime)) {
    throw new ApiError(413, "FILE_TOO_LARGE", `File is too large. Limit is ${Math.round(sizeLimit(mime) / 1024 / 1024)} MB.`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validMagicBytes(mime, buffer)) {
    throw badRequest("The file content does not match its declared type.");
  }

  const scope = kind === "MESSAGE" ? "private" : "public";
  const ext = MIME_EXT[mime] ?? "bin";
  const now = new Date();
  const relativeDir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(STORAGE_ROOT, scope, relativeDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  const url = `/api/v1/files/${scope}/${relativeDir}/${filename}`;
  const upload = await db.upload.create({
    data: {
      ownerId,
      url,
      kind: kind as "AVATAR" | "COVER" | "POST" | "STORY" | "MESSAGE",
      mime,
      size: file.size,
      originalName: file.name.slice(0, 255) || filename,
    },
  });
  return { id: upload.id, url, mime, size: file.size, kind, originalName: upload.originalName };
}

export async function assertUploadOwnership(userId: string, urls: string[], kind: string) {
  if (urls.length === 0) return;
  const found = await db.upload.findMany({ where: { url: { in: urls }, ownerId: userId, kind: kind as "AVATAR" } });
  if (found.length !== new Set(urls).size) {
    throw badRequest("One or more files are invalid or do not belong to you.");
  }
}

export function resolveStoredFile(scope: string, segments: string[]): string | null {
  if (!["public", "private"].includes(scope)) return null;
  if (segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) return null;
  const resolved = path.resolve(STORAGE_ROOT, scope, ...segments);
  const base = path.resolve(STORAGE_ROOT, scope);
  if (!resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

export function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const entry = Object.entries(MIME_EXT).find(([, v]) => v === ext);
  return entry?.[0] ?? "application/octet-stream";
}
