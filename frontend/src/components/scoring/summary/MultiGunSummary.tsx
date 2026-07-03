import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateMultiGunPreview } from '../../../utils/scoring';
import { formatTimeDisplay } from '../../../utils/timeFormat';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function MultiGunSummary({ score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const neutralized = score.targets.filter(t => t.target_data?.neutralized === true).length;
  const totalTargets = score.targets.length;

  const preview = useMemo(
    () => calculateMultiGunPreview({
      time: score.time || 0,
      penalty_ftn_sec: Number(sd.penalty_ftn_sec) || 0,
      penalty_miss_sec: Number(sd.penalty_miss_sec) || 0,
      penalty_no_shoot_sec: Number(sd.penalty_no_shoot_sec) || 0,
      penalty_procedural_sec: Number(sd.penalty_procedural_sec) || 0,
    }),
    [score, sd],
  );

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          <span className="">{t('scoring.targets')}</span>
          <span className="font-mono text-right">{neutralized}/{totalTargets}</span>
          <span className="">{t('scoring.rawTime')}</span>
          <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
          <span className="">{t('scoring.penalties')}</span>
          <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.totalTime')}</span>
          <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
        </div>
      </div>
    </SummarySheetLayout>
  );
}
