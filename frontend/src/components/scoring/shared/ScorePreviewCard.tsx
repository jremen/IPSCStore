import { useTranslation } from 'react-i18next';

/** Live score preview card showing raw points, penalties, net points, and hit factor */
export default function ScorePreviewCard({ preview }: {
  preview: { raw_points: number; penalty_points: number; net_points: number; hit_factor: number };
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
      <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.scorePreview')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div><div className="text-lg font-bold dark:text-white">{preview.raw_points}</div><div className="text-xs text-gray-500">{t('scoring.raw')}</div></div>
        <div><div className="text-lg font-bold text-red-600">−{preview.penalty_points}</div><div className="text-xs text-gray-500">{t('scoring.pen')}</div></div>
        <div><div className="text-lg font-bold text-green-600">{preview.net_points}</div><div className="text-xs text-gray-500">{t('scoring.net')}</div></div>
        <div><div className="text-lg font-bold text-blue-600">{preview.hit_factor.toFixed(4)}</div><div className="text-xs text-gray-500">{t('scoring.hf')}</div></div>
      </div>
    </div>
  );
}