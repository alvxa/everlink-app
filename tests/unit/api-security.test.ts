import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import {
  ApiError,
  assertSameOrigin,
  badRequest,
  errorResponse,
  getClientIp,
  pageMeta,
  parseJson,
  withApi,
} from "@/lib/api";

describe("error envelope", () => {
  it("maps ApiError to its status and code", async () => {
    const res = errorResponse(new ApiError(403, "FORBIDDEN", "No access."));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: "No access." },
    });
  });

  it("maps Zod errors to a 422 with field details", async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "nope" });
    const res = errorResponse(result.success ? null : result.error);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; details: Record<string, string[]> } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.email?.length).toBeGreaterThan(0);
  });

  it("hides internal error details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = errorResponse(new Error("database password leaked"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("database password");
    spy.mockRestore();
  });

  it("wraps handlers so thrown errors still become responses", async () => {
    const res = await withApi(async () => {
      throw badRequest("Bad input.");
    });
    expect(res.status).toBe(400);
  });
});

describe("parseJson", () => {
  it("rejects malformed JSON and invalid payloads", async () => {
    const invalidJson = new Request("http://localhost/api", { method: "POST", body: "{oops" });
    await expect(parseJson(invalidJson, z.object({ a: z.string() }))).rejects.toThrow("valid JSON");

    const wrongShape = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ a: 1 }) });
    await expect(parseJson(wrongShape, z.object({ a: z.string() }))).rejects.toBeInstanceOf(ZodError);
  });
});

describe("assertSameOrigin", () => {
  it("allows safe methods without an origin", async () => {
    await expect(assertSameOrigin(new Request("http://localhost/api", { method: "GET" }))).resolves.toBeUndefined();
  });

  it("allows same-host state-changing requests", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    });
    await expect(assertSameOrigin(req)).resolves.toBeUndefined();
  });

  it("blocks cross-origin state-changing requests", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://evil.example" },
    });
    await expect(assertSameOrigin(req)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("blocks malformed origins", async () => {
    const req = new Request("http://localhost/api", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "not a url" },
    });
    await expect(assertSameOrigin(req)).rejects.toMatchObject({ status: 403 });
  });
});

describe("getClientIp", () => {
  it("prefers the first forwarded address", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip then loopback", () => {
    expect(getClientIp(new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.4" } }))).toBe("198.51.100.4");
    expect(getClientIp(new Request("http://localhost"))).toBe("127.0.0.1");
  });
});

describe("pageMeta", () => {
  it("returns a cursor only when more rows exist", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pageMeta(items, 3)).toEqual({ items, nextCursor: null });
    expect(pageMeta(items, 2)).toEqual({ items: items.slice(0, 2), nextCursor: "b" });
  });
});
