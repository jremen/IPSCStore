import { useScoringStore } from "../stores/scoringStore";
import { useStageStore } from "../stores/stageStore";

export function useMatchProgress() {
  
    const scoredLength = useScoringStore(
      (s) => s.scoringProgress?.scored?.length ?? 0
    );

    const scored = useScoringStore(
      (s) => s.scoringProgress?.scored
    );
  
    const registrationsLength = useScoringStore(
      (s) => s.registrations?.length ?? 0
    );
  
    const stagesLength = useStageStore(
      (s) => s.stages?.length ?? 0
    );
  
    const fetchScoringProgress = useScoringStore(
      (s) => s.fetchScoringProgress
    );
  
    const fetchRegistrations = useScoringStore(
      (s) => s.fetchRegistrations
    );
  
    const fetchStages = useStageStore(
      (s) => s.fetchStages
    );

    return {scored, scoredLength, stagesLength, registrationsLength, fetchRegistrations, fetchScoringProgress, fetchStages}
}
