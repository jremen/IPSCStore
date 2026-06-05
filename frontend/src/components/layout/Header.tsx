import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import LanguageSelector from '../settings/LanguageSelector';

export default function Header() {
  const { activeMatchId } = useUIStore();
  const { currentMatch } = useMatchStore();
  const { t } = useTranslation();

  return (
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-wider">{t('header.title')}</h1>
        {currentMatch && activeMatchId && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-sm font-medium truncate max-w-48">{currentMatch.name}</span>
            <Badge color={currentMatch.organization === 'IPSC' ? 'info' : 'purple'} size="sm">
              {currentMatch.organization}
            </Badge>
          </>
        )}
      </div>
      <LanguageSelector />
    </header>
  );
}