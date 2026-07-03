import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const auditLogRoutes = new Hono();

/**
 * GET /api/audit — paginated audit log (admin only)
 *
 * Query params:
 *   limit       – max entries (default 100, cap 500)
 *   offset      – for pagination
 *   action      – substring match on action
 *   actor_role  – exact match (admin | scorer | anonymous)
 *   from        – ISO timestamp lower bound
 *   to          – ISO timestamp upper bound
 */
auditLogRoutes.get('/audit', async (c) => {
  try {
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10), 1), 500);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);
    const actionFilter = c.req.query('action') || '';
    const roleFilter = c.req.query('actor_role') || '';
    const from = c.req.query('from') || '';
    const to = c.req.query('to') || '';

    // Build WHERE conditions as parameterized sql fragments
    const conds: ReturnType<typeof sql>[] = [];
    if (actionFilter) conds.push(sql`action ILIKE ${'%' + actionFilter + '%'}`);
    if (roleFilter) conds.push(sql`actor_role = ${roleFilter}`);
    if (from) conds.push(sql`at >= ${from}::timestamptz`);
    if (to) conds.push(sql`at <= ${to}::timestamptz`);

    const whereSql = conds.length > 0
      ? sql`WHERE ${conds.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`)}`
      : sql``;

    const [entries, countResult] = await Promise.all([
      sql`SELECT id, actor_role, actor_token_id, action, target_table, target_id, ip, at, meta
          FROM audit_log ${whereSql}
          ORDER BY at DESC
          LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*) as total FROM audit_log ${whereSql}`,
    ]);

    return c.json({
      entries,
      total: Number(countResult[0]?.total ?? 0),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[Audit] Failed to read audit log:', err);
    return c.json({ error: err.message }, 500);
  }
});
