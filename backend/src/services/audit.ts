import { sql } from '../db/client.js';
import type { Context } from 'hono';

/**
 * Write an audit log entry.
 *
 * @param c - Hono context (used to extract IP and auth info)
 * @param action - Action name (e.g. 'login.success', 'score.write', 'match.delete')
 * @param target - Target table and optional ID (e.g. 'matches', 'stages:uuid')
 * @param meta - Optional metadata as JSON object
 */
export async function audit(
  c: Context,
  action: string,
  target?: string | null,
  meta?: Record<string, any> | null
) {
  try {
    const role = (c.get('authRole') as string) || 'anonymous';
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
      || c.req.header('x-real-ip')
      || '';

    let targetTable: string | null = null;
    let targetId: string | null = null;
    if (target) {
      const parts = target.split(':');
      targetTable = parts[0] || null;
      targetId = parts[1] || null;
    }

    await sql`
      INSERT INTO audit_log (actor_role, actor_token_id, action, target_table, target_id, ip, at, meta)
      VALUES (${role}, null, ${action}, ${targetTable}, ${targetId}, ${ip}, now(), ${meta ? JSON.stringify(meta) : null}::jsonb)
    `;
  } catch (err) {
    // Audit logging should never break the request flow
    console.error('[Audit] Failed to write audit log:', err);
  }
}
