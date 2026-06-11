import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import type { RegistrationWithShooter } from '../types/scoring';

export interface SquadScoringStatus {
  /** Whether all non-DQ shooters in this squad are scored on the current stage */
  currentStageComplete: boolean;
  /** Whether all non-DQ shooters in this squad are scored on ALL stages */
  allStagesComplete: boolean;
}

export type SquadStatusMap = Map<number, SquadScoringStatus>;

/**
 * Hook that computes per-squad scoring completion status.
 * Uses scoringProgress from the store (must be fetched separately).
 * Returns scoredIds for the current stage and squadStatuses for SquadFilterBar.
 */
export function useScoringProgress(): {
  scoredIds: Set<string>;
  squadStatuses: SquadStatusMap;
} {
  const { registrations, scoringProgress, activeStageId } = useScoringStore(
    useShallow((state) => ({
      registrations: state.registrations,
      scoringProgress: state.scoringProgress,
      activeStageId: state.activeStageId,
    }))
  );
  const { stages } = useStageStore();

  // Build set of scored registration_ids for the current stage
  const scoredIds = useMemo(() => {
    if (!scoringProgress || !activeStageId) return new Set<string>();
    return new Set(
      scoringProgress.scored
        .filter(e => e.stage_id === activeStageId)
        .map(e => e.registration_id)
    );
  }, [scoringProgress, activeStageId]);

  // Build per-squad scoring status
  const squadStatuses = useMemo(() => {
    // Group non-DQ registrations by squad
    const nonDqBySquad = new Map<number, RegistrationWithShooter[]>();
    for (const reg of registrations) {
      if (reg.is_dq || reg.squad === null || reg.squad === undefined) continue;
      const list = nonDqBySquad.get(reg.squad) || [];
      list.push(reg);
      nonDqBySquad.set(reg.squad, list);
    }

    const statuses: SquadStatusMap = new Map();

    for (const [squad, regs] of nonDqBySquad) {
      // Current stage: all regs in this squad have been scored?
      const currentStageComplete = regs.length > 0 && regs.every(r => scoredIds.has(r.id));

      // All stages: for each stage, all regs in this squad are scored?
      let allStagesComplete = regs.length > 0 && stages.length > 0;
      if (scoringProgress && allStagesComplete) {
        for (const stage of stages) {
          const stageScoredIds = new Set(
            scoringProgress.scored
              .filter(e => e.stage_id === stage.id && e.squad === squad)
              .map(e => e.registration_id)
          );
          if (!regs.every(r => stageScoredIds.has(r.id))) {
            allStagesComplete = false;
            break;
          }
        }
      } else {
        allStagesComplete = false;
      }

      statuses.set(squad, { currentStageComplete, allStagesComplete });
    }

    return statuses;
  }, [registrations, scoredIds, scoringProgress, stages]);

  return { scoredIds, squadStatuses };
}
