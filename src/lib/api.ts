import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@prisma/client";
import { rateLimit, rateLimitHeaders } from "./rate-limit";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "You must be signed in to do that.") {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "You do not have permission to do that.") {
  return new ApiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found.") {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string) {
  return new ApiError(409, "CONFLICT", message);
}

export function tooMany(message = "Too many requests. Please slow down.") {
  return new ApiError(429, "RATE_LIMITED", message);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the highlighted fields.",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return json({ error: { code: "CONFLICT", message: "That value is already taken." } }, { status: 409 });
    }
    if (error.code === "P2025") {
      return json({ error: { code: "NOT_FOUND", message: "The requested record no longer exists." } }, { status: 404 });
    }
  }
  console.error("[api] unhandled error", error);
  return json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
}

export async function withApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}

export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

/** Cookie auth is SameSite=Lax; this adds an origin check for state-changing calls. */
export async function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Invalid request origin.");
  }
  const allowedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).host : null;
  if (originHost !== host && originHost !== allowedOrigin) {
    throw forbidden("Cross-origin request blocked.");
  }
}

export async function enforceRateLimit(req: Request, bucket: string, limit: number, windowMs: number) {
  const ip = getClientIp(req);
  const result = await rateLimit(`${bucket}:${ip}`, limit, windowMs);
  if (!result.success) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.", {
      retryAfterSeconds: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
  }
  return rateLimitHeaders(result);
}

export async function guard(req: Request, bucket: string, limit: number, windowMs: number) {
  await assertSameOrigin(req);
  return enforceRateLimit(req, bucket, limit, windowMs);
}

export function pageMeta<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return { items: page, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null };
}
