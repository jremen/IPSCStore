import { useEffect } from 'react';
import { Button, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useScoringStore } from '../../stores/scoringStore';
import { useStageStore } from '../../stores/stageStore';
import { useAuthStore } from '../../stores/authStore';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import { isScoreComplete } from '../../utils/scoringValidation';
import { useScoringReadOnly } from '../../hooks/useScoringReadOnly';
import ScoringSheet from './ScoringSheet';
import ScoreSummarySheet from './ScoreSummarySheet';
import ShooterDropdown from './ShooterDropdown';
import SquadFilterBar from './SquadFilterBar';
import { TbChevronLeft, TbChevronRight } from "react-icons/tb";

interface ScoringNavProps {
  /** If set, restrict the view to only this stage (for remote scorers) */
  restrictedStageId?: string;
}

export default function ScoringNav({ restrictedStageId }: ScoringNavProps) {
  const { activeMatchId, addToast } = useUIStore();
  const { registrations, fetchRegistrations, currentRegistrationId, selectShooter,
          currentScore, loadScore, saveScore, validateScore, nextShooter, prevShooter,
          activeStageId, setActiveStageId, fetchScoringProgress, showSummary, setShowSummary } = useScoringStore();
  const { stages, fetchStages } = useStageStore();
  const { isAdmin } = useAuthStore();
  const isReadOnly = useScoringReadOnly();
  const { t } = useTranslation();

  // For remote scorers: fall back to authenticatedMatchId when activeMatchId isn't set yet
  const effectiveMatchId = activeMatchId || (restrictedStageId ? useAuthStore.getState().authenticatedMatchId : null);

  // Remote scorers see summary before saving; admins save directly
  const requiresSummary = !isAdmin;

  const currentShooter = registrations.find(r => r.id === currentRegistrationId);

  useEffect(() => {
    if (effectiveMatchId) {
      fetchRegistrations(effectiveMatchId);
      fetchStages(effectiveMatchId);
      fetchScoringProgress(effectiveMatchId);
    }
  }, [effectiveMatchId]);

  useEffect(() => {
    if (stages.length > 0 && !activeStageId) {
      if (restrictedStageId) {
        setActiveStageId(restrictedStageId);
      } else {
        setActiveStageId(stages[0].id);
      }
    }
  }, [stages, activeStageId, restrictedStageId]);

  // Load score whenever the current shooter changes (next/prev, dropdown, auto-advance)
  useEffect(() => {
    if (effectiveMatchId && activeStageId && currentRegistrationId) {
      const stage = stages.find((s) => s.id === activeStageId);
      if (stage) {
        loadScore(effectiveMatchId, activeStageId, currentRegistrationId, stage);
      }
    }
  }, [currentRegistrationId, activeStageId, effectiveMatchId]);

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
      // Refresh scoring progress after save (await so scoredIds is up-to-date)
      if (effectiveMatchId) await fetchScoringProgress(effectiveMatchId);

      // Auto-advance to next unscored shooter in current squad
      const scored = useScoringStore.getState().scoredIds();
      const regs = useScoringStore.getState().filteredRegistrations();
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

  if (!effectiveMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('scoring.noMatch')}</p>;
  }

  const currentStage = stages.find((s) => s.id === activeStageId);
  const canConfirm = currentScore && currentStage && isScoreComplete(currentStage, currentScore) && !isReadOnly;

  // Summary view for remote scorers
  if (showSummary && currentStage && currentScore && currentShooter) {
    return (
      <ScoreSummarySheet
        stage={currentStage}
        score={currentScore}
        shooterName={`${currentShooter.first_name} ${currentShooter.last_name}`}
        shooterDetails={{
          division: currentShooter.effective_division,
          category: currentShooter.effective_category,
          powerFactor: currentShooter.effective_power_factor,
        }}
        onBack={handleSummaryBack}
        onApprove={performSave}
      />
    );
  }

  return (
    <div className="scoring-nav-root">
      {/* Stage selector tabs — hidden for restricted (remote) scorers */}
      {!restrictedStageId && (
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 no-print" style={{ WebkitOverflowScrolling: 'touch' }}>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => handleStageChange(stage.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-11 flex items-center
              ${activeStageId === stage.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t('scoring.stage', { number: stage.stage_number })}
          </button>
        ))}
      </div>
      )}

      {/* Shooter selector with searchable dropdown — pinned at top on mobile */}
      {activeStageId && (
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 no-print scoring-nav-pinned">
          <SquadFilterBar />
          <div className="flex items-center justify-between mb-2 gap-1">
            <button onClick={prevShooter} disabled={!registrations.length} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-30 min-h-11 min-w-11 flex items-center justify-center"><TbChevronLeft className="size-6" /></button>
            <ShooterDropdown onSelect={handleSelectShooter} />
            <button onClick={nextShooter} disabled={!registrations.length} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-30 min-h-11 min-w-11 flex items-center justify-center"><TbChevronRight className="size-6" /></button>
          </div>
          {currentShooter && (
            <div className="flex gap-1 justify-center flex-wrap">
              <Badge color="blue">{divisionLabel(currentShooter.effective_division)}</Badge>
              <Badge color="gray">{categoryLabel(currentShooter.effective_category)}</Badge>
              <Badge color={currentShooter.effective_power_factor === 'major' ? 'warning' : 'success'}>{powerFactorLabel(currentShooter.effective_power_factor)}</Badge>
              {currentShooter.squad && <Badge color="purple">S{currentShooter.squad}</Badge>}
            </div>
          )}
        </div>
      )}

      {/* Scoring Sheet — only this section scrolls on mobile */}
      <div className="scoring-scroll-area">
        {activeStageId && currentRegistrationId && currentStage && currentScore ? (
          <ScoringSheet stage={currentStage} score={currentScore} />
        ) : (
          <p className="p-4 text-gray-500 text-center mt-8">
            {!activeStageId ? t('scoring.selectStage') : !currentRegistrationId ? t('scoring.selectShooter') : t('common.loading')}
          </p>
        )}
      </div>

      {/* Bottom bar — pinned at bottom on mobile */}
      {activeStageId && currentRegistrationId && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex justify-between items-center no-print scoring-nav-pinned">
          <Button color="gray" onClick={() => prevShooter()} className="min-h-11"><TbChevronLeft className="size-6 mr-1" />{t('common.prev')}</Button>
          <Button color="blue" onClick={handleConfirm} disabled={!canConfirm} className="min-h-11">
            {t('common.confirm')}
          </Button>
          <Button color="gray" onClick={() => nextShooter()} className="min-h-11">{t('common.next')}<TbChevronRight className="size-6 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}
