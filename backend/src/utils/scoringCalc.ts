// Pure scoring calculation functions for IPSC/USPSA and extended match types

export type PowerFactor = 'minor' | 'major';
export type ScoringType = 'comstock' | 'virginia' | 'fixed_time' | 'chrono'
  | 'hit_factor' | 'idpa' | 'action_steel' | 'multi_gun'
  | 'long_range' | 'bullseye' | 'archery' | 'nrl22';
export type Organization = 'IPSC' | 'USPSA' | 'IDPA' | '3GUN' | 'NRL22' | 'PRS' | 'NRA' | 'USA_ARCHERY';

interface PointValues {
  alpha: number;
  charlie: number;
  delta: number;
  steel: number;
}

export function getPointValues(pf: PowerFactor): PointValues {
  if (pf === 'major') {
    return { alpha: 5, charlie: 4, delta: 2, steel: 5 };
  }
  return { alpha: 5, charlie: 3, delta: 1, steel: 5 };
}

interface TargetHitInput {
  target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
  hits_per_paper: number;
}

interface ScoreInput {
  targets: TargetHitInput[];
  time: number | null;
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  scoring_type: ScoringType;
  power_factor: PowerFactor;
  par_time?: number | null;
}

export interface CalculatedScore {
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  total_time?: number;
  x_count?: number;
}

export function calculateScore(input: ScoreInput): CalculatedScore {
  const pv = getPointValues(input.power_factor);
  let raw_points = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  // Global check: if ANY target has explicit miss data, use per-target miss values for ALL.
  // Only fall back to auto-calculation (hits_per_paper - actual hits) for legacy scores
  // (e.g. WinMSS imports) where misses were never set per-target.
  const hasExplicitMissData = input.targets.some(t => t.miss > 0);

  for (const target of input.targets) {
    if (target.target_type === 'paper') {
      // Best N hits per target
      const hits: Array<{ zone: string; value: number }> = [];
      for (let i = 0; i < target.alpha; i++) hits.push({ zone: 'A', value: pv.alpha });
      for (let i = 0; i < target.charlie; i++) hits.push({ zone: 'C', value: pv.charlie });
      for (let i = 0; i < target.delta; i++) hits.push({ zone: 'D', value: pv.delta });

      // Sort descending by value
      hits.sort((a, b) => b.value - a.value);

      // Take best N
      const best = hits.slice(0, target.hits_per_paper);
      raw_points += best.reduce((sum, h) => sum + h.value, 0);

      // Misses: use explicit miss count when available; auto-calc only for legacy scores.
      const totalScoringHits = target.alpha + target.charlie + target.delta;
      const targetMisses = hasExplicitMissData
        ? target.miss
        : Math.max(0, target.hits_per_paper - totalScoringHits);
      miss_count += targetMisses;

      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (target.steel_hit) {
        raw_points += pv.steel;
      } else {
        miss_count += 1;
      }
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'npm') {
      if (target.steel_hit) {
        raw_points += pv.steel; // +5 bonus
      }
      // miss = no penalty (don't increment miss_count)
      no_shoot_hit_count += target.no_shoot_hits;
    }
  }

  // Calculate penalties based on scoring type
  let penalty_points = 0;

  // Comstock: miss, no-shoot, FTSA, procedural
  if (input.scoring_type === 'comstock') {
    penalty_points = miss_count * 10
      + no_shoot_hit_count * 10
      + input.ftsa_count * 10
      + input.procedural_count * 10;
  }

  // Virginia Count: same + extra shot/hit, stacking
  if (input.scoring_type === 'virginia') {
    penalty_points = miss_count * 10
      + no_shoot_hit_count * 10
      + input.ftsa_count * 10
      + input.procedural_count * 10
      + input.extra_shot_count * 10
      + input.extra_hit_count * 10
      + input.stacking_count * 10;
  }

  // Fixed Time: misses are NO penalty, overtime is -5
  if (input.scoring_type === 'fixed_time') {
    penalty_points = no_shoot_hit_count * 10
      + input.procedural_count * 10
      + input.extra_shot_count * 10
      + input.extra_hit_count * 10
      + input.stacking_count * 10
      + input.overtime_shot_count * 5;
  }

  const net_points = raw_points - penalty_points;

  // Hit factor for Comstock/Virginia; no hit factor for Fixed Time
  let hit_factor = 0;
  if ((input.scoring_type === 'comstock' || input.scoring_type === 'virginia') && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 10000) / 10000,
  };
}

