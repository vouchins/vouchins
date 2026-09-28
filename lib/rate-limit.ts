/**
 * Lightweight, in-memory sliding-window rate limiter for sensitive endpoints.
 * Provides memory safety with automatic cleanup and supports IP/key-based throttling.
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number;      // Maximum allowed requests within the window
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;    // Timestamp in ms when window resets / oldest entry expires
}

const storage = new Map<string, number[]>();

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = storage.get(key) || [];
  // Filter out timestamps outside the active sliding window
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.max) {
    const oldestTimestamp = timestamps[0] || now;
    const reset = oldestTimestamp + config.windowMs;
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset,
    };
  }

  timestamps.push(now);
  storage.set(key, timestamps);

  // Periodic pruning if storage gets large
  if (storage.size > 2000) {
    storage.forEach((v: number[], k: string) => {
      const active = v.filter((t: number) => t > windowStart);
      if (active.length === 0) {
        storage.delete(k);
      } else {
        storage.set(k, active);
      }
    });
  }

  return {
    success: true,
    limit: config.max,
    remaining: Math.max(0, config.max - timestamps.length),
    reset: now + config.windowMs,
  };
}

export function resetRateLimit(key: string): void {
  storage.delete(key);
}

export function clearAllRateLimits(): void {
  storage.clear();
}
