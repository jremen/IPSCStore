import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useScoringStore } from '../stores/scoringStore';
import { useStageStore } from '../stores/stageStore';
import { useAuthStore } from '../stores/authStore';
import { isScoreComplete } from '../utils/scoringValidation';
import { useScoringReadOnly } from './useScoringReadOnly';
import { precacheScoringData, precacheStageScores } from '../services/precache';
import { shouldAttemptApiCall } from '../services/connectivity';


export function useScoringNav() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const addToast = useUIStore((s) => s.addToast);
  const registrations = useScoringStore((s) => s.registrations);
  const fetchRegistrations = useScoringStore((s) => s.fetchRegistrations);
  const currentRegistrationId = useScoringStore((s) => s.currentRegistrationId);
  const selectShooter = useScoringStore((s) => s.selectShooter);
  const currentScore = useScoringStore((s) => s.currentScore);
  const loadScore = useScoringStore((s) => s.loadScore);
  const saveScore = useScoringStore((s) => s.saveScore);
  const validateScore = useScoringStore((s) => s.validateScore);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const setActiveStageId = useScoringStore((s) => s.setActiveStageId);
  const fetchScoringProgress = useScoringStore((s) => s.fetchScoringProgress);
  const showSummary = useScoringStore((s) => s.showSummary);
  const setShowSummary = useScoringStore((s) => s.setShowSummary);
  const setScore = useScoringStore((s) => s.setScore);
  const setSquadFilter = useScoringStore((s) => s.setSquadFilter);
  const setShooterListSort = useScoringStore((s) => s.setShooterListSort);
  const reshuffleRandomOrder = useScoringStore((s) => s.reshuffleRandomOrder);
  const stages = useStageStore((s) => s.stages);
  const fetchStages = useStageStore((s) => s.fetchStages);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isReadOnly = useScoringReadOnly();
  const { t } = useTranslation();
  const prevMatchIdRef = useRef<string | null>(null);

  // For remote scorers: fall back to authenticatedMatchId when activeMatchId isn't set yet
  const runningMatchId = useMatchStore((s) => s.runningMatch?.id);
  const effectiveMatchId = activeMatchId || useAuthStore.getState().authenticatedMatchId || runningMatchId;

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
      setShooterListSort('orig');
      reshuffleRandomOrder();
    }
  }, [effectiveMatchId, selectShooter, setActiveStageId, setScore, setSquadFilter, setShooterListSort, reshuffleRandomOrder]);

  useEffect(() => {
    if (effectiveMatchId) {
      fetchRegistrations(effectiveMatchId);
      fetchStages(effectiveMatchId);
      fetchScoringProgress(effectiveMatchId);
      // Pre-cache scoring data for offline use (non-blocking).
      // Only run when we're confident the backend is reachable.
      if (shouldAttemptApiCall()) {
        precacheScoringData(effectiveMatchId);
      }
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
    if (effectiveMatchId && activeStageId && registrations.length > 0 && shouldAttemptApiCall()) {
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

    // Optimistic UI: mark saving and close the summary sheet synchronously
    // so the user sees immediate feedback before any async work begins.
    useScoringStore.setState({ saving: true });
    setShowSummary(false);

    try {
      await saveScore(effectiveMatchId, activeStageId, currentRegistrationId, currentScore);
      addToast(t('scoring.saved'), 'success');

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
      useScoringStore.setState({ saving: false });
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
