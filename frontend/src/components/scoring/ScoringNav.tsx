import { useEffect } from 'react';
import { Button, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useScoringStore } from '../../stores/scoringStore';
import { useStageStore } from '../../stores/stageStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { divisionLabel, categoryLabel, powerFactorLabel } from '../../utils/constants';
import { buildEmptyScore } from '../../utils/buildEmptyScore';
import type { Stage } from '../../types/stage';
import ScoringSheet from './ScoringSheet';
import ShooterDropdown from './ShooterDropdown';
import SquadFilterBar from './SquadFilterBar';

interface ScoringNavProps {
  /** If set, restrict the view to only this stage (for remote scorers) */
  restrictedStageId?: string;
}

export default function ScoringNav({ restrictedStageId }: ScoringNavProps) {
  const { activeMatchId, addToast } = useUIStore();
  const { registrations, fetchRegistrations, currentRegistrationId, selectShooter,
          currentScore, setScore, saveScore, validateScore, alerts, nextShooter, prevShooter,
          activeStageId, setActiveStageId, fetchScoringProgress } = useScoringStore();
  const { stages, fetchStages } = useStageStore();
  const { authenticatedMatchId } = useAuthStore();
  const { t } = useTranslation();

  // For remote scorers: fall back to authenticatedMatchId when activeMatchId isn't set yet
  const effectiveMatchId = activeMatchId || (restrictedStageId ? authenticatedMatchId : null);

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

  const loadScoreForShooter = async (matchId: string, stageId: string, regId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    try {
      const result = await api.getShooterScore(matchId, stageId, regId);
      setScore({
        time: result.time,
        targets: (result.targets || []).map((t: any) => ({
          ...t,
          target_data: t.target_data || {},
        })),
        procedural_count: result.procedural_count,
        ftsa_count: result.ftsa_count,
        extra_shot_count: result.extra_shot_count,
        extra_hit_count: result.extra_hit_count,
        stacking_count: result.stacking_count,
        overtime_shot_count: result.overtime_shot_count,
        is_dnf: result.is_dnf,
        chrono: result.chrono,
        score_data: result.score_data || {},
      });
    } catch {
      if (stage) setScore(buildEmptyScore(stage));
    }
  };

  const handleSelectShooter = async (regId: string) => {
    selectShooter(regId);
    if (effectiveMatchId && activeStageId) {
      await loadScoreForShooter(effectiveMatchId, activeStageId, regId);
    }
  };

  const handleSave = async () => {
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
      // Refresh scoring progress after save to update indicators
      if (effectiveMatchId) fetchScoringProgress(effectiveMatchId);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleStageChange = (stageId: string) => {
    setActiveStageId(stageId);
    if (effectiveMatchId && currentRegistrationId) {
      selectShooter(currentRegistrationId);
      loadScoreForShooter(effectiveMatchId, stageId, currentRegistrationId);
    }
  };

  if (!effectiveMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('scoring.noMatch')}</p>;
  }

  const currentStage = stages.find((s) => s.id === activeStageId);

  return (
    <div className="flex flex-col h-full 2xl:gap-12">
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

      {/* Shooter selector with searchable dropdown */}
      {activeStageId && (
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 no-print">
          <SquadFilterBar />
          <div className="flex items-center justify-between mb-2 gap-1">
            <button onClick={prevShooter} disabled={!registrations.length} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 min-h-11 min-w-11 flex items-center justify-center">◀</button>
            <ShooterDropdown onSelect={handleSelectShooter} />
            <button onClick={nextShooter} disabled={!registrations.length} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 min-h-11 min-w-11 flex items-center justify-center">▶</button>
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

      {/* Scoring Sheet — scrollable area */}
      <div className="scoring-scroll">
        {activeStageId && currentRegistrationId && currentStage && currentScore ? (
          <ScoringSheet stage={currentStage} score={currentScore} />
        ) : (
          <p className="p-4 text-gray-500 text-center mt-8">
            {!activeStageId ? t('scoring.selectStage') : !currentRegistrationId ? t('scoring.selectShooter') : t('common.loading')}
          </p>
        )}
      </div>

      {/* Sticky bottom bar — 44px touch targets, safe-area for notched devices */}
      {activeStageId && currentRegistrationId && (
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex justify-between items-center no-print">
          <Button color="gray" onClick={() => prevShooter()} className="min-h-11">{t('common.prev')}</Button>
          <Button color="blue" onClick={handleSave} disabled={!currentScore} className="min-h-11">
            {t('common.save')}
          </Button>
          <Button color="gray" onClick={() => nextShooter()} className="min-h-11">{t('common.next')}</Button>
        </div>
      )}
    </div>
  );
}
