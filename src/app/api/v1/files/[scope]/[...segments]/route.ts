import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { contentTypeFor, resolveStoredFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scope: string; segments: string[] }> }
) {
  const { scope, segments } = await params;
  const filePath = resolveStoredFile(scope, segments);
  if (!filePath) return new Response("Not found", { status: 404 });

  if (scope === "private") {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const url = `/api/v1/files/${scope}/${segments.join("/")}`;
    const attachment = await db.messageAttachment.findFirst({
      where: { url },
      include: { message: { include: { conversation: { include: { members: { select: { userId: true } } } } } } },
    });
    const allowed =
      Boolean(attachment?.message.conversation.members.some((m) => m.userId === user.id)) ||
      Boolean(await db.upload.findFirst({ where: { url, ownerId: user.id } }));
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const mime = contentTypeFor(filePath);
  const inline = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") || mime === "application/pdf";
  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(buffer.length),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": scope === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
  });
  return new Response(new Uint8Array(buffer), { headers });
}
