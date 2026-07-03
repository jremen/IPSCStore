import { useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateActionSteelPreview } from '../../../utils/scoring';
import { SummarySheetLayout } from '../shared/SummarySheetLayout';
import type { ScoreSummarySheetProps } from '../ScoreSummarySheet';

export default function ActionSteelSummary({ stage, score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const stringTimes: number[] = sd.string_times || [];
  const stringHits: boolean[][] = sd.string_plate_hits || [];
  const config = stage.config || {};

  const preview = useMemo(
    () => calculateActionSteelPreview({
      string_times: stringTimes,
      string_plate_hits: stringHits,
      drop_worst: config.drop_worst ?? 0,
      miss_penalty: 3,
      stop_plate_miss_cap: 30,
    }),
    [stringTimes, stringHits, config],
  );

  return (
    <SummarySheetLayout shooterName={shooterName} onBack={onBack} onApprove={onApprove}>
      <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
          {stringTimes.map((time, i) => (
            <Fragment key={i}>
              <span className="">{t('scoring.stringN', { number: i + 1 })}</span>
              <span className="font-mono text-right">{time > 0 ? time.toFixed(2) : '—'}</span>
            </Fragment>
          ))}
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
