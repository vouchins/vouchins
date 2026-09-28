import { checkRateLimit, resetRateLimit, clearAllRateLimits } from "@/lib/rate-limit";

describe("Sliding-window Rate Limiter", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("allows requests within the limit", () => {
    const key = "test-key-1";
    const config = { windowMs: 1000, max: 3 };

    const res1 = checkRateLimit(key, config);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(key, config);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(key, config);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", () => {
    const key = "test-key-2";
    const config = { windowMs: 1000, max: 2 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const blocked = checkRateLimit(key, config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(Date.now());
  });

  it("resets rate limit for a specific key", () => {
    const key = "test-key-3";
    const config = { windowMs: 1000, max: 1 };

    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).success).toBe(false);

    resetRateLimit(key);

    expect(checkRateLimit(key, config).success).toBe(true);
  });
});
