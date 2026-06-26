import { Button, Badge } from 'flowbite-react';
import { useEffect, useState } from 'react';

import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';

import ScoringSheet from './ScoringSheet';
import ScoreSummarySheet from './ScoreSummarySheet';
import ShooterListScreen from './ShooterListScreen';
import SquadFilterBar from './SquadFilterBar';
import { TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { useScoringNav } from "../../hooks/useScoringNav";
import { useScoringStore } from "../../stores/scoringStore";
import { useStageStore } from "../../stores/stageStore";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../stores/uiStore";
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function ScoringNav() {
  const { activeMatchId } = useUIStore();
  const { registrations, scoringProgress, currentRegistrationId,
            currentScore, nextShooter, prevShooter,
            activeStageId, showSummary } = useScoringStore();
  const { stages } = useStageStore();
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();
  const {currentShooter, currentStage, performSave, handleSelectShooter, handleSummaryBack, handleConfirm, handleStageChange, canConfirm} = useScoringNav();
  const [showShooterList, setShowShooterList] = useState(false);

  useTabMenuAction('prev-shooter', () => prevShooter());
  useTabMenuAction('next-shooter', () => nextShooter());
  useTabMenuAction('confirm-score', () => {
    if (canConfirm) handleConfirm();
  });

  if (!activeMatchId) {
    return (
      <p className="p-4 text-gray-500 text-center">
        {t('offline.noCachedData')}
      </p>
    );
  }

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
      {/* Stage selector tabs — hidden on mobile (use Header picker instead) */}
      <div className="hidden sm:flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 no-print" style={{ WebkitOverflowScrolling: 'touch' }}>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => handleStageChange(stage.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-11 flex items-center
              ${activeStageId === stage.id ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'cursor-pointer border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-500'}`}
          >
            {t('scoring.stage', { number: stage.stage_number })}
            {registrations.length > 0 && scoringProgress && scoringProgress.scored.filter(e => e.stage_id === stage.id).length === registrations.length && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] leading-none shrink-0">✓</span>}
          </button>
        ))}
      </div>

      {/* Shooter selector with full-screen shooter list — pinned at top on mobile */}
      {activeStageId && (
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 no-print scoring-nav-pinned">
          <SquadFilterBar />
          <div className="flex items-center justify-between my-2 gap-1">
            <button onClick={prevShooter} disabled={!registrations.length} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-30 min-h-11 min-w-11 flex items-center justify-center"><TbChevronLeft className="size-6" /></button>
            <button
              onClick={() => setShowShooterList(true)}
              disabled={!registrations.length}
              className="flex-1 mx-1 sm:mx-2 px-3 py-1 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-h-11 truncate"
            >
              {currentShooter ? (
                <span className="truncate">
                  {currentShooter.first_name} {currentShooter.last_name}
                  <span className="ml-1 hidden sm:inline">({divisionLabel(currentShooter.effective_division)})</span>
                </span>
              ) : (
                <span className="">{t('scoring.selectShooter')}</span>
              )}
            </button>
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

      {/* Shooter list screen — opens as a full-screen overlay */}
      <ShooterListScreen
        show={showShooterList}
        onClose={() => setShowShooterList(false)}
        onSelect={handleSelectShooter}
      />

      {/* Scoring Sheet — only this section scrolls on mobile */}
      <div className="scoring-scroll-area sm:pb-20">
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
        <div className="sm:fixed max-md:pb-8 bottom-0 z-100  w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 sm:p-3 flex justify-between items-center no-print scoring-nav-pinned">
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
