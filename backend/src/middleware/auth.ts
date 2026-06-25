import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';

/**
 * Auth middleware for scorer-based and admin authentication.
 *
 * ALL requests (GET and write) require a valid session token:
 *   - Admin role: requires a valid admin session token (password-based auth)
 *   - Scorer role: requires a valid scorer session token (trust token auth)
 *   - No per-stage restrictions — scorer can edit any stage.
 *
 * Public endpoints (results, squads, health, etc.) are handled by
 * PUBLIC_GET_PATHS in app.ts which bypass this middleware entirely.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const token = authHeader.slice(7);

  // Check admin session first
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (adminSession) {
    c.set('authRole', 'admin');
    c.set('authStageId', '*');
    await sql`UPDATE admin_sessions SET expires_at = ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()} WHERE token = ${token}`;
    return next();
  }

  // Then check scorer session
  const [scorerSession] = await sql`
    SELECT match_id FROM scorer_sessions WHERE session_token = ${token}
  `;
  if (scorerSession) {
    await sql`UPDATE scorer_sessions SET last_used_at = now() WHERE session_token = ${token}`;
    c.set('authRole', 'scorer');
    c.set('authStageId', '*');
    return next();
  }

  return c.json({ error: 'Invalid or expired session token.' }, 401);
}

/**
 * Middleware to restrict remote users to their authenticated stage only.
 * Admin users bypass this check. Scorer users bypass this check (unrestricted).
 * Must be used after authMiddleware.
 */
export async function stageAccessMiddleware(c: Context, next: Next) {
  const role = c.get('authRole') as string;
  if (role === 'admin' || role === 'scorer') {
    return next();
  }

  return c.json({ error: 'Access denied.' }, 403);
}
