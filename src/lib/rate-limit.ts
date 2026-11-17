import Redis from "ioredis";

type Entry = { count: number; resetAt: number };

const globalStore = globalThis as unknown as {
  __everlinkRateLimit?: Map<string, Entry>;
  __everlinkRedis?: Redis | null;
};

const memory = globalStore.__everlinkRateLimit ?? new Map<string, Entry>();
globalStore.__everlinkRateLimit = memory;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (globalStore.__everlinkRedis !== undefined) return globalStore.__everlinkRedis;
  try {
    const client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", () => {
      /* handled by falling back to memory */
    });
    globalStore.__everlinkRedis = client;
    return client;
  } catch {
    globalStore.__everlinkRedis = null;
    return null;
  }
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
  backend: "redis" | "memory";
};

async function ensureRedis(redis: Redis): Promise<boolean> {
  if (redis.status === "ready") return true;
  if (redis.status === "wait") {
    try {
      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("connect timeout")), 1500).unref()),
      ]);
    } catch {
      return false;
    }
  }
  return String(redis.status) === "ready";
}

/**
 * Fixed-window rate limiter. Uses Redis when REDIS_URL is configured (needed for
 * multi-instance deployments); otherwise falls back to a per-process map, which
 * is correct for a single Node instance.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const redis = getRedis();
  if (redis && (await ensureRedis(redis))) {
    try {
      const redisKey = `rl:${key}:${Math.floor(now / windowMs)}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.pexpire(redisKey, windowMs);
      return {
        success: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: (Math.floor(now / windowMs) + 1) * windowMs,
        backend: "redis",
      };
    } catch {
      // fall through to memory on Redis failure
    }
  }

  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  }
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    const entry = { count: 1, resetAt: now + windowMs };
    memory.set(key, entry);
    return { success: 1 <= limit, remaining: limit - 1, resetAt: entry.resetAt, backend: "memory" };
  }
  current.count += 1;
  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
    backend: "memory",
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
