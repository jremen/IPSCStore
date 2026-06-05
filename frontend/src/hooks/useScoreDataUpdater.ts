import type { ScoreInput, ScoreData } from '../types/scoring';
import { useScoringStore } from '../stores/scoringStore';

/**
 * Hook that provides an updateScoreData helper for scoring sheets that use
 * the score_data field (ActionSteel, IDPA, MultiGun).
 */
export function useScoreDataUpdater(score: ScoreInput) {
  const { setScore } = useScoringStore();
  const sd: ScoreData = score.score_data || {};

  const updateScoreData = (updates: Partial<ScoreData>) => {
    setScore({ ...score, score_data: { ...sd, ...updates } });
  };

  return { sd, updateScoreData };
}