import crypto from 'crypto';
import { sql } from '../db/client.js';

const DEFAULT_TTL_SECONDS = 5 * 60 * 60; // 5 hours
const MAX_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const CLEANUP_AGE_DAYS = 7;

export class TokenError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface StageLinkTokenResult {
  token: string;
  stageId: string;
  stageName: string;
  matchId: string;
  expiresAt: Date;
}

export interface RedeemResult {
  stageId: string;
  stageName: string;
  matchId: string;
  expiresAt: Date;
}

/**
 * Mint a single-use, short-lived token for a stage.
 * The admin creates this; the URL is then shared via QR code.
 */
export async function createStageLinkToken(
  stageId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  createdBy?: string
): Promise<StageLinkTokenResult> {
  const clampedTtl = Math.min(Math.max(ttlSeconds, 60), MAX_TTL_SECONDS);

  const [stage] = await sql`
    SELECT s.id, s.name, s.match_id
    FROM stages s
    WHERE s.id = ${stageId}
  `;
  if (!stage) {
    throw new Error('Stage not found');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + clampedTtl * 1000);

  await sql`
    INSERT INTO stage_link_tokens (id, match_id, stage_id, created_by, expires_at)
    VALUES (${token}, ${stage.match_id}, ${stageId}, ${createdBy || null}, ${expiresAt.toISOString()})
  `;

  return {
    token,
    stageId: stage.id,
    stageName: stage.name,
    matchId: stage.match_id,
    expiresAt,
  };
}

/**
 * Redeem a single-use token. Validates expiry, revocation, and prior redemption.
 * Returns stage info needed to create a session.
 */
export async function redeemStageLinkToken(
  token: string,
  clientIp?: string
): Promise<RedeemResult> {
  const [row] = await sql`
    SELECT t.id, t.stage_id, t.match_id, t.expires_at, t.redeemed_at, t.revoked_at,
           s.name as stage_name
    FROM stage_link_tokens t
    JOIN stages s ON s.id = t.stage_id
    WHERE t.id = ${token}
  `;

  if (!row) {
    throw new TokenError('Token not found', 404);
  }

  if (row.revoked_at) {
    throw new TokenError('Token has been revoked', 410);
  }

  if (row.redeemed_at) {
    throw new TokenError('Token already used', 410);
  }

  if (new Date(row.expires_at) < new Date()) {
    throw new TokenError('Token has expired', 410);
  }

  await sql`
    UPDATE stage_link_tokens
    SET redeemed_at = now(), redeemed_ip = ${clientIp || null}
    WHERE id = ${token}
  `;

  return {
    stageId: row.stage_id,
    stageName: row.stage_name,
    matchId: row.match_id,
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Revoke all unredeemed tokens for a match (admin "revoke all" button).
 */
export async function revokeStageLinkTokens(matchId: string): Promise<number> {
  const result = await sql`
    UPDATE stage_link_tokens
    SET revoked_at = now()
    WHERE match_id = ${matchId}
      AND revoked_at IS NULL
      AND redeemed_at IS NULL
  `;
  return result.count;
}

/**
 * Get all unredeemed, non-expired, non-revoked tokens for a match.
 * Used by the admin UI to show active tokens.
 */
export async function getActiveStageLinkTokens(matchId: string) {
  return sql`
    SELECT t.id, t.stage_id, t.match_id, t.created_at, t.expires_at,
           s.name as stage_name, s.stage_number
    FROM stage_link_tokens t
    JOIN stages s ON s.id = t.stage_id
    WHERE t.match_id = ${matchId}
      AND t.redeemed_at IS NULL
      AND t.revoked_at IS NULL
      AND t.expires_at > now()
    ORDER BY t.created_at DESC
  `;
}

/**
 * Cleanup expired tokens older than CLEANUP_AGE_DAYS.
 * Called on backend startup.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await sql`
    DELETE FROM stage_link_tokens
    WHERE expires_at < now() - interval '${sql.unsafe(String(CLEANUP_AGE_DAYS))} days'
  `;
  return result.count;
}