// ─── Aggregated Score Calculation (for WinMSS imports) ──────────────────────────
// WinMSS stores total hit counts per zone (e.g., ScoreA=22, ScoreC=8) across ALL
// targets. It does NOT track per-target breakdowns.
//
// CRITICAL: In WinMSS, ScoreA INCLUDES steel target hits (since steel scores 5 = A).
// So ScoreA = paper_A_hits + steel_hits. We must NOT add steel×5 separately.
// Raw points = A×alpha + C×charlie + D×delta  (steel is already in A).
//
// Misses in WinMSS include both missed paper targets and missed steel targets.
// Each miss = -10 points, regardless of paper or steel.
//
// This function bypasses IPSCScore's per-target "best N" capping, which would
// lose data when distributing totals across targets.

export interface AggregatedScoreInput {
  total_alpha: number;       // includes steel hits (steel = A = 5pts)
  total_charlie: number;
  total_delta: number;
  total_miss: number;        // includes missed steel targets
  total_no_shoot: number;
  total_steel: number;       // number of steel targets (for target_scores display)
  steel_hit_count: number;   // number of steel targets HIT (for display only)
  procedural_count: number;
  ftsa_count: number;
  extra_shot_count: number;
  extra_hit_count: number;
  stacking_count: number;
  overtime_shot_count: number;
  time: number;
  scoring_type: ScoringType;
  power_factor: PowerFactor;
}

export function calculateAggregatedScore(input: AggregatedScoreInput): CalculatedScore {
  const pv = getPointValues(input.power_factor);

  // Raw points: ScoreA includes steel hits (steel = 5 = alpha value).
  // Do NOT add steel separately — it's already counted in total_alpha.
  // A hit on steel = 5 points = same as an A hit on paper.
  const raw_points = input.total_alpha * pv.alpha
    + input.total_charlie * pv.charlie
    + input.total_delta * pv.delta;

  // Misses include both paper and steel misses, all at -10 each
  let penalty_points = 0;

  if (input.scoring_type === 'comstock' || input.scoring_type === 'hit_factor') {
    penalty_points = (input.total_miss + input.total_no_shoot
      + input.ftsa_count + input.procedural_count) * 10;
  } else if (input.scoring_type === 'virginia') {
    penalty_points = (input.total_miss + input.total_no_shoot
      + input.ftsa_count + input.procedural_count) * 10
      + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10;
  } else if (input.scoring_type === 'fixed_time') {
    // Fixed Time: misses are NO penalty
    penalty_points = input.total_no_shoot * 10
      + input.procedural_count * 10
      + (input.extra_shot_count + input.extra_hit_count + input.stacking_count) * 10
      + input.overtime_shot_count * 5;
  }

  const net_points = raw_points - penalty_points;

  // Hit factor for Comstock/Virginia; not used for Fixed Time
  let hit_factor = 0;
  if ((input.scoring_type === 'comstock' || input.scoring_type === 'virginia' || input.scoring_type === 'hit_factor')
    && input.time && input.time > 0) {
    hit_factor = Math.max(0, net_points / input.time);
  }

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 10000) / 10000,
  };
}

// ─── Hit Factor (identical to Comstock) ───────────────────────────────────────

export function calculateHitFactorScore(input: ScoreInput): CalculatedScore {
  return calculateScore({ ...input, scoring_type: 'comstock' });
}

// ─── IDPA (Vickers Count) ─────────────────────────────────────────────────────

