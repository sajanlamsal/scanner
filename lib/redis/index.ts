import IORedis from "ioredis";

/** Thin wrapper around ioredis that matches the Upstash API used across this codebase:
 *  - get/set auto-serialise / deserialise JSON
 *  - hgetall returns null when key missing (not {})
 *  - pipeline wraps lpush/ltrim/exec
 */
class RedisClient {
  private client: IORedis;

  constructor() {
    this.client = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    if (val === null) return null;
    try { return JSON.parse(val) as T; } catch { return val as unknown as T; }
  }

  async set(key: string, value: unknown): Promise<void> {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    await this.client.set(key, str);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const result = await this.client.hgetall(key);
    return Object.keys(result).length === 0 ? null : result;
  }

  async hset(key: string, fields: Record<string, unknown>): Promise<void> {
    const flat: (string | number)[] = [];
    for (const [k, v] of Object.entries(fields)) flat.push(k, String(v));
    await this.client.hset(key, ...flat);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  pipeline() {
    const pipe = this.client.pipeline();
    const wrapper = {
      lpush: (key: string, ...values: string[]) => { pipe.lpush(key, ...values); return wrapper; },
      ltrim: (key: string, start: number, stop: number) => { pipe.ltrim(key, start, stop); return wrapper; },
      exec: async () => { await pipe.exec(); },
    };
    return wrapper;
  }
}

let _redis: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (!_redis) _redis = new RedisClient();
  return _redis;
}

/** Convenience proxy — callers use `redis.get(...)` directly */
export const redis = new Proxy({} as RedisClient, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
