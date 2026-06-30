import { useScoringStore } from '../../stores/scoringStore';
import { useTranslation } from 'react-i18next';
import { useScoringProgress } from '../../hooks/useScoringProgress';

export default function SquadFilterBar() {
  const squadFilter = useScoringStore((s) => s.squadFilter);
  const setSquadFilter = useScoringStore((s) => s.setSquadFilter);
  const registrations = useScoringStore((s) => s.registrations);
  const { squadStatuses } = useScoringProgress();
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
        className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap min-h-8 transition-colors shrink-0
          ${squadFilter === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
      >
        {t('scoring.allSquads')}
      </button>
      {squads.map(squad => {
        const count = registrations.filter(r => r.squad === squad).length;
        const status = squadStatuses.get(squad);
        const allStagesComplete = status?.allStagesComplete ?? false;
        const currentStageComplete = status?.currentStageComplete ?? false;

        // Determine color class based on completion status
        let colorClass: string;
        if (allStagesComplete) {
          // Gold/amber: fully scored on all stages
          colorClass = squadFilter === squad
            ? 'bg-amber-500 text-white'
            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60';
        } else if (currentStageComplete) {
          // Green: fully scored on current stage
          colorClass = squadFilter === squad
            ? 'bg-green-600 text-white'
            : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/60';
        } else {
          // Default: some or none scored
          colorClass = squadFilter === squad
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600';
        }

        return (
          <button
            key={squad}
            onClick={() => setSquadFilter(squadFilter === squad ? null : squad)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap min-h-8 transition-colors shrink-0 ${colorClass}`}
          >
            {t('scoring.squadN', { number: squad })}
            <span className="ml-1 text-2.5 opacity-75">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
