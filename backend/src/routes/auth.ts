import { Hono } from 'hono';
import { sql } from '../db/client.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import {
  getTrustToken,
  rotateTrustToken,
  validateAndIssueSession,
  revalidateSession,
  destroySession,
  listActiveSessions,
  approveSession,
  revokeSession,
  getDeviceMode,
  setDeviceMode,
} from '../services/scorerTrust.js';

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

// ─── Admin authentication ─────────────────────────────────────────────────────

/**
 * POST /api/auth/admin-login
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

  if (currentPassword === newPassword) {
    return c.json({ error: 'New password must be different from the current password.' }, 400);
  }

  const validation = isValidPassword(newPassword, 10);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

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

  await bumpSessionEpoch();

  return c.json({ success: true });
});

/**
 * GET /api/auth/admin-password-status
 */
authRoutes.get('/admin-password-status', async (c) => {
  const [setting] = await sql`
    SELECT value FROM app_settings WHERE key = 'admin_password_hash'
  `;
  const hasPassword = !!(setting?.value);
  return c.json({ hasPassword });
});

// ─── Scorer trust ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/scorer-trust
 * Public — validates trust token and issues a scorer session.
 * Body: { trustToken: string, deviceLabel?: string, deviceId?: string }
 */
authRoutes.post('/scorer-trust', async (c) => {
  const { trustToken, deviceLabel, deviceId } = await c.req.json();
  if (!trustToken) {
    return c.json({ error: 'trustToken is required.' }, 400);
  }
  if (!deviceId) {
    return c.json({ error: 'deviceId is required.' }, 400);
  }
  try {
    const result = await validateAndIssueSession(trustToken, deviceLabel || null, deviceId);
    if (result.pending) {
      return c.json({
        pending: true,
        matchId: result.matchId,
      });
    }
    setCookie(c, 'scorer_trust_token', trustToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return c.json({
      sessionToken: result.sessionToken,
      matchId: result.matchId,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, err.status || 500);
  }
});

/**
 * POST /api/auth/scorer-revalidate
 * Authenticated — revalidates an existing scorer session.
 * Requires BOTH sessionToken (header) AND trustToken (body).
 * If trust token has been rotated, session is invalidated.
 */
authRoutes.post('/scorer-revalidate', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Session token required.' }, 401);
  }
  const sessionToken = authHeader.slice(7);

  const body = await c.req.json().catch(() => ({}));
  let trustToken = body.trustToken as string | undefined;
  if (!trustToken) trustToken = getCookie(c, 'scorer_trust_token');
  if (!trustToken) {
    return c.json({ error: 'Trust token required.' }, 401);
  }
  const deviceId = body.deviceId as string | undefined;

  const result = await revalidateSession(trustToken, sessionToken, deviceId || null);
  if (!result) {
    deleteCookie(c, 'scorer_trust_token', { path: '/' });
    return c.json({ error: 'Trust token has been rotated. Please rescan the QR code.' }, 401);
  }

  return c.json({ matchId: result.matchId, sessionToken: result.sessionToken });
});

/**
 * POST /api/auth/scorer-auto-login
 * Public — reads trust token from HttpOnly cookie and issues a session.
 */
authRoutes.post('/scorer-auto-login', async (c) => {
  const trustToken = getCookie(c, 'scorer_trust_token');
  if (!trustToken) {
    return c.json({ error: 'No trust cookie found.' }, 401);
  }
  const { deviceId } = await c.req.json().catch(() => ({}));
  try {
    const result = await validateAndIssueSession(trustToken, null, deviceId || null);
    return c.json({
      sessionToken: result.sessionToken,
      matchId: result.matchId,
    });
  } catch (err: any) {
    deleteCookie(c, 'scorer_trust_token', { path: '/' });
    return c.json({ error: err.message }, err.status || 500);
  }
});

/**
 * POST /api/auth/scorer-logout
 * Authenticated — destroys a scorer session.
 */
