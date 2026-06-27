import { Badge, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { TbRefresh, TbArrowLeft } from 'react-icons/tb';

import { useScoringStore } from '../../stores/scoringStore';
import { useStageStore } from '../../stores/stageStore';
import { useShooterList } from '../../hooks/useShooterList';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';

interface ShooterListScreenProps {
  show: boolean;
  onClose: () => void;
  onSelect: (regId: string) => void;
}

/**
 * Full-screen shooter picker — replaces the old ShooterDropdown.
 *
 * Header: back arrow + title.
 * Pinned toolbar: search input, sort toggle (None / Random), refresh icon (only when Random).
 * Scrollable list of shooters with the same green ✓ and badges the dropdown had.
 * Pinned bottom: back button.
 */
export default function ShooterListScreen({ show, onClose, onSelect }: ShooterListScreenProps) {
  const { t } = useTranslation();
  const { currentRegistrationId, activeStageId } = useScoringStore();
  const { stages } = useStageStore();
  const currentStage = stages.find(s => s.id === activeStageId) ?? null;
  const { search, setSearch, list, shooterListSort, setShooterListSort,
          reshuffleRandomOrder, scoredIds } = useShooterList();

  useEscClose(show ? onClose : undefined);

  if (!show) return null;

  const handleSelect = (regId: string) => {
    onSelect(regId);
    onClose();
  };

  console.log(shooterListSort)

  const stageLabel = currentStage
    ? `${t('scoring.stage', { number: currentStage.stage_number })}: ${currentStage.name}`
    : t('scoring.shooterList');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline min-h-11"
        >
          <TbArrowLeft className="size-5" /> {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold mt-1 dark:text-white">{stageLabel}</div>
      </div>

      {/* Toolbar — search + sort toggle + refresh */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shrink-0 space-y-2">
        <TextInput
          placeholder={t('scoring.searchShooter')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sizing="md"
        />
        <div className="flex items-center gap-2">
          <h3 className="dark:text-white font-medium">{t('scoring.order')}:</h3>
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-1">
            <button
              type="button"
              onClick={() => setShooterListSort('orig')}
              className={`flex-1 px-3 py-2 font-medium transition-colors min-h-11 ${
                shooterListSort === 'orig'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {t('scoring.sortOrig')}
            </button>
            <button
              type="button"
              onClick={() => setShooterListSort('random')}
              className={`flex-1 px-3 py-2 font-medium transition-colors min-h-11 ${
                shooterListSort === 'random'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {t('scoring.sortRandom')}
            </button>
          </div>
          {shooterListSort === 'random' && (
            <button
              type="button"
              onClick={reshuffleRandomOrder}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-11 min-w-11 flex items-center justify-center"
              title={t('scoring.randomizeOrder')}
              aria-label={t('scoring.randomizeOrder')}
            >
              <TbRefresh className="size-6" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">{t('scoring.noShootersFound')}</p>
        ) : (
          list.map((r) => {
            const isCurrent = r.id === currentRegistrationId;
            const isScored = scoredIds.has(r.id);
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className={`w-full text-left px-3 py-2.5 text-lg flex items-center justify-between border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors min-h-11 ${
                  isCurrent ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <span className="dark:text-white flex items-center gap-1.5 min-w-0">
                  {isScored && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] leading-none shrink-0">✓</span>
                  )}
                  <span className="truncate">
                    {r.first_name} {r.last_name}
                  </span>
                </span>
                <div className="flex gap-1 shrink-0 ml-2 flex-wrap justify-end">
                  <Badge size="sm" color="blue">{divisionLabel(r.effective_division)}</Badge>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
        <button
          onClick={onClose}
          className="w-full bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg min-h-11 font-medium"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
