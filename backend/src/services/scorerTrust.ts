import crypto from 'crypto';
import { sql } from '../db/client.js';
import { eventBroadcaster } from './events.js';

const TOKEN_BYTES = 32;

export async function getTrustToken(): Promise<{ token: string; rotatedAt: string | null }> {
  const rows = await sql`
    SELECT key, value FROM app_settings
    WHERE key IN ('scorer_trust_token', 'scorer_trust_token_rotated_at')
  `;
  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  return {
    token: map.scorer_trust_token || '',
    rotatedAt: map.scorer_trust_token_rotated_at || null,
  };
}

export async function rotateTrustToken(): Promise<string> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const rotatedAt = new Date().toISOString();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('scorer_trust_token', ${token}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('scorer_trust_token_rotated_at', ${rotatedAt}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
  // Auto-kick: invalidate all existing scorer sessions so devices must rescan QR
  await sql`DELETE FROM scorer_sessions WHERE 1=1`;
  eventBroadcaster.broadcast({
    type: 'scorer:session:rotated',
    payload: {},
  });
  return token;
}

export interface IssueSessionResult {
  sessionToken: string;
  matchId: string;
  pending?: boolean;
}

/** Read the current device approval mode (silent | pending) */
export async function getDeviceMode(): Promise<'silent' | 'pending'> {
  const [row] = await sql`
    SELECT value FROM app_settings WHERE key = 'scorer_device_mode'
  `;
  return (row?.value as 'silent' | 'pending') || 'silent';
}

/** Set the device approval mode */
export async function setDeviceMode(mode: 'silent' | 'pending'): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('scorer_device_mode', ${mode}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `;
  await eventBroadcaster.broadcast({
    type: 'scorer:device:mode-changed',
    payload: { mode },
  });
}

export async function validateAndIssueSession(
  trustToken: string,
  deviceLabel: string | null,
  deviceId?: string | null
): Promise<IssueSessionResult> {
  if (!trustToken) {
    throw Object.assign(new Error('Trust token is required.'), { status: 400 });
  }

  const [row] = await sql`
    SELECT value FROM app_settings WHERE key = 'scorer_trust_token'
  `;

  if (!row || row.value !== trustToken) {
    throw Object.assign(
      new Error('Trust token is invalid or has been rotated. Please rescan the QR code.'),
      { status: 401 }
    );
  }

  const [match] = await sql`SELECT id FROM matches WHERE is_current = true LIMIT 1`;
  if (!match) {
    throw Object.assign(
      new Error('No current match set. Ask the range master to set a current match.'),
      { status: 409 }
    );
  }

  const mode = await getDeviceMode();

  // If this device already has a session, re-use it (upsert by match_id + device_id)
  if (deviceId) {
    const [existing] = await sql`
      SELECT id, session_token, approved_at
      FROM scorer_sessions
      WHERE match_id = ${match.id} AND device_id = ${deviceId}
    `;
    if (existing) {
      const isPending = !existing.approved_at;
      await sql`
        UPDATE scorer_sessions
        SET trust_token = ${trustToken},
            device_label = ${deviceLabel || null},
            last_used_at = now()
        WHERE id = ${existing.id}
      `;
      await eventBroadcaster.broadcast({
        type: 'scorer:session:created',
        payload: { sessionId: existing.id, matchId: match.id, deviceId, pending: isPending },
      });
      return { sessionToken: existing.session_token, matchId: match.id, pending: isPending };
    }
  }

  // Heuristic: same device_label + trust_token within 5 min → likely same physical device in a different browser context (e.g. iOS Safari + PWA)
  if (deviceId && deviceLabel) {
    const [heuristic] = await sql`
      SELECT id, session_token, approved_at
      FROM scorer_sessions
      WHERE match_id = ${match.id}
        AND trust_token = ${trustToken}
        AND device_label = ${deviceLabel}
        AND device_id IS DISTINCT FROM ${deviceId}
        AND last_used_at > now() - interval '5 minutes'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (heuristic) {
      await sql`
        UPDATE scorer_sessions
        SET device_id = ${deviceId},
            device_label = ${deviceLabel || null},
            trust_token = ${trustToken},
            last_used_at = now()
        WHERE id = ${heuristic.id}
      `;
      const isPending = !heuristic.approved_at;
      await eventBroadcaster.broadcast({
        type: 'scorer:session:created',
        payload: { sessionId: heuristic.id, matchId: match.id, deviceId, pending: isPending, heuristic: true },
      });
      return { sessionToken: heuristic.session_token, matchId: match.id, pending: isPending };
    }
  }

  const sessionToken = crypto.randomUUID();
  const approvedAt = mode === 'silent' ? new Date().toISOString() : null;

  await sql`
    INSERT INTO scorer_sessions (match_id, trust_token, session_token, device_label, device_id, approved_at)
    VALUES (${match.id}, ${trustToken}, ${sessionToken}, ${deviceLabel || null}, ${deviceId || null}, ${approvedAt})
  `;

  const isPending = mode === 'pending';
  await eventBroadcaster.broadcast({
    type: 'scorer:session:created',
    payload: { matchId: match.id, deviceId, pending: isPending },
  });
  return { sessionToken, matchId: match.id, pending: isPending };
}

/** Admin approves a pending scorer session */
export async function approveSession(sessionId: string): Promise<void> {
  const result = await sql`
    UPDATE scorer_sessions SET approved_at = now()
    WHERE id = ${sessionId}::uuid AND approved_at IS NULL
  `;
  if (result.count === 0) {
    throw Object.assign(new Error('Session not found or already approved.'), { status: 404 });
  }
  await eventBroadcaster.broadcast({
    type: 'scorer:session:approved',
    payload: { sessionId },
  });
}

/** Admin revokes a single scorer session (deletes it) */
export async function revokeSession(sessionId: string): Promise<void> {
  const result = await sql`DELETE FROM scorer_sessions WHERE id = ${sessionId}::uuid`;
  if (result.count === 0) {
    throw Object.assign(new Error('Session not found.'), { status: 404 });
  }
  await eventBroadcaster.broadcast({
    type: 'scorer:session:revoked',
    payload: { sessionId },
  });
}

export async function revalidateSession(
  trustToken: string,
  sessionToken: string,
  deviceId?: string | null
): Promise<IssueSessionResult | null> {
  const [session] = await sql`
    SELECT id, match_id, trust_token, approved_at, device_id
    FROM scorer_sessions
    WHERE session_token = ${sessionToken}
  `;

  if (!session) return null;

  // If device is pinning, reject if deviceId doesn't match
  if (session.device_id && deviceId && session.device_id !== deviceId) {
    return null;
  }

  // Reject pending (unapproved) sessions
  if (!session.approved_at) return null;

  const [row] = await sql`
    SELECT value FROM app_settings WHERE key = 'scorer_trust_token'
  `;

  if (!row || row.value !== trustToken) {
    await sql`DELETE FROM scorer_sessions WHERE id = ${session.id}`;
    return null;
  }

  await sql`
    UPDATE scorer_sessions SET last_used_at = now(), trust_token = ${trustToken}
    WHERE id = ${session.id}
  `;

  return { sessionToken, matchId: session.match_id };
}

export async function destroySession(sessionToken: string): Promise<void> {
  await sql`DELETE FROM scorer_sessions WHERE session_token = ${sessionToken}`;
}

export async function listActiveSessions() {
  return sql`
    SELECT id, device_label, device_id, approved_at, created_at, last_used_at
    FROM scorer_sessions
    ORDER BY approved_at NULLS FIRST, last_used_at DESC
  `;
}
