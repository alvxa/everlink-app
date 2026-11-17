import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const key = `test-limit-${Date.now()}-${Math.random()}`;
    const windowMs = 60_000;
    const first = await rateLimit(key, 3, windowMs);
    const second = await rateLimit(key, 3, windowMs);
    const third = await rateLimit(key, 3, windowMs);
    const fourth = await rateLimit(key, 3, windowMs);

    expect(first.success).toBe(true);
    expect(first.remaining).toBe(2);
    expect(second.success).toBe(true);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("resets once the window passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = `test-reset-${Math.random()}`;
    expect((await rateLimit(key, 1, 1_000)).success).toBe(true);
    expect((await rateLimit(key, 1, 1_000)).success).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:02Z"));
    const afterWindow = await rateLimit(key, 1, 1_000);
    expect(afterWindow.success).toBe(true);
    expect(afterWindow.remaining).toBe(0);
  });

  it("uses the in-process backend when Redis is not configured", async () => {
    const previous = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    delete (globalThis as { __everlinkRedis?: unknown }).__everlinkRedis;
    try {
      const result = await rateLimit(`test-backend-${Math.random()}`, 5, 1_000);
      expect(result.backend).toBe("memory");
    } finally {
      if (previous === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previous;
      delete (globalThis as { __everlinkRedis?: unknown }).__everlinkRedis;
    }
  });

  it("emits rate limit headers", () => {
    const headers = rateLimitHeaders({ success: true, remaining: 4, resetAt: 1_800_000_000_000, backend: "memory" });
    expect(headers["X-RateLimit-Remaining"]).toBe("4");
    expect(headers["X-RateLimit-Reset"]).toBe("1800000000");
  });
});
