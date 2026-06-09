import { Hono } from 'hono';
import { sql } from '../db/client.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const authRoutes = new Hono<{
  Variables: {
    domainMode: string;
  };
}>();

const DEFAULT_ADMIN_PASSWORD = 'admin';

/**
 * POST /api/auth/admin-login
 * Authenticate as admin with a password.
 * Body: { password: string }
 * Response: { token: string, role: 'admin' }
 */
authRoutes.post('/admin-login', async (c) => {
  const { password } = await c.req.json();

  if (!password) {
    return c.json({ error: 'Password is required.' }, 400);
  }

  // Get the stored password hash
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;

  const storedHash = setting?.value || '';

  // If no hash is stored, use the default password
  let valid: boolean;
  if (!storedHash) {
    valid = password === DEFAULT_ADMIN_PASSWORD;
    // Hash the default password on first use so the fallback is eliminated
    if (valid) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('admin_password_hash', ${hash}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = now()
      `;
    }
  } else {
    valid = await bcrypt.compare(password, storedHash);
  }

  if (!valid) {
    return c.json({ error: 'Incorrect password.' }, 401);
  }

  // Delete expired admin sessions
  await sql`DELETE FROM admin_sessions WHERE expires_at < now()`;

  // Create a new admin session token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await sql`
    INSERT INTO admin_sessions (token, expires_at)
    VALUES (${token}, ${expiresAt.toISOString()})
  `;

  return c.json({ token, role: 'admin' });
});

/**
 * POST /api/auth/admin-logout
 * Invalidate an admin session token.
 */
authRoutes.post('/admin-logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});

/**
 * PUT /api/auth/admin-password
 * Change the admin password. Requires current admin token.
 * Body: { currentPassword: string, newPassword: string }
 */
authRoutes.put('/admin-password', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const token = authHeader.slice(7);

  // Verify admin token
  const [session] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;

  if (!session) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current password and new password are required.' }, 400);
  }

  if (newPassword.length < 4) {
    return c.json({ error: 'New password must be at least 4 characters.' }, 400);
  }

  // Verify current password
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;

  const storedHash = setting?.value || '';

  let valid: boolean;
  if (!storedHash) {
    valid = currentPassword === DEFAULT_ADMIN_PASSWORD;
    // Hash the default password on first use so the fallback is eliminated
    if (valid) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('admin_password_hash', ${hash}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = now()
      `;
    }
  } else {
    valid = await bcrypt.compare(currentPassword, storedHash);
  }

  if (!valid) {
    return c.json({ error: 'Incorrect current password.' }, 401);
  }

  // Hash and store new password
  const newHash = await bcrypt.hash(newPassword, 10);

  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('admin_password_hash', ${newHash}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${newHash}, updated_at = now()
  `;

  return c.json({ success: true });
});

/**
 * GET /api/auth/admin-password-status
 * Check if an admin password has been set (for frontend to prompt initial setup).
 * Returns: { hasPassword: boolean }
 */
authRoutes.get('/admin-password-status', async (c) => {
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;

  const hasPassword = !!(setting?.value);
  return c.json({ hasPassword });
});

/**
 * POST /api/auth/stage-login
 * Authenticate a remote scorer for a specific stage.
 * Body: { stageId: string, password: string }
 * Response: { token: string, stageId: string, stageName: string }
 */
authRoutes.post('/stage-login', async (c) => {
  const { stageId, password } = await c.req.json();

  if (!stageId || !password) {
    return c.json({ error: 'Stage ID and password are required.' }, 400);
  }

  // Find the stage and verify password
  const [stage] = await sql`
    SELECT s.id, s.name, s.password_hash, s.match_id
    FROM stages s
    WHERE s.id = ${stageId}
  `;

  if (!stage) {
    return c.json({ error: 'Stage not found.' }, 404);
  }

  if (!stage.password_hash) {
    return c.json({ error: 'This stage does not require authentication.' }, 400);
  }

  // Verify password with bcrypt (includes salt)
  const valid = await bcrypt.compare(password, stage.password_hash);
  if (!valid) {
    return c.json({ error: 'Incorrect password.' }, 401);
  }

  // Delete any existing sessions for this stage that have expired
  await sql`
    DELETE FROM stage_sessions
    WHERE stage_id = ${stageId} AND expires_at < now()
  `;

  // Create a new session token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await sql`
    INSERT INTO stage_sessions (stage_id, token, expires_at)
    VALUES (${stageId}, ${token}, ${expiresAt.toISOString()})
  `;

  return c.json({
    token,
    stageId: stage.id,
    stageName: stage.name,
    matchId: stage.match_id,
  });
});

/**
 * GET /api/auth/stages
 * Get list of stages that have passwords set (for the login dropdown).
 * If matchId query param is provided, filter to that match.
 * If no matchId, auto-filter to the current match.
 * If no current match, return all stages.
 */
authRoutes.get('/stages', async (c) => {
  let matchId = c.req.query('matchId');

  // If no matchId specified, try to use the current match
  if (!matchId) {
    const [currentMatch] = await sql`
      SELECT id FROM matches WHERE is_current = true LIMIT 1
    `;
    if (currentMatch) {
      matchId = currentMatch.id;
    }
  }

  let stages;
  if (matchId) {
    stages = await sql`
      SELECT s.id, s.name, s.stage_number, s.match_id, m.name as match_name
      FROM stages s
      JOIN matches m ON m.id = s.match_id
      WHERE s.match_id = ${matchId} AND s.password_hash IS NOT NULL
      ORDER BY s.stage_number
    `;
  } else {
    stages = await sql`
      SELECT s.id, s.name, s.stage_number, s.match_id, m.name as match_name
      FROM stages s
      JOIN matches m ON m.id = s.match_id
      WHERE s.password_hash IS NOT NULL
      ORDER BY s.match_id, s.stage_number
    `;
  }

  return c.json(stages.map(s => ({
    id: s.id,
    name: s.name,
    stageNumber: s.stage_number,
    matchId: s.match_id,
    matchName: s.match_name,
  })));
});

/**
 * GET /api/auth/me
 * Get current auth info based on token or client IP.
 * Returns auth role, stage info (for scorers), and whether on local network.
 */
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const domainMode = c.get('domainMode') as string || 'admin';

  // Check for admin token first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Check admin session
    const [adminSession] = await sql`
      SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
    `;
    if (adminSession) {
      return c.json({ role: 'admin', stageId: null, isLocalNetwork: true, domainMode });
    }

    // Check scorer session
    const [scorerSession] = await sql`
      SELECT ss.stage_id, ss.expires_at, s.name as stage_name, s.match_id
      FROM stage_sessions ss
      JOIN stages s ON s.id = ss.stage_id
      WHERE ss.token = ${token}
    `;
    if (scorerSession) {
      if (new Date(scorerSession.expires_at) < new Date()) {
        await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
        return c.json({ role: 'anonymous', stageId: null, isLocalNetwork: false, domainMode });
      }
      return c.json({ role: 'scorer', stageId: scorerSession.stage_id, stageName: scorerSession.stage_name, matchId: scorerSession.match_id, isLocalNetwork: false, domainMode });
    }
  }

  // No valid token — check if on local network for UI routing
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')?.trim()
    || '';
  const isLocal = isTrustedIp(clientIp);

  return c.json({ role: 'anonymous', stageId: null, isLocalNetwork: isLocal, domainMode });
});

/**
 * POST /api/auth/logout
 * Invalidate any session token (admin or scorer).
 */
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Try deleting from both session tables
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});

function isTrustedIp(ip: string): boolean {
  if (!ip) return false;
  let trimmed = ip.split(',')[0].trim();
  const v4Mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) trimmed = v4Mapped[1];
  if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(trimmed)) return true;
  if (/^172\.\d+\.\d+\.\d+$/.test(trimmed)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(trimmed)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(trimmed)) return true;
  if (/^f[cd]/i.test(trimmed) || /^fe[89ab]/i.test(trimmed)) return true;
  if (trimmed === 'host.docker.internal') return true;
  return false;
}