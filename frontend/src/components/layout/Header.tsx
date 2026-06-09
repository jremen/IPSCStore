import { useState } from 'react';
import { Badge, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import LanguageSelector from '../settings/LanguageSelector';
import LanUrlBadge from './LanUrlBadge';
import SettingsModal from '../settings/SettingsModal';
import { ThemeToggle } from "../settings/ThemeToggle";

export default function Header() {
  const { activeMatchId } = useUIStore();
  const { currentMatch } = useMatchStore();
  const { isAdmin, authenticatedStageName, logout, adminLogout } = useAuthStore();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    if (isAdmin) {
      adminLogout();
    } else {
      logout();
    }
  };

  return (
    <>
      <header className="bg-gray-900 text-white max-w-screen px-4 py-3 no-print">
        <div className="flex items-center mb-2">
          <div className="flex items-center gap-3 mr-auto">
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
          <div className="flex items-center gap-3">
            {isAdmin && <LanUrlBadge /> }
            <LanguageSelector />

            {isAdmin && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title={t('settings.title')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
        {!isAdmin ? (
          <Button
            onClick={handleLogout}
            color="purple"
            className="w-full"
            title={t('auth.logout')}
          >
            {t('auth.stage')} {authenticatedStageName ? `${authenticatedStageName}` : `🚪 ${t('auth.logout')}`}
          </Button>
        ) : (
          <Button
            onClick={handleLogout}
            color="dark"
            size="xs"
            className="w-full"
            title={t('auth.logout')}
          >
            🔒 {t('auth.adminLogout')}
          </Button>
        )}
      </header>
      {isAdmin && <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />}
    </>
  );
}