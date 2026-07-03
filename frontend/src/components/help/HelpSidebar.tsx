import { useTranslation } from 'react-i18next';
import type { HelpSection } from '../../config/helpSections';

interface HelpSidebarProps {
  sections: HelpSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function HelpSidebar({ sections, activeId, onSelect }: HelpSidebarProps) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('help.sidebarAria')}
      className="w-full sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sm:max-h-[70vh] sm:overflow-y-auto"
    >
      <ul className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'w-full text-left px-4 py-2.5 text-sm border-b-2 sm:border-b-0 sm:border-l-2 transition-colors cursor-pointer whitespace-nowrap ' +
                  (active
                    ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-900 font-medium'
                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')
                }
              >
                {t(s.labelKey)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
