import type { Stage } from '../types/stage';
import type { ScoreInput } from '../types/scoring';

/**
 * Check whether a score is complete enough to be confirmed/saved.
 *
 * Returns true only when all required hits and time are recorded.
 * Used to enable/disable the Confirm button in the scoring sheet.
 */
export function isScoreComplete(stage: Stage, score: ScoreInput | null): boolean {
  if (!score) return false;

  const scoringType = stage.scoring_type;
  const config = stage.config || {};

  switch (scoringType) {
    case 'comstock':
    case 'virginia':
    case 'fixed_time':
    case 'hit_factor':
    case 'idpa': {
      // Zone-per-target types: require total hits >= min_rounds AND time (except fixed_time)
      const totalHits = score.targets.reduce((sum, t) => {
        if (t.target_type === 'paper') return sum + t.alpha + t.charlie + t.delta + t.miss;
        if (t.target_type === 'steel') return sum + 1; // always 1 — shooter fired a round whether hit or miss
        return sum;
      }, 0);

      // Total hits must match the stage round count exactly — every target must be accounted for
      const hitsComplete = totalHits === stage.min_rounds;
      const timeRequired = scoringType !== 'fixed_time';
      const timeComplete = !timeRequired || (score.time !== null && score.time > 0);

      return hitsComplete && timeComplete;
    }

    case 'action_steel': {
      // Action Steel: at least one string time must be > 0
      const times: number[] = score.score_data?.string_times || [];
      return times.some(t => t > 0);
    }

    case 'multi_gun': {
      // Multi-Gun: time is required
      return score.time !== null && score.time > 0;
    }

    case 'bullseye':
    case 'archery': {
      // Ring-based: at least one ring value > 0
      const ringValues: number[] = score.score_data?.ring_values || [];
      return ringValues.some(v => v > 0);
    }

    case 'long_range': {
      if (config.variant === 'f_class') {
        // F-Class uses ring values
        const ringValues: number[] = score.score_data?.ring_values || [];
        return ringValues.some(v => v > 0);
      }
      // PRS uses hit-count targets
      return score.targets.some(t => t.target_data?.hit === true);
    }

    case 'nrl22': {
      // NRL22: at least one target hit
      return score.targets.some(t => t.target_data?.hit === true);
    }

    case 'chrono': {
      // Chrono stages have no hit/time requirement
      return true;
    }

    default:
      // Unknown type — allow saving
      return true;
  }
}