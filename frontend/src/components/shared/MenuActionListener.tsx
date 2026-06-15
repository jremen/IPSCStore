import { useEffect } from 'react';
import { useThemeMode } from 'flowbite-react';
import {
  useMenuActions,
  onMenuAction,
  TAB_ACTIONS,
  setPendingMenuAction,
  clearPendingMenuAction,
  dispatchMenuEvent,
} from '../../hooks/useMenuActions';
import { useUIStore, type TabId } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useStageStore } from '../../stores/stageStore';
import { useScoringStore } from '../../stores/scoringStore';
import i18n from '../../i18n';

export default function MenuActionListener() {
  const { toggleMode } = useThemeMode();

  const activeTab = useUIStore((s) => s.activeTab);
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const activeStageId = useUIStore((s) => s.activeStageId);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const matches = useMatchStore((s) => s.matches);
  const stages = useStageStore((s) => s.stages);
  const registrations = useScoringStore((s) => s.registrations);

  // Handle all native menu actions centrally. Tab-specific actions switch to
  // the correct tab and set a pending action for the component to execute.
  useMenuActions((action, payload) => {
    if (action === 'toggle-theme') {
      toggleMode();
      return;
    }

    if (action === 'set-language') {
      const lang = payload;
      if (lang === 'en' || lang === 'sk') {
        setLanguage(lang);
        i18n.changeLanguage(lang);
      }
      return;
    }

    const targetTab = TAB_ACTIONS[action];
    if (targetTab && targetTab !== activeTab) {
      setPendingMenuAction(action, payload);
      setActiveTab(targetTab as TabId);
      return;
    }

    // Already on the right tab or no tab required — dispatch immediately.
    dispatchMenuEvent(action, payload);
  });

  // Do NOT clear pending action on tab change — that's when the pending action
  // is supposed to be consumed by the newly mounted tab component.

  // Report state changes back to the main process so menu items can be enabled/disabled.
  useEffect(() => {
    if (!window.electronAPI?.setMenuState) return;

    window.electronAPI.setMenuState({
      activeTab,
      activeMatchId,
      activeStageId,
      hasMatches: matches.length > 0,
      hasStages: stages.length > 0,
      hasRegistrations: registrations.length > 0,
      language,
    });
  }, [activeTab, activeMatchId, activeStageId, language, matches.length, stages.length, registrations.length]);

  // Global menu actions that don't need tab switching.
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      onMenuAction('focus-search', () => {
        // Focus the first visible search input on the current tab.
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="Hľadať"]') as HTMLInputElement | null;
        searchInput?.focus();
      })
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
