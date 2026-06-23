import { useState, useEffect } from 'react';
import { Badge, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { useStageStore } from '../../stores/stageStore';
import LanguageSelector from '../settings/LanguageSelector';
import LanUrlBadge from './LanUrlBadge';
import OfflineIndicator from './OfflineIndicator';
import SettingsModal from '../settings/SettingsModal';
import { ThemeToggle } from "../settings/ThemeToggle";
import StageDetailsView from '../scoring/StageDetailsView';
import { TbSettings, TbInfoCircle, TbClipboardText } from "react-icons/tb";
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function Header() {
  const { activeMatchId } = useUIStore();
  const { currentMatch } = useMatchStore();
  const { isAdmin, authenticatedStageId, authenticatedStageName, authenticatedMatchId, logout, adminLogout } = useAuthStore();
  const { stages, fetchStages } = useStageStore();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load stages for the authenticated match so the details modal has the briefing/image.
  // Stages are already loaded by ScoringNav's useScoringNav hook in normal flow, but the
  // Header may mount independently in some cases (admin views, public results).
  useEffect(() => {
    if (!isAdmin && authenticatedMatchId && stages.length === 0) {
      fetchStages(authenticatedMatchId);
    }
  }, [isAdmin, authenticatedMatchId, stages.length, fetchStages]);

  const currentStage = !isAdmin && authenticatedStageId
    ? stages.find((s) => s.id === authenticatedStageId) ?? null
    : null;

  useTabMenuAction('open-preferences', () => {
    if (isAdmin) setShowSettings(true);
  });

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
                <Badge size="lg" color="green">{currentMatch.name}</Badge>
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
          <div className="flex gap-2">
            <Button
              onClick={handleLogout}
              color="purple"
              className="flex-1"
              title={t('auth.logout')}
            >
              {t('auth.stage')} {authenticatedStageName ? `${authenticatedStageName}` : `🚪 ${t('auth.logout')}`}
            </Button>
            <Button
              onClick={() => setShowDetails(true)}
              color="gray"
              className="shrink-0"
              title={t('stages.showDetails')}
            >
              <TbClipboardText className="size-5" />
            </Button>
          </div>
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
      {!isAdmin && (
        <StageDetailsView show={showDetails} onClose={() => setShowDetails(false)} stage={currentStage} />
      )}
    </>
  );
}
