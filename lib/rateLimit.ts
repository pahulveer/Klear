import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window cache per IP
const ipRequestCache = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  ipRequestCache.forEach((record, ip) => {
    const validTimestamps = record.timestamps.filter((t: number) => now - t < windowMs);
    if (validTimestamps.length === 0) {
      ipRequestCache.delete(ip);
    } else {
      record.timestamps = validTimestamps;
    }
  });
}

/**
 * Extracts client IP safely from standard headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks sliding window rate limit for an incoming request
 * @param req NextRequest
 * @param limit Maximum allowed requests within the window (default: 10)
 * @param windowMs Time window in milliseconds (default: 60,000 ms / 1 minute)
 */
export function checkRateLimit(
  req: NextRequest,
  limit: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  purgeExpiredRecords(windowMs);

  const ip = getClientIp(req);
  const record = ipRequestCache.get(ip) || { timestamps: [] };

  // Retain only timestamps within the current window
  const windowStart = now - windowMs;
  const recentTimestamps = record.timestamps.filter((t: number) => t > windowStart);

  if (recentTimestamps.length >= limit) {
    const oldestInWindow = recentTimestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  recentTimestamps.push(now);
  ipRequestCache.set(ip, { timestamps: recentTimestamps });

  return {
    allowed: true,
    remaining: limit - recentTimestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}
