import { useScoringStore } from '../../stores/scoringStore';
import { useTranslation } from 'react-i18next';

export default function SquadFilterBar() {
  const { squadFilter, setSquadFilter, registrations } = useScoringStore();
  const { t } = useTranslation();

  // Derive unique squads from registrations
  const squads = Array.from(new Set(
    registrations
      .map(r => r.squad)
      .filter((s): s is number => s !== null && s !== undefined)
  )).sort((a, b) => a - b);

  // Don't show filter if 0 or 1 squads
  if (squads.length <= 1) return null;

  return (
    <div className="flex overflow-x-auto gap-1 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
      <button
        onClick={() => setSquadFilter(null)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap min-h-[32px] transition-colors flex-shrink-0
          ${squadFilter === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
      >
        {t('scoring.allSquads')}
      </button>
      {squads.map(squad => {
        const count = registrations.filter(r => r.squad === squad).length;
        return (
          <button
            key={squad}
            onClick={() => setSquadFilter(squadFilter === squad ? null : squad)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap min-h-[32px] transition-colors flex-shrink-0
              ${squadFilter === squad
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {t('scoring.squadN', { number: squad })}
            <span className="ml-1 text-[10px] opacity-75">({count})</span>
          </button>
        );
      })}
    </div>
  );
}