export interface IDPAInput {
  targets: Array<{
    target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
    alpha: number;       // -0 points down
    charlie: number;     // -1 point down
    delta: number;       // -3 points down
    miss: number;
    no_shoot_hits: number;
    steel_hit: boolean | null;
    hits_per_paper: number;
  }>;
  time: number;
  penalty_pe: number;     // Procedural Error: +3sec each
  penalty_hnt: number;    // Hit on No-Shoot Target: +5sec each (separate from no_shoot_hits on paper)
  penalty_ftn: number;   // Failure to Neutralize: +5sec each
  penalty_fp: number;     // Flagrant Penalty: +10sec each
  penalty_ftdr: number;  // Failure to Do Right: +20sec each
}

export function calculateIDPAScore(input: IDPAInput): CalculatedScore {
  let points_down = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  // Global check: if ANY target has explicit miss data, use per-target miss values for ALL.
  const hasExplicitMissData = input.targets.some(t => t.miss > 0);

  for (const target of input.targets) {
    if (target.target_type === 'paper') {
      // IDPA zones: alpha=-0, charlie=-1, delta=-3
      points_down += target.alpha * 0 + target.charlie * 1 + target.delta * 3;

      // Count misses: use explicit miss count when available; auto-calc only for legacy scores.
      const totalHits = target.alpha + target.charlie + target.delta;
      const targetMisses = hasExplicitMissData ? target.miss : Math.max(0, target.hits_per_paper - totalHits);
      miss_count += targetMisses;

      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (!target.steel_hit) {
        // Missed steel in IDPA: +5sec (FTN) — we count it as a miss
        miss_count += 1;
      }
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'npm') {
      // NPM: hit = no time bonus in IDPA, miss = no penalty
      // Effectively a no-op in time-based scoring
    }
  }

  const penalty_seconds = miss_count * 5       // Miss: +5sec each
    + no_shoot_hit_count * 5                     // HNT on paper: +5sec each
    + input.penalty_pe * 3                        // Procedural Error: +3sec each
    + input.penalty_hnt * 5                       // HNT standalone: +5sec each
    + input.penalty_ftn * 5                       // FTN: +5sec each
    + input.penalty_fp * 10                       // Flagrant Penalty: +10sec each
    + input.penalty_ftdr * 20;                    // FTDR: +20sec each

  const total_time = input.time + points_down + penalty_seconds;

  return {
    raw_points: points_down,
    penalty_points: penalty_seconds,
    net_points: 0,  // not used for IDPA
    hit_factor: 0,  // not used for IDPA
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ─── Action Steel ──────────────────────────────────────────────────────────────

export interface ActionSteelInput {
  string_times: number[];           // Time for each string
  string_plate_hits: boolean[][];   // Per-string: which plates were hit
  number_of_strings: number;
  drop_worst: number;               // How many worst strings to drop (default 1)
  miss_penalty: number;             // +3sec per miss (default 3)
  stop_plate_miss_cap: number;      // 30sec cap if stop plate missed
}

export function calculateActionSteelScore(input: ActionSteelInput): CalculatedScore {
  const adjustedTimes: number[] = [];

  for (let i = 0; i < input.string_times.length; i++) {
    const time = input.string_times[i];
    const hits = input.string_plate_hits[i] || [];
    const misses = hits.filter(h => !h).length;
    const stopMissed = hits.length > 0 ? !hits[hits.length - 1] : true;

    let adjusted = time + misses * input.miss_penalty;
    if (stopMissed) {
      adjusted = Math.min(adjusted, input.stop_plate_miss_cap);
    }
    adjustedTimes.push(adjusted);
  }

  // Drop worst N strings, sum remaining
  const sorted = [...adjustedTimes].sort((a, b) => a - b);
  const kept = sorted.slice(0, Math.max(1, sorted.length - input.drop_worst));
  const total_time = kept.reduce((s, t) => s + t, 0);

  return {
    raw_points: 0,
    penalty_points: 0,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ─── Multi-Gun (3-Gun) ────────────────────────────────────────────────────────

export interface MultiGunInput {
  time: number;
  targets: Array<{ neutralized: boolean }>;
  penalty_ftn_sec: number;          // +5sec each
  penalty_miss_sec: number;          // +10sec each
  penalty_no_shoot_sec: number;      // +5sec each
  penalty_procedural_sec: number;    // +5sec each
}

export function calculateMultiGunScore(input: MultiGunInput): CalculatedScore {
  const penalty_seconds = input.penalty_ftn_sec * 5
    + input.penalty_miss_sec * 10
    + input.penalty_no_shoot_sec * 5
    + input.penalty_procedural_sec * 5;

  const total_time = input.time + penalty_seconds;

  return {
    raw_points: 0,
    penalty_points: Math.round(penalty_seconds * 100) / 100,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ─── Ring-based scoring (Bullseye, Archery, F-Class) ───────────────────────────

export function calculateRingScore(ring_values: number[]): CalculatedScore {
  // X=11, 10=10, 9=9, ..., 0=miss
  const raw_points = ring_values.reduce((sum, v) => {
    if (v === 11) return sum + 10; // X counts as 10 for score
    return sum + v;
  }, 0);

  const x_count = ring_values.filter(v => v === 11).length;

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
    x_count,
  };
}

// ─── Hit-count scoring (NRL22, PRS) ────────────────────────────────────────────

export function calculateHitCountScore(hits: number, point_value: number = 10): CalculatedScore {
  const raw_points = hits * point_value;

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
  };
}

// ─── Stage ranking utilities ────────────────────────────────────────────────────

export function calculateStagePercent(
  shooterValue: number, // hit_factor for Comstock/VC, net_points for Fixed Time
  highestValue: number,
): number {
  if (highestValue <= 0) return 0;
  // Round to 4 decimal places for precision (e.g., 95.3456%)
  // stage_points is rounded to 2 decimals separately
  return Math.round((shooterValue / highestValue) * 1000000) / 10000;
}

export function calculateStagePoints(stagePercent: number, maxPoints: number): number {
  return Math.round((stagePercent / 100) * maxPoints * 100) / 100;
}

/** Calculate stage percent for time-based scoring (IDPA, Action Steel, Multi-Gun)
 *  Lower time = better. stage_percent = (lowest_time / shooter_time) * 100
 */
export function calculateTimeBasedPercent(
  shooterTime: number,
  lowestTime: number,
): number {
  if (shooterTime <= 0 || lowestTime <= 0) return 0;
  // Round to 4 decimal places for consistency with calculateStagePercent
  return Math.round((lowestTime / shooterTime) * 1000000) / 10000;
}

/** Calculate stage percent for score-based scoring (Bullseye, Archery, F-Class)
 *  Higher score = better. stage_percent = (shooter_score / highest_score) * 100
 *  Same as calculateStagePercent but explicit for clarity.
 */

// ─── Chrono ────────────────────────────────────────────────────────────────────

export function calculateChronoPf(
  bulletWeight: number,
  v1: number | null,
  v2: number | null,
  v3: number | null,
): { avgVelocity: number; calculatedPf: number } {
  const velocities = [v1, v2, v3].filter((v): v is number => v !== null && v > 0);
  if (velocities.length === 0) return { avgVelocity: 0, calculatedPf: 0 };
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const calculatedPf = (bulletWeight * avgVelocity) / 1000;
  return {
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    calculatedPf: Math.round(calculatedPf * 100) / 100,
  };
}

export function checkPfPassed(
  calculatedPf: number,
  declaredPf: PowerFactor,
  organization: Organization,
): { passed: boolean; reclassifyTo: PowerFactor | null } {
  const minorThreshold = 125;
  const majorThreshold = organization === 'IPSC' ? 170 : 165;

  if (declaredPf === 'major') {
    if (calculatedPf >= majorThreshold) {
      return { passed: true, reclassifyTo: null };
    }
    if (calculatedPf >= minorThreshold) {
      return { passed: false, reclassifyTo: 'minor' };
    }
    return { passed: false, reclassifyTo: null }; // below minor → potential DQ
  }

  // declared minor
  if (calculatedPf >= minorThreshold) {
    return { passed: true, reclassifyTo: null };
  }
  return { passed: false, reclassifyTo: null }; // below minor → potential DQ
}