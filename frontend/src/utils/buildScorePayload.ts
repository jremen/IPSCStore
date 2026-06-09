import type { ScoreInput } from '../types/scoring';

/**
 * Build a clean payload for the score save API request.
 *
 * Strips out any extra fields (database IDs, computed values, etc.) that may
 * have leaked into the score object from the GET response, ensuring only the
 * fields the backend needs are sent. This prevents concurrent write conflicts
 * and keeps the API contract clear.
 */
export function buildScorePayload(score: ScoreInput): object {
  return {
    time: score.time,
    targets: score.targets.map(t => ({
      target_index: t.target_index,
      target_type: t.target_type,
      alpha: t.alpha,
      charlie: t.charlie,
      delta: t.delta,
      miss: t.miss,
      no_shoot_hits: t.no_shoot_hits,
      steel_hit: t.steel_hit,
      target_data: t.target_data || {},
    })),
    procedural_count: score.procedural_count,
    ftsa_count: score.ftsa_count,
    extra_shot_count: score.extra_shot_count,
    extra_hit_count: score.extra_hit_count,
    stacking_count: score.stacking_count,
    overtime_shot_count: score.overtime_shot_count,
    is_dnf: score.is_dnf,
    ...(score.score_data ? { score_data: score.score_data } : {}),
    ...(score.chrono ? { chrono: score.chrono } : {}),
  };
}