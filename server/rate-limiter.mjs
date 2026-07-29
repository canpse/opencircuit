/**
 * @typedef {import('./contracts.mjs').RateLimiter} RateLimiter
 * @typedef {import('./contracts.mjs').RateLimiterOptions} RateLimiterOptions
 */

/** @param {RateLimiterOptions} [options] @returns {RateLimiter} */
export function createRateLimiter({ limit = 300, windowMs = 60_000, now = Date.now } = {}) {
  /** @type {Map<string, {count: number, resetAt: number}>} */
  const buckets = new Map();
  let checksSinceSweep = 0;

  /** @param {number} currentTime */
  function sweepExpiredBuckets(currentTime) {
    for (const [key, bucket] of buckets) {
      if (currentTime >= bucket.resetAt) buckets.delete(key);
    }
  }

  return {
    /** @param {string} key */
    check(key) {
      const currentTime = now();
      checksSinceSweep += 1;
      if (checksSinceSweep >= 1_000) {
        checksSinceSweep = 0;
        sweepExpiredBuckets(currentTime);
      }

      const current = buckets.get(key);
      if (!current || current.resetAt <= currentTime) {
        buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      current.count += 1;
      if (current.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
      };
    },
  };
}
