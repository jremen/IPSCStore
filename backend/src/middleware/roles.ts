import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';

/**
 * Require admin role. Must be used after authMiddleware.
 */
export async function requireAdmin(c: Context, next: Next) {
  const role = c.get('authRole') as string;
  if (role !== 'admin') {
    return c.json({ error: 'Admin access required.' }, 401);
  }
  return next();
}

/**
 * Require admin or scorer role. Must be used after authMiddleware.
 */
export async function requireAuth(c: Context, next: Next) {
  const role = c.get('authRole') as string;
  if (role === 'anonymous') {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  return next();
}

/**
 * Method-based guard: allow GET for all, require admin for mutating methods.
 */
export function methodGuard(allowedWriteRoles: string[] = ['admin']) {
  return async (c: Context, next: Next) => {
    if (c.req.method === 'GET') {
      return next();
    }
    const role = c.get('authRole') as string;
    if (!allowedWriteRoles.includes(role)) {
      return c.json({ error: 'Insufficient permissions.' }, 401);
    }
    return next();
  };
}
