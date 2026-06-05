import type { Context, Next } from 'hono';
import { sql } from '../db/client.js';

/**
 * Auth middleware for stage-based authentication.
 *
 * - GET requests (reading scores) are allowed without authentication.
 * - Write requests (PUT/POST/DELETE) require authentication:
 *   - Requests from localhost (admin) are allowed unrestricted access.
 *   - Remote requests require a valid stage session token in Authorization header.
 * - Admin requests set X-Auth-Role=admin, scorer requests set X-Auth-Role=scorer
 */
export async function authMiddleware(c: Context, next: Next) {
  // Allow GET requests without authentication (admin app reads scores freely)
  if (c.req.method === 'GET') {
    // Still set role if token provided, but don't block
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const [session] = await sql`
        SELECT ss.stage_id, ss.expires_at
        FROM stage_sessions ss
        WHERE ss.token = ${token}
      `;
      if (session && new Date(session.expires_at) >= new Date()) {
        c.set('authRole', 'scorer');
        c.set('authStageId', session.stage_id as string);
        return next();
      }
    }
    // No valid token, but it's a GET — treat as admin
    const clientIp = getClientIp(c);
    c.set('authRole', 'admin');
    c.set('authStageId', '*');
    return next();
  }

  // Write requests (PUT/POST/DELETE) require authentication
  // Check if request is from localhost or trusted network (admin access)
  const clientIp = getClientIp(c);
  // If we can't determine the IP, trust the request (local proxy without forwarding headers)
  if (!clientIp || isTrustedIp(clientIp)) {
    c.set('authRole', 'admin');
    c.set('authStageId', '*');
    return next();
  }

  // Remote request: check for stage session token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required. Provide a stage session token.' }, 401);
  }

  const token = authHeader.slice(7);

  // Validate token against stage_sessions
  const [session] = await sql`
    SELECT ss.stage_id, ss.expires_at
    FROM stage_sessions ss
    WHERE ss.token = ${token}
  `;

  if (!session) {
    return c.json({ error: 'Invalid or expired session token.' }, 401);
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    return c.json({ error: 'Session token has expired. Please log in again.' }, 401);
  }

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
  // GET requests are allowed for any authenticated user (read-only)
  if (c.req.method === 'GET') {
    return next();
  }

  const role = c.get('authRole') as string;
  const allowedStageId = c.get('authStageId') as string;

  // Admin has unrestricted access
  if (role === 'admin') {
    return next();
  }

  // Scorer: check if they're accessing their assigned stage
  const requestedStageId = c.req.param('stageId');
  if (requestedStageId && requestedStageId !== allowedStageId) {
    return c.json({ error: 'Access denied. You can only score the stage you are assigned to.' }, 403);
  }

  return next();
}

/**
 * Get client IP from request headers.
 * Checks X-Real-IP and X-Forwarded-For first, then falls back to Hono connection info.
 */
function getClientIp(c: Context): string {
  const xForwardedFor = c.req.header('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = c.req.header('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  // Try Hono's connection info (available in Node.js adapter)
  const connInfo = c.env?.incoming?.socket?.remoteAddress;
  if (connInfo) {
    return connInfo;
  }

  return '';
}

/**
 * Check if an IP address is localhost or a private/Docker network address.
 * This app runs on a trusted local network at shooting ranges — private IPs are trusted.
 */
function isTrustedIp(ip: string): boolean {
  if (!ip) return false;
  let trimmed = ip.split(',')[0].trim();
  // Unwrap IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.1.1 → 192.168.1.1)
  const v4Mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) trimmed = v4Mapped[1];
  // Localhost variants
  if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') return true;
  // Docker default bridge network (172.17.x.x) and custom Docker networks (172.x.x.x)
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(trimmed)) return true;
  // Common Docker compose networks (172.16-31.x.x)
  if (/^172\.\d+\.\d+\.\d+$/.test(trimmed)) return true;
  // Private networks: 10.x.x.x, 192.168.x.x
  if (/^10\.\d+\.\d+\.\d+$/.test(trimmed)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(trimmed)) return true;
  // IPv6 private (fc00::/7, fe80::/10 link-local)
  if (/^f[cd]/i.test(trimmed) || /^fe[89ab]/i.test(trimmed)) return true;
  // Docker internal host.docker.internal often resolves to these
  if (trimmed === 'host.docker.internal') return true;
  return false;
}

/**
 * @deprecated Use isTrustedIp instead — includes private/Docker networks
 */
function isLocalhost(ip: string): boolean {
  return isTrustedIp(ip);
}