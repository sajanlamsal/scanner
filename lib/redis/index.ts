import { Redis } from "@upstash/redis";

/**
 * Lazy Redis singleton — avoids module-level initialization that would warn
 * during Next.js build when env vars are absent.
 */
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

/**
 * Convenience proxy so callers can use `redis.get(...)` directly without
 * changing every call site.
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
