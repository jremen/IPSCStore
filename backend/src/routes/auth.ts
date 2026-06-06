import { Hono } from 'hono';
import { sql } from '../db/client.js';
import crypto from 'crypto';

export const authRoutes = new Hono();

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
    SELECT s.id, s.name, s.password, s.match_id
    FROM stages s
    WHERE s.id = ${stageId}
  `;

  if (!stage) {
    return c.json({ error: 'Stage not found.' }, 404);
  }

  if (!stage.password) {
    return c.json({ error: 'This stage does not require authentication.' }, 400);
  }

  // Verify password (plain text comparison for now — bcrypt will be added later)
  if (password !== stage.password) {
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
      WHERE s.match_id = ${matchId} AND s.password IS NOT NULL
      ORDER BY s.stage_number
    `;
  } else {
    stages = await sql`
      SELECT s.id, s.name, s.stage_number, s.match_id, m.name as match_name
      FROM stages s
      JOIN matches m ON m.id = s.match_id
      WHERE s.password IS NOT NULL
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
 * Get current auth info based on token.
 * Returns auth role and stage info.
 */
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')?.trim()
    || '';

  // Check if localhost (admin)
  if (isLocalhost(clientIp)) {
    return c.json({ role: 'admin', stageId: null });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ role: 'anonymous', stageId: null });
  }

  const token = authHeader.slice(7);
  const [session] = await sql`
    SELECT ss.stage_id, ss.expires_at, s.name as stage_name
    FROM stage_sessions ss
    JOIN stages s ON s.id = ss.stage_id
    WHERE ss.token = ${token}
  `;

  if (!session) {
    return c.json({ role: 'anonymous', stageId: null });
  }

  if (new Date(session.expires_at) < new Date()) {
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
    return c.json({ role: 'anonymous', stageId: null });
  }

  return c.json({
    role: 'scorer',
    stageId: session.stage_id,
    stageName: session.stage_name,
  });
});

/**
 * POST /api/auth/logout
 * Invalidate a stage session token.
 */
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await sql`DELETE FROM stage_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});

function isLocalhost(ip: string): boolean {
  if (!ip) return false;
  const trimmed = ip.split(',')[0].trim();
  return trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === '::ffff:127.0.0.1' || trimmed === 'localhost';
}