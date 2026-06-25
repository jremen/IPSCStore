import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Button } from 'flowbite-react';
import { TbUserPlus } from 'react-icons/tb';
import ShooterCard from './ShooterCard';
import type { RegistrationWithShooter } from '../../types/scoring';

interface SquadColumnProps {
  squadNumber: number;
  shooters: RegistrationWithShooter[];
  onAddShooter: () => void;
  onRemoveFromGroup?: (registrationId: string) => void;
  query: string;
}

export default function SquadColumn({ squadNumber, shooters, onAddShooter, onRemoveFromGroup, query }: SquadColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `squad-${squadNumber}`,
    data: { squadNumber },
  });

  const filtered = query
    ? shooters.filter((r) => {
        const name = `${r.first_name} ${r.last_name}`.toLowerCase();
        return name.includes(query.toLowerCase());
      })
    : shooters;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-65 max-w-75 bg-gray-50 dark:bg-gray-800/50 border rounded-lg overflow-hidden transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <span className="font-semibold text-sm dark:text-white">
          {t('squadding.squadN', { number: squadNumber })}
        </span>
        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
          ({shooters.length})
        </span>
      </div>

      {/* Shooter list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-20 max-h-100">
        {filtered.length > 0 ? (
          filtered.map((r) => (
            <ShooterCard
              key={r.shooter_id}
              registration={r}
              onRemoveFromGroup={onRemoveFromGroup}
            />
          ))
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            {query ? t('squadding.searchEmpty') : t('squadding.noShooters')}
          </p>
        )}
      </div>

      {/* Add Shooter button */}
      <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700">
        <Button
          size="xs"
          color="light"
          className="w-full"
          onClick={onAddShooter}
        >
          <TbUserPlus className="mr-1 size-3" />
          {t('squadding.addShooter')}
        </Button>
      </div>
    </div>
  );
}