authRoutes.post('/scorer-logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sessionToken = authHeader.slice(7);
    await destroySession(sessionToken);
  }
  deleteCookie(c, 'scorer_trust_token', { path: '/' });
  return c.json({ success: true });
});

/**
 * GET /api/auth/scorer-trust
 * Admin only — returns current trust info.
 */
authRoutes.get('/scorer-trust', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  const { token, rotatedAt } = await getTrustToken();
  return c.json({ trustToken: token, rotatedAt });
});

/**
 * POST /api/auth/scorer-trust/rotate
 * Admin only — rotates the trust token.
 */
authRoutes.post('/scorer-trust/rotate', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  const token = await rotateTrustToken();
  return c.json({ trustToken: token, rotatedAt: new Date().toISOString() });
});

/**
 * GET /api/auth/scorer-trust/sessions
 * Admin only — lists active scorer sessions.
 */
authRoutes.get('/scorer-trust/sessions', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  const sessions = await listActiveSessions();
  return c.json(sessions);
});

/**
 * POST /api/auth/scorer-trust/sessions/:id/approve
 * Admin only — approves a pending scorer session.
 */
authRoutes.post('/scorer-trust/sessions/:id/approve', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }
  const sessionId = c.req.param('id');
  try {
    await approveSession(sessionId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, err.status || 500);
  }
});

/**
 * DELETE /api/auth/scorer-trust/sessions/:id
 * Admin only — revokes (deletes) a single scorer session.
 */
authRoutes.delete('/scorer-trust/sessions/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }
  const sessionId = c.req.param('id');
  try {
    await revokeSession(sessionId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, err.status || 500);
  }
});

/**
 * POST /api/auth/scorer-trust/sessions/cleanup-duplicates
 * Admin only — deletes duplicate sessions where the same trust_token + device_label
 * appears more than once within 1 hour (keeps the newer row).
 */
authRoutes.post('/scorer-trust/sessions/cleanup-duplicates', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }

  const result = await sql`
    DELETE FROM scorer_sessions a
    USING scorer_sessions b
    WHERE a.id <> b.id
      AND a.match_id = b.match_id
      AND a.trust_token = b.trust_token
      AND a.device_label = b.device_label
      AND a.device_label IS NOT NULL
      AND a.created_at < b.created_at
      AND b.created_at < a.created_at + interval '1 hour'
  `;
  return c.json({ deleted: result.count || 0 });
});

/**
 * GET /api/auth/scorer-trust/mode
 * Admin only — returns current device approval mode.
 */
authRoutes.get('/scorer-trust/mode', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }
  const mode = await getDeviceMode();
  return c.json({ mode });
});

/**
 * PUT /api/auth/scorer-trust/mode
 * Admin only — sets device approval mode (silent | pending).
 */
authRoutes.put('/scorer-trust/mode', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  const adminToken = authHeader.slice(7);
  const [adminSession] = await sql`
    SELECT id FROM admin_sessions WHERE token = ${adminToken} AND expires_at > now()
  `;
  if (!adminSession) {
    return c.json({ error: 'Invalid or expired admin session.' }, 401);
  }
  const { mode } = await c.req.json();
  if (!['silent', 'pending'].includes(mode)) {
    return c.json({ error: 'mode must be "silent" or "pending".' }, 400);
  }
  await setDeviceMode(mode);
  return c.json({ success: true, mode });
});

// ─── Auth info ────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
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
      SELECT match_id FROM scorer_sessions WHERE session_token = ${token}
    `;
    if (scorerSession) {
      return c.json({ role: 'scorer', stageId: null, matchId: scorerSession.match_id, isLocalNetwork: false, domainMode });
    }

    // Token provided but not valid → 401 so the frontend can detect expired sessions
    return c.json({ error: 'Invalid or expired session token.' }, 401);
  }

  return c.json({ role: 'anonymous', stageId: null, isLocalNetwork: false, domainMode });
});

/**
 * POST /api/auth/logout
 */
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
    await sql`DELETE FROM scorer_sessions WHERE session_token = ${token}`;
  }
  return c.json({ success: true });
});
