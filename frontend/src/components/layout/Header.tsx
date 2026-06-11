import { useState } from 'react';
import { Badge, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import LanguageSelector from '../settings/LanguageSelector';
import LanUrlBadge from './LanUrlBadge';
import OfflineIndicator from './OfflineIndicator';
import SettingsModal from '../settings/SettingsModal';
import { ThemeToggle } from "../settings/ThemeToggle";
import { TbSettings } from "react-icons/tb";

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
                {!isAdmin && <OfflineIndicator />}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <LanUrlBadge /> }
            <LanguageSelector />

            {isAdmin && (
              <button
                onClick={() => setShowSettings(true)}
                className="cursor-pointer p-1.5 text-gray-400 hover:text-white transition-colors"
                title={t('settings.title')}
              >
                <TbSettings className="size-5" />
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
