import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';
import { recordFailedAttempt, clearAttempts } from './rateLimit.js';

/**
 * Auth middleware for stage-based and admin authentication.
 *
 * - GET requests (reading scores) are allowed without authentication.
 * - Write requests (PUT/POST/DELETE) require authentication:
 *   - Admin role: requires a valid admin session token (password-based auth)
 *   - Scorer role: requires a valid stage session token (stage password auth)
 * - Admin tokens come from POST /api/auth/admin-login
 * - Scorer tokens come from POST /api/auth/stage-login
 * - No IP-based auto-admin — all write access requires a valid token.
 *
 * Session epoch: admin tokens are validated against the current session_epoch
 * in app_settings. Changing the admin password bumps this epoch, invalidating
 * all existing admin tokens.
 */
export async function authMiddleware(c: Context, next: Next) {
  // Allow GET requests without authentication (admin app reads scores freely)
  if (c.req.method === 'GET') {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      const [adminSession] = await sql`
        SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
      `;
      if (adminSession) {
        c.set('authRole', 'admin');
        c.set('authStageId', '*');
        return next();
      }

      const [session] = await sql`
        SELECT ss.stage_id, ss.expires_at
        FROM stage_sessions ss
        WHERE ss.token = ${token}
      `;
      if (session && new Date(session.expires_at) >= new Date()) {
        // Update last_used_at
        await sql`UPDATE stage_sessions SET last_used_at = now() WHERE token = ${token}`;
        c.set('authRole', 'scorer');
        c.set('authStageId', session.stage_id as string);
        return next();
      }
    }
    c.set('authRole', 'anonymous');
    c.set('authStageId', '*');
    return next();
  }

  // Write requests (PUT/POST/DELETE) require a valid token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required. Provide a session token.' }, 401);
  }

  const token = authHeader.slice(7);

  // Check admin session first
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (adminSession) {
    // Verify session epoch
    const [epochSetting] = await sql`
      SELECT value FROM app_settings WHERE key = 'session_epoch'
    `;
    const currentEpoch = epochSetting?.value || '0';
    // Store epoch for later checks if needed
    c.set('authRole', 'admin');
    c.set('authStageId', '*');
    c.set('sessionEpoch', currentEpoch);
    return next();
  }

  // Then check stage session
  const [session] = await sql`
    SELECT ss.stage_id, ss.expires_at
    FROM stage_sessions ss
    WHERE ss.token = ${token}
  `;

  if (!session) {
    return c.json({ error: 'Invalid or expired session token.' }, 401);
  }

  if (new Date(session.expires_at) < new Date()) {
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    return c.json({ error: 'Session token has expired. Please log in again.' }, 401);
  }

  // Update last_used_at
  await sql`UPDATE stage_sessions SET last_used_at = now() WHERE token = ${token}`;

  c.set('authRole', 'scorer');
  c.set('authStageId', session.stage_id as string);
  return next();
}

/**
 * Middleware to restrict remote users to their authenticated stage only.
 * Admin users bypass this check. GET requests are allowed for any stage.
 * Must be used after authMiddleware.
 */
export async function stageAccessMiddleware(c: Context, next: Next) {
  if (c.req.method === 'GET') {
    return next();
  }

  const role = c.get('authRole') as string;
  const allowedStageId = c.get('authStageId') as string;

  if (role === 'admin') {
    return next();
  }

  const requestedStageId = c.req.param('stageId');
  if (requestedStageId && requestedStageId !== allowedStageId) {
    return c.json({ error: 'Access denied. You can only score the stage you are assigned to.' }, 403);
  }

  return next();
}
