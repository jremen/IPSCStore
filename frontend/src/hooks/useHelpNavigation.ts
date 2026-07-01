import { useUIStore, type TabId } from '../stores/uiStore';
import {
  setPendingMenuAction,
  dispatchMenuEvent,
  TAB_ACTIONS,
} from './useMenuActions';

export function useHelpNavigation() {
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const activeTab = useUIStore((s) => s.activeTab);

  const navigate = (action: string) => {
    const targetTab = TAB_ACTIONS[action] as TabId | undefined;
    if (targetTab && targetTab !== activeTab) {
      setPendingMenuAction(action);
      setActiveTab(targetTab);
    } else {
      dispatchMenuEvent(action);
    }
  };

  const navigateToTab = (tab: TabId) => {
    setActiveTab(tab);
  };

  return { navigate, navigateToTab, activeTab };
}
