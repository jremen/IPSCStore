import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';

interface RateLimitConfig {
  kind: 'admin' | 'stage';
  maxAttempts: number;
  windowMs: number;
}

/**
 * In-DB rate limiter for auth attempts.
 * Tracks failed login attempts per IP (admin) or IP+stageId (stage).
 * Returns 429 when the limit is exceeded within the time window.
 * Successful logins clear the counter for that key.
 */
export function rateLimiter(config: RateLimitConfig) {
  const { kind, maxAttempts, windowMs } = config;

  return async (c: Context, next: Next) => {
    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim()
      || c.req.header('x-real-ip')
      || c.req.raw.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || 'unknown';

    let key: string;
    if (kind === 'stage') {
      const stageId = c.req.param('stageId') || '';
      key = `${clientIp}:${stageId}`;
    } else {
      key = clientIp;
    }

    const windowStart = new Date(Date.now() - windowMs).toISOString();

    // Count failed attempts in the window
    const [result] = await sql`
      SELECT COUNT(*) as count FROM auth_attempts
      WHERE kind = ${kind} AND key = ${key} AND ok = false AND attempted_at > ${windowStart}
    `;
    const failCount = Number(result?.count || 0);

    if (failCount >= maxAttempts) {
      return c.json({ error: 'Too many failed attempts. Please try again later.' }, 429);
    }

    // Store this attempt info for later (will be marked ok=true on success)
    c.set('rateLimitKind', kind);
    c.set('rateLimitKey', key);

    return next();
  };
}

/**
 * Record a failed auth attempt.
 */
export async function recordFailedAttempt(kind: string, key: string) {
  await sql`
    INSERT INTO auth_attempts (kind, key, ok, attempted_at)
    VALUES (${kind}, ${key}, false, now())
  `;
}

/**
 * Clear failed attempts for a key on successful login.
 */
export async function clearAttempts(kind: string, key: string) {
  await sql`
    DELETE FROM auth_attempts
    WHERE kind = ${kind} AND key = ${key}
  `;
}
