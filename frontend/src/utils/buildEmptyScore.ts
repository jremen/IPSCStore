import type { Stage } from '../types/stage';
import type { ScoreInput, TargetScore, ScoreData } from '../types/scoring';

/**
 * Build an empty ScoreInput for a given stage and scoring type.
 * Used by ScoringNav when no existing score is found.
 */
export function buildEmptyScore(stage: Stage): ScoreInput {
  const config = stage.config || {};
  const scoringType = stage.scoring_type;
  const targets: TargetScore[] = [];
  let scoreData: ScoreData | undefined = undefined;

  switch (scoringType) {
    case 'action_steel': {
      const numStrings = config.number_of_strings || 5;
      const platesPerString = config.targets_per_string || 5;
      scoreData = {
        string_times: new Array(numStrings).fill(0),
        string_plate_hits: new Array(numStrings).fill(null).map(() => new Array(platesPerString).fill(false)),
      };
      return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
    }

    case 'multi_gun': {
      const numTargets = config.num_targets || stage.paper_targets || 0;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { neutralized: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: { penalty_ftn_sec: 0, penalty_miss_sec: 0, penalty_no_shoot_sec: 0, penalty_procedural_sec: 0 } };
    }

    case 'bullseye':
    case 'archery': {
      const shots = config.shots_per_string || config.arrows_per_end || 10;
      scoreData = { ring_values: new Array(shots).fill(0) };
      return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
    }

    case 'long_range': {
      if (config.variant === 'f_class') {
        const shots = config.shots_per_string || 20;
        scoreData = { ring_values: new Array(shots).fill(0) };
        return { time: null, targets: [], procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: scoreData };
      }
      const numTargets = config.num_targets || stage.paper_targets || 10;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { hit: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }

    case 'nrl22': {
      const numTargets = config.num_targets || stage.paper_targets || 10;
      for (let i = 1; i <= numTargets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null, target_data: { hit: false } });
      }
      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }

    case 'idpa':
    default: {
      for (let i = 1; i <= stage.paper_targets; i++) {
        targets.push({ target_index: i, target_type: 'paper', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null });
      }
      const steelStart = stage.paper_targets;
      for (let i = 1; i <= stage.steel_targets; i++) {
        targets.push({ target_index: steelStart + i, target_type: 'steel', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: true });
      }
      const nsStart = steelStart + stage.steel_targets;
      for (let i = 1; i <= stage.no_shoot_targets; i++) {
        targets.push({ target_index: nsStart + i, target_type: 'no_shoot', alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0, steel_hit: null });
      }

      if (scoringType === 'idpa') {
        return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false, score_data: { penalty_pe: 0, penalty_hnt: 0, penalty_ftn: 0, penalty_fp: 0, penalty_ftdr: 0 } };
      }

      return { time: null, targets, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false };
    }
  }
}