import { Hono } from 'hono';
import { sql } from '../db/client.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../env.js';
import { STAGE_PASSWORD_MIN_LENGTH } from '../utils/passwords.js';

export const authRoutes = new Hono<{
  Variables: {
    domainMode: string;
  };
}>();

const DEFAULT_ADMIN_PASSWORD = 'admin';
const BCRYPT_COST = 12;

const WEAK_PASSWORDS = ['admin', 'password', '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'];

function isWeakPassword(pw: string): boolean {
  return WEAK_PASSWORDS.includes(pw.toLowerCase());
}

function isValidPassword(pw: string, minLength: number): { valid: boolean; error?: string } {
  if (pw.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters.` };
  }
  if (isWeakPassword(pw)) {
    return { valid: false, error: 'This password is too common. Please choose a stronger password.' };
  }
  return { valid: true };
}

async function getCurrentSessionEpoch(): Promise<string> {
  const [setting] = await sql`SELECT value FROM app_settings WHERE key = 'session_epoch'`;
  return setting?.value || '0';
}

async function bumpSessionEpoch(): Promise<void> {
  const current = await getCurrentSessionEpoch();
  const next = String(Number(current) + 1);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('session_epoch', ${next}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${next}, updated_at = now()
  `;
}

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

  const storedHashSetting = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const storedHash = storedHashSetting[0]?.value || '';

  let valid: boolean;
  if (!storedHash) {
    valid = password === DEFAULT_ADMIN_PASSWORD;
    if (valid) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_COST);
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

  await sql`DELETE FROM admin_sessions WHERE expires_at < now()`;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
 * POST /api/auth/admin-logout-all
 * Invalidate all admin sessions and bump session epoch (admin only).
 */
authRoutes.post('/admin-logout-all', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const token = authHeader.slice(7);
  const [session] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
  `;
  if (!session) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  await sql`DELETE FROM admin_sessions WHERE 1=1`;
  await bumpSessionEpoch();

  return c.json({ success: true });
});

/**
 * PUT /api/auth/admin-password
 * Change the admin password. Requires current admin token.
 * Body: { currentPassword: string, newPassword: string }
 * Bumps session_epoch to invalidate all existing tokens.
 */
authRoutes.put('/admin-password', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const token = authHeader.slice(7);

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

  // Password must differ from current
  if (currentPassword === newPassword) {
    return c.json({ error: 'New password must be different from the current password.' }, 400);
  }

  // Password policy: minimum 10 chars
  const validation = isValidPassword(newPassword, 10);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Verify current password
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const storedHash = setting?.value || '';

  let valid: boolean;
  if (!storedHash) {
    valid = currentPassword === DEFAULT_ADMIN_PASSWORD;
    if (valid) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_COST);
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

  const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('admin_password_hash', ${newHash}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${newHash}, updated_at = now()
  `;

  // Bump session epoch to invalidate all existing tokens
  await bumpSessionEpoch();

  return c.json({ success: true });
});

/**
 * GET /api/auth/admin-password-status
 * Check if an admin password has been set.
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

  // Stage password minimum 8 chars
  if (password.length < STAGE_PASSWORD_MIN_LENGTH) {
    return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
  }

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

  const valid = await bcrypt.compare(password, stage.password_hash);
  if (!valid) {
    return c.json({ error: 'Incorrect password.' }, 401);
  }

  await sql`
    DELETE FROM stage_sessions
    WHERE stage_id = ${stageId} AND expires_at < now()
  `;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO stage_sessions (stage_id, token, expires_at, last_used_at)
    VALUES (${stageId}, ${token}, ${expiresAt.toISOString()}, now())
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
 */
authRoutes.get('/stages', async (c) => {
  let matchId = c.req.query('matchId');

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
 * POST /api/auth/stage-hash
 * Server-side bcrypt compare for offline mode cache validation.
 * Never returns the hash — only { valid: boolean }.
 * Body: { stageId: string, password: string }
 */
authRoutes.post('/stage-hash', async (c) => {
  const { stageId, password } = await c.req.json();

  if (!stageId || !password) {
    return c.json({ error: 'Stage ID and password are required.' }, 400);
  }

  const [stage] = await sql`
    SELECT id, password_hash FROM stages WHERE id = ${stageId}
  `;

  if (!stage || !stage.password_hash) {
    return c.json({ valid: false });
  }

  const valid = await bcrypt.compare(password, stage.password_hash);
  return c.json({ valid });
});

/**
 * GET /api/auth/me
 * Get current auth info based on token.
 */
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const domainMode = c.get('domainMode') as string || 'admin';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    const [adminSession] = await sql`
      SELECT id FROM admin_sessions WHERE token = ${token} AND expires_at > now()
    `;
    if (adminSession) {
      return c.json({ role: 'admin', stageId: null, isLocalNetwork: true, domainMode });
    }

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

  return c.json({ role: 'anonymous', stageId: null, isLocalNetwork: false, domainMode });
});

/**
 * POST /api/auth/logout
 * Invalidate any session token (admin or scorer).
 */
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});
