import { useMemo } from 'react';
import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useConstLabels } from '../../../hooks/useConstLabels';
import { divisionLabel } from '../../../utils/constants';
import { calculateIDPAPreview } from '../../../utils/scoring';
import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function IDPASummary({ stage, score, shooterName, shooterDetails, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel } = useConstLabels();

  const paperTargets = score.targets.filter(t => t.target_type === 'paper');
  const steelTargets = score.targets.filter(t => t.target_type === 'steel');

  const totalAlpha = paperTargets.reduce((s, t) => s + t.alpha, 0) + steelTargets.filter(t => t.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((s, t) => s + t.charlie, 0);
  const totalDelta = paperTargets.reduce((s, t) => s + t.delta, 0);
  const totalMiss = paperTargets.reduce((s, t) => s + t.miss, 0) + steelTargets.filter(t => t.steel_hit === false).length;
  const totalNS = score.targets.reduce((s, t) => s + t.no_shoot_hits, 0);

  const sd = score.score_data || {};
  const preview = useMemo(
    () => calculateIDPAPreview({
      targets: score.targets.map(t => ({ ...t, hits_per_paper: stage.hits_per_paper })),
      time: score.time || 0,
      penalty_pe: Number(sd.penalty_pe) || 0,
      penalty_hnt: Number(sd.penalty_hnt) || 0,
      penalty_ftn: Number(sd.penalty_ftn) || 0,
      penalty_fp: Number(sd.penalty_fp) || 0,
      penalty_ftdr: Number(sd.penalty_ftdr) || 0,
    }),
    [score, stage],
  );

  const badges = shooterDetails ? (
    <>
      <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
      <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
    </>
  ) : undefined;

  return (
    <SummarySheetLayout shooterName={shooterName} badges={badges} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          <span className="">-0 (A)</span>
          <span className="font-mono text-right">{totalAlpha}</span>
          <span className="">-1 (C)</span>
          <span className="font-mono text-right">{totalCharlie}</span>
          <span className="">-3 (D)</span>
          <span className="font-mono text-right">{totalDelta}</span>
          <span className="">{t('scoring.misses')}</span>
          <span className="font-mono text-right">{totalMiss}</span>
          <span className="">{t('scoring.noShootHits')}</span>
          <span className="font-mono text-right">{totalNS}</span>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.ptsDown')}</span>
          <span className="font-mono text-right">{preview.raw_points}</span>
          <span>{t('scoring.penalties')}</span>
          <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>
          <span>{t('scoring.time')}</span>
          <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
          <span>{t('scoring.totalTime')}</span>
          <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
        </div>
      </div>
    </SummarySheetLayout>
  );
}
