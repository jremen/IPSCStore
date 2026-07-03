import { useMemo } from 'react';
import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from '../../../hooks/useConstLabels';
import { divisionLabel } from '../../../utils/constants';
import { calculatePreview } from '../../../utils/scoring';
import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function IPSCSummary({ stage, score, shooterName, shooterDetails, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  const paperTargets = score.targets.filter(t => t.target_type === 'paper');
  const steelTargets = score.targets.filter(t => t.target_type === 'steel');
  const npmTargets = score.targets.filter(t => t.target_type === 'npm');

  const totalAlpha = paperTargets.reduce((s, t) => s + t.alpha, 0) + steelTargets.filter(t => t.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((s, t) => s + t.charlie, 0);
  const totalDelta = paperTargets.reduce((s, t) => s + t.delta, 0);
  const totalMiss = paperTargets.reduce((s, t) => s + t.miss, 0) + steelTargets.filter(t => t.steel_hit === false).length;
  const totalNS = score.targets.reduce((s, t) => s + t.no_shoot_hits, 0);
  const totalNPM = npmTargets.filter(t => t.steel_hit === true).length;

  const preview = useMemo(
    () => calculatePreview(
      score.targets.map(t => ({ ...t, hits_per_paper: stage.hits_per_paper })),
      score.time,
      stage.scoring_type as any,
      shooterDetails!.powerFactor as any,
      score.procedural_count,
      score.ftsa_count,
      score.extra_shot_count,
      score.extra_hit_count,
      score.stacking_count,
      score.overtime_shot_count,
    ),
    [score, stage, shooterDetails!.powerFactor],
  );

  const totalPenalties = score.procedural_count + score.ftsa_count
    + score.extra_shot_count + score.extra_hit_count
    + score.stacking_count + score.overtime_shot_count;

  const badges = shooterDetails ? (
    <>
      <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
      <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
      <Badge color={shooterDetails.powerFactor === 'major' ? 'warning' : 'success'}>
        {powerFactorLabel(shooterDetails.powerFactor)}
      </Badge>
    </>
  ) : undefined;

  return (
    <SummarySheetLayout shooterName={shooterName} badges={badges} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl">
          <span className="">A</span>
          <span className="font-mono text-right">{totalAlpha}</span>
          <span className="">C</span>
          <span className="font-mono text-right">{totalCharlie}</span>
          <span className="">D</span>
          <span className="font-mono text-right">{totalDelta}</span>
          <span className="">{t('scoring.misses')}</span>
          <span className="font-mono text-right">{totalMiss}</span>
          <span className="">{t('scoring.noShootHits')}</span>
          <span className="font-mono text-right">{totalNS}</span>
          {npmTargets.length > 0 && (
            <>
              <span className="">{t('scoring.npmTargets')}</span>
              <span className="font-mono text-right">{totalNPM}</span>
            </>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white">
          {score.procedural_count > 0 && (
            <>
              <span className="">{t('scoring.procedurals')}</span>
              <span className="font-mono text-right text-red-600">−{score.procedural_count * 10}</span>
            </>
          )}
          {score.ftsa_count > 0 && (
            <>
              <span className="">{t('scoring.ftsa')}</span>
              <span className="font-mono text-right text-red-600">−{score.ftsa_count * 10}</span>
            </>
          )}
          {score.extra_shot_count > 0 && (
            <>
              <span className="">{t('scoring.extraShots')}</span>
              <span className="font-mono text-right text-red-600">−{score.extra_shot_count * 10}</span>
            </>
          )}
          {score.extra_hit_count > 0 && (
            <>
              <span className="">{t('scoring.extraHits')}</span>
              <span className="font-mono text-right text-red-600">−{score.extra_hit_count * 10}</span>
            </>
          )}
          {score.stacking_count > 0 && (
            <>
              <span className="">{t('scoring.stacking')}</span>
              <span className="font-mono text-right text-red-600">−{score.stacking_count * 10}</span>
            </>
          )}
          {score.overtime_shot_count > 0 && (
            <>
              <span className="">{t('scoring.overtime')}</span>
              <span className="font-mono text-right text-red-600">−{score.overtime_shot_count * 5}</span>
            </>
          )}
          {totalPenalties === 0 && (
            <>
              <span className="">{t('scoring.penalties')}</span>
              <span className="font-mono text-right">0</span>
            </>
          )}
          {totalPenalties > 0 && (
            <>
              <span className="font-semibold">{t('scoring.totalPenalties')}</span>
              <span className="font-mono text-right text-red-600 font-semibold">−{preview.penalty_points}</span>
            </>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white font-medium">
          {score.time !== null && (
            <>
              <span>{t('scoring.time')}</span>
              <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
            </>
          )}
          <span>{t('scoring.raw')}</span>
          <span className="font-mono text-right">{preview.raw_points}</span>
          <span>{t('scoring.net')}</span>
          <span className="font-mono text-right">{preview.net_points}</span>
          {stage.scoring_type !== 'fixed_time' && (
            <>
              <span>{t('scoring.hf')}</span>
              <span className="font-mono text-right">{preview.hit_factor.toFixed(4)}</span>
            </>
          )}
        </div>
      </div>
    </SummarySheetLayout>
  );
}
