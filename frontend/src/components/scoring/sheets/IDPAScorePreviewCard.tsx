import { useTranslation } from 'react-i18next';

interface Props {
  raw_points: number;
  total_time: number;
}

export default function IDPAScorePreviewCard({ raw_points, total_time }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
      <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">
        📊 {t('scoring.idpaPreview')}
      </h3>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-red-600">−{raw_points}</div>
          <div className="text-xs text-gray-500">{t('scoring.ptsDown')}</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-600">
            {total_time.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">{t('scoring.totalTime')}</div>
        </div>
      </div>
    </div>
  );
}
