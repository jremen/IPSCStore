import crypto from 'crypto';
import { sql } from '../db/client.js';

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
  return token;
}

export interface IssueSessionResult {
  sessionToken: string;
  matchId: string;
}

export async function validateAndIssueSession(
  trustToken: string,
  deviceLabel: string | null
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

  const sessionToken = crypto.randomUUID();
  await sql`
    INSERT INTO scorer_sessions (match_id, trust_token, session_token, device_label)
    VALUES (${match.id}, ${trustToken}, ${sessionToken}, ${deviceLabel || null})
  `;

  return { sessionToken, matchId: match.id };
}

export async function revalidateSession(
  trustToken: string,
  sessionToken: string
): Promise<IssueSessionResult | null> {
  const [session] = await sql`
    SELECT id, match_id, trust_token
    FROM scorer_sessions
    WHERE session_token = ${sessionToken}
  `;

  if (!session) return null;

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
    SELECT id, device_label, created_at, last_used_at
    FROM scorer_sessions
    ORDER BY last_used_at DESC
  `;
}
