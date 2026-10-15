import type { Env } from './env.ts';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

/** Fallback na wypadek braku bindingu: licznik w pamięci izolatu (best effort). */
const memory = new Map<string, { count: number; resetAt: number }>();

export function memoryLimit(key: string, now = Date.now()): boolean {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    if (memory.size > 5_000) memory.clear();
    memory.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

/** Zwraca true, jeśli żądanie mieści się w limicie dla danego klucza (IP klienta). */
export async function checkRateLimit(env: Env, key: string): Promise<boolean> {
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key });
    return success;
  }
  return memoryLimit(key);
}
