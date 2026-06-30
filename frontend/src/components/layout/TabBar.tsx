import { useUIStore, type TabId } from '../../stores/uiStore';
import { useTranslation } from 'react-i18next';
import MatchProgress from "./MatchProgress";

const TABS: { id: TabId; labelKey: string; icon: string }[] = [
  { id: 'matches', labelKey: 'tabs.matches', icon: '🏆' },
  { id: 'stages', labelKey: 'tabs.stages', icon: '🎯' },
  { id: 'shooters', labelKey: 'tabs.shooters', icon: '👤' },
  { id: 'registration', labelKey: 'tabs.registration', icon: '📋' },
  { id: 'scoring', labelKey: 'tabs.scoring', icon: '📊' },
  { id: 'results', labelKey: 'tabs.results', icon: '🥇' },
];

export default function TabBar() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const { t } = useTranslation();
  // useEffect (() => { runningMatch && fetchMatch(runningMatch); }, [fetchMatch, runningMatch]);

  return (
    <div className="no-print border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex overflow-x-auto items-center scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 eink:bg-black! [&_span]:eink:bg-black! [&_span]:eink:text-white!  eink:text-white! dark:border-blue-400'
                : 'cursor-pointer border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
            <span className="sm:hidden text-xs">{t(tab.labelKey).slice(0, 3)}</span>
          </button>
        ))}

        <MatchProgress />
      </div>
    </div>
  );
}
