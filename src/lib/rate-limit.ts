import { NextResponse, type NextRequest } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

declare global {
  var __nhatrangRateLimitStore__: Map<string, RateLimitBucket> | undefined;
}

function getStore() {
  if (!global.__nhatrangRateLimitStore__) {
    global.__nhatrangRateLimitStore__ = new Map<string, RateLimitBucket>();
  }

  return global.__nhatrangRateLimitStore__;
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: RateLimitBucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(existing.resetAt - now, 0),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterMs: 0,
  };
}

export function createRateLimitResponse(message: string, retryAfterMs: number) {
  const retryAfterSeconds = Math.max(Math.ceil(retryAfterMs / 1000), 1);
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
