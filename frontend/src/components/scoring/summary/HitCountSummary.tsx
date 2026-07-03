import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateHitCountPreview } from '../../../utils/scoring';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function HitCountSummary({ stage, score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const config = stage.config || {};
  const pointValue = config.point_value ?? 10;
  const hits = score.targets.filter(t => t.target_data?.hit === true).length;
  const totalTargets = score.targets.length;
  const preview = useMemo(() => calculateHitCountPreview(hits, pointValue), [hits, pointValue]);

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          <span className="">{t('scoring.hits')}</span>
          <span className="font-mono text-right">{hits}/{totalTargets}</span>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
          <span>{t('scoring.totalScore')}</span>
          <span className="font-mono text-right font-bold">{preview.raw_points}</span>
        </div>
      </div>
    </SummarySheetLayout>
  );
}
