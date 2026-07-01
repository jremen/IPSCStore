import { useState, useEffect } from 'react';
import { Badge, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { useStageStore } from '../../stores/stageStore';
import { useScoringStore } from '../../stores/scoringStore';
import LanguageSelector from '../settings/LanguageSelector';
import LanUrlBadge from './LanUrlBadge';
import OfflineIndicator from './OfflineIndicator';
import SettingsModal from '../settings/SettingsModal';
import { ThemeSelector } from "../settings/ThemeSelector";
import StageDetailsView from '../scoring/StageDetailsView';
import StagePickerModal from '../scoring/StagePickerModal';
import HelpModal from '../help/HelpModal';
import { TbSettings, TbClipboardText, TbHelpCircle } from "react-icons/tb";
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function Header() {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const currentMatch = useMatchStore((s) => s.currentMatch);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const authenticatedMatchId = useAuthStore((s) => s.authenticatedMatchId);
  const logout = useAuthStore((s) => s.logout);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const stages = useStageStore((s) => s.stages);
  const fetchStages = useStageStore((s) => s.fetchStages);
  const activeStageId = useScoringStore((s) => s.activeStageId);
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load stages for the authenticated match so the details modal has the briefing/image.
  useEffect(() => {
    if (!isAdmin && authenticatedMatchId && stages.length === 0) {
      fetchStages(authenticatedMatchId);
    }
  }, [isAdmin, authenticatedMatchId, stages.length, fetchStages]);

  const currentStage = !isAdmin && activeStageId
    ? stages.find((s) => s.id === activeStageId) ?? null
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
      <header className="relative z-999 bg-gray-900 text-white max-w-screen px-4 py-3 no-print">
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
            <button
              onClick={() => setShowHelp(true)}
              className="cursor-pointer p-1.5 text-gray-400 hover:text-white transition-colors"
              title={t('help.title')}
            >
              <TbHelpCircle className="size-5" />
            </button>
            <ThemeSelector />
          </div>
        </div>
        {!isAdmin ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPicker(true)}
              color="purple"
              className="flex-1 min-h-11 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!"
            >
              {currentStage
                ? `${t('scoring.stage', { number: currentStage.stage_number })}: ${currentStage.name}`
                : t('scoring.selectStage')}
            </Button>
            <Button
              onClick={() => setShowDetails(true)}
              color="gray"
              className="shrink-0 min-h-11 min-w-11"
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
        <>
          <StagePickerModal show={showPicker} onClose={() => setShowPicker(false)} />
          <StageDetailsView show={showDetails} onClose={() => setShowDetails(false)} stage={currentStage} />
        </>
      )}
      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
