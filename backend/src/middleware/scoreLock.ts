import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';

/**
 * Score lock middleware — prevents non-admin users from modifying already-saved scores.
 *
 * After authMiddleware (sets authRole) and stageAccessMiddleware (checks stage assignment),
 * this middleware checks if a score already exists for the given stage + registration.
 * If it does and the user is not admin, the request is rejected with 403.
 *
 * Admins (localhost/trusted IP) can always modify saved scores.
 */
export async function scoreLockMiddleware(c: Context, next: Next) {
  // Only applies to PUT requests (score save/update)
  if (c.req.method !== 'PUT') {
    return next();
  }

  const role = c.get('authRole') as string;

  // Admin can always edit
  if (role === 'admin') {
    return next();
  }

  // Scorer: check if score already exists
  const stageId = c.req.param('stageId');
  const registrationId = c.req.param('registrationId');

  if (!stageId || !registrationId) {
    return next();
  }

  const [existing] = await sql`
    SELECT id FROM stage_scores
    WHERE stage_id = ${stageId} AND registration_id = ${registrationId}
  `;

  if (existing) {
    return c.json({ error: 'Score already saved. Only admin can modify saved scores.' }, 403);
  }

  return next();
}