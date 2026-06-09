import type { PowerFactor } from '../types/shooter';
import type { ScoringType } from '../types/stage';

// Point values by power factor
const POINT_VALUES: Record<string, { alpha: number; charlie: number; delta: number; steel: number }> = {
  minor: { alpha: 5, charlie: 3, delta: 1, steel: 5 },
  major: { alpha: 5, charlie: 4, delta: 2, steel: 5 },
};

export function getPointValues(pf: PowerFactor | string) {
  return POINT_VALUES[pf] || POINT_VALUES.minor;
}

export interface TargetHitInput {
  target_type: 'paper' | 'steel' | 'no_shoot' | 'npm';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
  hits_per_paper: number;
}

export interface PreviewScore {
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  total_time?: number;
  x_count?: number;
}

// ─── IPSC/USPSA Scoring (Comstock, Virginia Count, Fixed Time) ────────────────

// Client-side scoring preview for live feedback
export function calculatePreview(
  targets: TargetHitInput[],
  time: number | null,
  scoring_type: ScoringType,
  power_factor: PowerFactor,
  procedural: number,
  ftsa: number,
  extra_shot: number,
  extra_hit: number,
  stacking: number,
  overtime: number,
): PreviewScore {
  const pv = getPointValues(power_factor);
  let raw_points = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  for (const target of targets) {
    if (target.target_type === 'paper') {
      const hits: number[] = [];
      for (let i = 0; i < target.alpha; i++) hits.push(pv.alpha);
      for (let i = 0; i < target.charlie; i++) hits.push(pv.charlie);
      for (let i = 0; i < target.delta; i++) hits.push(pv.delta);
      hits.sort((a, b) => b - a);
      const best = hits.slice(0, target.hits_per_paper);
      raw_points += best.reduce((s, v) => s + v, 0);
      // Misses: always use explicit miss count from per-target entry.
      // Fallback to auto-calc only for legacy scores where miss was never set (all zeros).
      const totalScoring = target.alpha + target.charlie + target.delta;
      const hasAnyEntry = target.alpha > 0 || target.charlie > 0 || target.delta > 0 || target.miss > 0;
      miss_count += hasAnyEntry
        ? target.miss
        : Math.max(0, target.hits_per_paper - totalScoring);
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (target.steel_hit) raw_points += pv.steel;
      else miss_count += 1;
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'npm') {
      if (target.steel_hit) raw_points += pv.steel; // +5 bonus
      // miss = no penalty (don't increment miss_count)
      no_shoot_hit_count += target.no_shoot_hits;
    }
  }

  let penalty_points = 0;
  if (scoring_type === 'comstock' || scoring_type === 'hit_factor') {
    penalty_points = miss_count * 10 + no_shoot_hit_count * 10 + ftsa * 10 + procedural * 10;
  } else if (scoring_type === 'virginia') {
    penalty_points = miss_count * 10 + no_shoot_hit_count * 10 + ftsa * 10 + procedural * 10
      + extra_shot * 10 + extra_hit * 10 + stacking * 10;
  } else if (scoring_type === 'fixed_time') {
    penalty_points = no_shoot_hit_count * 10 + procedural * 10 + extra_shot * 10
      + extra_hit * 10 + stacking * 10 + overtime * 5;
  }

  const net_points = raw_points - penalty_points;
  let hit_factor = 0;
  if ((scoring_type === 'comstock' || scoring_type === 'virginia' || scoring_type === 'hit_factor') && time && time > 0) {
    hit_factor = Math.max(0, net_points / time);
  }

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: Math.round(penalty_points * 100) / 100,
    net_points: Math.round(net_points * 100) / 100,
    hit_factor: Math.round(hit_factor * 10000) / 10000,
  };
}

// ─── IDPA (Vickers Count) ─────────────────────────────────────────────────────

export interface IDPAPreviewInput {
  targets: TargetHitInput[];
  time: number;
  penalty_pe: number;
  penalty_hnt: number;
  penalty_ftn: number;
  penalty_fp: number;
  penalty_ftdr: number;
}

export function calculateIDPAPreview(input: IDPAPreviewInput): PreviewScore {
  let points_down = 0;
  let miss_count = 0;
  let no_shoot_hit_count = 0;

  for (const target of input.targets) {
    if (target.target_type === 'paper') {
      // IDPA zones: alpha=0 pts down, charlie=1 pt down, delta=3 pts down
      points_down += target.alpha * 0 + target.charlie * 1 + target.delta * 3;

      const totalHits = target.alpha + target.charlie + target.delta;
      const hasAnyEntry = target.alpha > 0 || target.charlie > 0 || target.delta > 0 || target.miss > 0;
      const targetMisses = hasAnyEntry ? target.miss : Math.max(0, target.hits_per_paper - totalHits);
      miss_count += targetMisses;

      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'steel') {
      if (!target.steel_hit) {
        miss_count += 1;
      }
    } else if (target.target_type === 'no_shoot') {
      no_shoot_hit_count += target.no_shoot_hits;
    } else if (target.target_type === 'npm') {
      // NPM: no effect in IDPA time-based scoring
    }
  }

  const penalty_seconds = miss_count * 5
    + no_shoot_hit_count * 5
    + input.penalty_pe * 3
    + input.penalty_hnt * 5
    + input.penalty_ftn * 5
    + input.penalty_fp * 10
    + input.penalty_ftdr * 20;

  const total_time = input.time + points_down + penalty_seconds;

  return {
    raw_points: points_down,
    penalty_points: Math.round(penalty_seconds * 100) / 100,
    net_points: 0,
    hit_factor: 0,
    total_time: Math.round(total_time * 100) / 100,
  };
}

// ─── Action Steel ──────────────────────────────────────────────────────────────

export interface ActionSteelPreviewInput {
  string_times: number[];
  string_plate_hits: boolean[][];
  drop_worst: number;
  miss_penalty: number;
  stop_plate_miss_cap: number;
}

export function calculateActionSteelPreview(input: ActionSteelPreviewInput): PreviewScore {
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

export interface MultiGunPreviewInput {
  time: number;
  penalty_ftn_sec: number;
  penalty_miss_sec: number;
  penalty_no_shoot_sec: number;
  penalty_procedural_sec: number;
}

export function calculateMultiGunPreview(input: MultiGunPreviewInput): PreviewScore {
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

export function calculateRingPreview(ring_values: number[]): PreviewScore {
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

export function calculateHitCountPreview(hits: number, point_value: number = 10): PreviewScore {
  const raw_points = hits * point_value;

  return {
    raw_points: Math.round(raw_points * 100) / 100,
    penalty_points: 0,
    net_points: Math.round(raw_points * 100) / 100,
    hit_factor: 0,
  };
}