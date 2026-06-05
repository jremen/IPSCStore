import { Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

/** DNF toggle button used in all scoring sheets */
export default function DnfToggle({ isDnf, onToggle }: { isDnf: boolean; onToggle: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Label>{t('scoring.dnf')}</Label>
      <button
        className={`scoring-btn px-4 rounded text-sm font-bold transition-colors ${isDnf ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
        onClick={onToggle}
      >{isDnf ? t('scoring.yes') : t('scoring.no')}</button>
    </div>
  );
}