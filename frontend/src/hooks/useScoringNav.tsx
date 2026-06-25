import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { useAuthStore } from '../stores/authStore';
import { isScoreComplete } from '../utils/scoringValidation';
import { useScoringReadOnly } from './useScoringReadOnly';
import { precacheScoringData, precacheStageScores } from '../services/precache';


export function useScoringNav() {
  const { activeMatchId, addToast } = useUIStore();
  const { registrations, fetchRegistrations, currentRegistrationId, selectShooter,
          currentScore, loadScore, saveScore, validateScore, nextShooter, prevShooter,
          activeStageId, setActiveStageId, fetchScoringProgress, showSummary, setShowSummary,
          setScore, setSquadFilter, setShooterListSort, reshuffleRandomOrder } = useScoringStore();
  const { stages, fetchStages } = useStageStore();
  const { isAdmin } = useAuthStore();
  const isReadOnly = useScoringReadOnly();
  const { t } = useTranslation();
  const prevMatchIdRef = useRef<string | null>(null);

  // For remote scorers: fall back to authenticatedMatchId when activeMatchId isn't set yet
  const effectiveMatchId = activeMatchId || useAuthStore.getState().authenticatedMatchId;

  // Remote scorers see summary before saving; admins save directly
  const requiresSummary = !isAdmin;

  const currentShooter = registrations.find(r => r.id === currentRegistrationId);

  // When the match changes, reset all scoring state so stale data from the old match
  // doesn't cause race conditions (wrong registrations, missing stages, failed loadScore)
  useEffect(() => {
    if (effectiveMatchId && effectiveMatchId !== prevMatchIdRef.current) {
      prevMatchIdRef.current = effectiveMatchId;
      selectShooter(null);
      setActiveStageId(null);
      setScore(null);
      setSquadFilter(null);
      setShooterListSort('none');
      reshuffleRandomOrder();
    }
  }, [effectiveMatchId, selectShooter, setActiveStageId, setScore, setSquadFilter, setShooterListSort, reshuffleRandomOrder]);

  useEffect(() => {
    if (effectiveMatchId) {
      fetchRegistrations(effectiveMatchId);
      fetchStages(effectiveMatchId);
      fetchScoringProgress(effectiveMatchId);
      // Pre-cache scoring data for offline use (non-blocking)
      precacheScoringData(effectiveMatchId);
    }
  }, [effectiveMatchId, fetchRegistrations, fetchStages, fetchScoringProgress]);

  // Auto-select first stage once stages are loaded (only when no stage is selected)
  useEffect(() => {
    if (stages.length > 0 && !activeStageId) {
      setActiveStageId(stages[0].id);
    }
  }, [stages, activeStageId, setActiveStageId]);

  // Pre-cache all scores for the current stage when it changes (non-blocking)
  useEffect(() => {
    if (effectiveMatchId && activeStageId && registrations.length > 0 && navigator.onLine) {
      const regIds = registrations.map((r) => r.id);
      precacheStageScores(effectiveMatchId, activeStageId, regIds);
    }
  }, [effectiveMatchId, activeStageId, registrations]);

  // Load score whenever the current shooter or stage changes.
  // Guard: only fire when stages are loaded (stage lookup must succeed)
  useEffect(() => {
    if (effectiveMatchId && activeStageId && currentRegistrationId && stages.length > 0) {
      const stage = stages.find((s) => s.id === activeStageId);
      if (stage) {
        loadScore(effectiveMatchId, activeStageId, currentRegistrationId, stage);
      }
    }
  }, [currentRegistrationId, activeStageId, effectiveMatchId, stages, loadScore]);

  const handleSelectShooter = (regId: string) => {
    selectShooter(regId);
    // Score load is handled by the useEffect above watching currentRegistrationId
  };

  const performSave = async () => {
    if (!effectiveMatchId || !activeStageId || !currentRegistrationId || !currentScore) return;
    const stage = stages.find((s) => s.id === activeStageId);
    if (!stage) return;

    const validationAlerts = validateScore(stage, currentScore);
    if (validationAlerts.some((a) => a.type === 'error')) {
      addToast(t('scoring.fixErrors'), 'error');
      return;
    }

    try {
      await saveScore(effectiveMatchId, activeStageId, currentRegistrationId, currentScore);
      addToast(t('scoring.saved'), 'success');
      // Hide summary if it was showing
      setShowSummary(false);

      // Refresh scoring progress after save.
      // When offline, saveScore already updated scoringProgress via addScoredEntry,
      // so skip the API call (fetchScoringProgress would try the API first and hang).
      if (effectiveMatchId && navigator.onLine) {
        await fetchScoringProgress(effectiveMatchId);
      }

      // Auto-advance to next unscored shooter in current squad
      const scored = useScoringStore.getState().scoredIds();
      const regs = useScoringStore.getState().orderedRegistrations();
      const currentIdx = regs.findIndex(r => r.id === currentRegistrationId);

      let nextRegId: string | null = null;
      // Search forward from current position
      for (let i = currentIdx + 1; i < regs.length; i++) {
        if (!scored.has(regs[i].id)) { nextRegId = regs[i].id; break; }
      }
      // Wrap around from the beginning
      if (!nextRegId) {
        for (let i = 0; i < currentIdx; i++) {
          if (!scored.has(regs[i].id)) { nextRegId = regs[i].id; break; }
        }
      }

      if (nextRegId) {
        selectShooter(nextRegId);
        // Score load is handled by the useEffect above watching currentRegistrationId
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleConfirm = () => {
    if (requiresSummary) {
      // Remote scorers: show summary sheet first
      setShowSummary(true);
    } else {
      // Admin: save directly
      performSave();
    }
  };

  const handleSummaryBack = () => {
    setShowSummary(false);
  };

  const handleStageChange = (stageId: string) => {
    setActiveStageId(stageId);
    // Score load is handled by the useEffect above watching activeStageId
  };

    const currentStage = stages.find((s) => s.id === activeStageId);
  const canConfirm = currentScore && currentStage && isScoreComplete(currentStage, currentScore) && !isReadOnly;

  
  return {currentStage, showSummary, currentScore, performSave, currentShooter, handleSelectShooter, handleSummaryBack, handleConfirm, handleStageChange, canConfirm}

}
