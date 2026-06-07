import { Label, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { InputField } from '../../shared/InputField';
import { useScoringStore } from '../../../stores/scoringStore';
import { useIPSCScoring } from '../../../hooks/useIPSCScoring';
import { useDeviceContext } from '../../../hooks/useDeviceContext';
import { ScoringSheetHeader, DnfToggle, DqSection, ScorePreviewCard, ProceduralsSection } from '../shared';
import PaperTargetsTable from './IPSCPaperTargets';
import DesktopPaperTargets from './DesktopPaperTargets';
import SteelTargetsSection from './IPSCSteelTargets';
import DesktopSteelTargets from './DesktopSteelTargets';
import NoShootSection from './IPSCNoShootTargets';
import type { Stage } from '../../../types/stage';
import type { ScoreInput } from '../../../types/scoring';
import { twMerge } from "tailwind-merge";

interface Props {
  stage: Stage;
  score: ScoreInput;
}

export default function IPSCScoringSheet({ stage, score }: Props) {
  const { t } = useTranslation();
  const { isDesktop } = useDeviceContext();
  const { alerts } = useScoringStore();
  const shooter = useScoringStore(
    (s) => s.registrations.find(r => r.id === s.currentRegistrationId)
  );

  const {
    paperTargets, steelTargets, noShootTargets, noShootHits, steelMisses,
    paperTotals, isTargetFinished, handlePaperHitClick, handlePaperMissClick, handlePaperDecrement,
    handlePaperTotalsChange, handlePaperNSClick, handleResetTarget, handleSteelMissChange,
    handleNoShootChange, handleTimeChange, handleResetAll, handleProceduralChange,
    handlePenaltyFieldChange, handleDnfToggle, preview, isVirginia, isFixedTime,
    showExtraPenalties, hasSidebar, hpp,
  } = useIPSCScoring(stage, score);

  const TimeBlock = ({className}:{className:string}) => <div className={twMerge("my-3", className)}>
        <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
        <InputField
          type="number"
          step="0.01"
          min="0"
          sizing="lg"
          decimal
          value={score.time ?? ''}
          onChange={handleTimeChange}
          disabled={stage.scoring_type === 'fixed_time'}
          className="text-center text-4xl! py-1! font-semibold"
        />
        {stage.scoring_type === 'fixed_time' && stage.par_time && (
          <p className="text-xs text-gray-500 mt-1 text-center">Par time: {stage.par_time}s</p>
        )}
      </div>

  return (
    <div className="p-2 sm:p-4 max-lg:max-w-3xl mx-auto lg:grid grid-cols-2 gap-6">
      {/* TIME INPUT — ALWAYS VISIBLE AT TOP */}
      
      <TimeBlock className="lg:hidden" />
      {/* SCORING SHEET — two-column on desktop when sidebar exists */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-lg:mb-3 shadow-sm overflow-hidden -order-1">
        <ScoringSheetHeader
          subtitle={`${stage.paper_targets} paper × ${hpp} hits • ${stage.steel_targets} steel • ${stage.no_shoot_targets} no-shoot`}
          onReset={handleResetAll}
        />
        {isDesktop ? (
          <p className="text-[10px] text-gray-400 px-3 -mt-1 mb-1">{t('scoring.desktopInstruction')}</p>
        ) : (
          <p className="text-[10px] text-gray-400 px-3 -mt-1 mb-1">Tap +1 • Long-press/right-click −1 • Tap # to reset</p>
        )}

        {/* Main content area: flex row on desktop when sidebar exists */}
        <div className={hasSidebar ? 'md:flex' : ''}>
          {/* PAPER TARGETS */}
          {paperTargets.length > 0 && (
            <div className={hasSidebar ? 'md:flex-1 md:min-w-0' : ''}>
              {isDesktop ? (
                <DesktopPaperTargets
                  paperTargets={paperTargets}
                  hpp={hpp}
                  hasNoShootTargets={stage.no_shoot_targets > 0}
                  paperTotals={paperTotals}
                  onPaperTotalsChange={handlePaperTotalsChange}
                />
              ) : (
                <PaperTargetsTable
                  paperTargets={paperTargets}
                  hpp={hpp}
                  hasNoShootTargets={stage.no_shoot_targets > 0}
                  isTargetFinished={isTargetFinished}
                  onHitClick={handlePaperHitClick}
                  onMissClick={handlePaperMissClick}
                  onDecrement={handlePaperDecrement}
                  onNSClick={handlePaperNSClick}
                  onResetTarget={handleResetTarget}
                />
              )}
            </div>
          )}

          {/* RIGHT SIDEBAR: Steel, No-Shoot, Procedurals */}
          {hasSidebar && (
            <div className="md:w-72 md:shrink-0 md:border-l md:border-gray-200 dark:md:border-gray-700">
              {steelTargets.length > 0 && (
                isDesktop ? (
                  <DesktopSteelTargets
                    steelTargets={steelTargets}
                    steelMisses={steelMisses}
                    onSteelMissChange={handleSteelMissChange}
                  />
                ) : (
                  <SteelTargetsSection steelTargets={steelTargets} steelMisses={steelMisses} onSteelMissChange={handleSteelMissChange} />
                )
              )}
              {noShootTargets.length > 0 && stage.paper_targets === 0 && (
                <NoShootSection noShootHits={noShootHits} onNoShootChange={handleNoShootChange} />
              )}
              <ProceduralsSection
                proceduralCount={score.procedural_count}
                onProceduralChange={handleProceduralChange}
                showExtraPenalties={showExtraPenalties}
                isVirginia={isVirginia}
                isFixedTime={isFixedTime}
                extraShotCount={score.extra_shot_count}
                extraHitCount={score.extra_hit_count}
                stackingCount={score.stacking_count}
                overtimeShotCount={score.overtime_shot_count}
                onPenaltyFieldChange={handlePenaltyFieldChange}
              />
            </div>
          )}
        </div>

        {/* When no sidebar: Procedurals and Virginia penalties go below paper targets inside the card */}
        {!hasSidebar && (
          <ProceduralsSection
            proceduralCount={score.procedural_count}
            onProceduralChange={handleProceduralChange}
            showExtraPenalties={showExtraPenalties}
            isVirginia={isVirginia}
            isFixedTime={isFixedTime}
            extraShotCount={score.extra_shot_count}
            extraHitCount={score.extra_hit_count}
            stackingCount={score.stacking_count}
            overtimeShotCount={score.overtime_shot_count}
            onPenaltyFieldChange={handlePenaltyFieldChange}
          />
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-3">
          {alerts.map((alert, i) => (
            <Alert key={i} color={alert.type === 'error' ? 'failure' : 'warning'}>{alert.message}</Alert>
          ))}
        </div>
      )}

      {/* DNF + DQ toggles */}
      <div className="lg:flex flex-col justify-between">
        <TimeBlock className="max-lg:hidden" />

        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <DnfToggle isDnf={score.is_dnf} onToggle={handleDnfToggle} />
          <DqSection shooter={shooter} />
        </div>

        {/* Live Score Preview */}
        <ScorePreviewCard preview={preview} />
      </div>
    </div>
  );
}
