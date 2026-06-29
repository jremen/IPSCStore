import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { groupColor } from '../../utils/groupColors';
import type { RegistrationWithShooter } from '../../types/scoring';

interface ShooterCardProps {
  registration: RegistrationWithShooter;
  isDragging?: boolean;
  onRemoveFromGroup?: (registrationId: string) => void;
}

export default function ShooterCard({ registration, isDragging, onRemoveFromGroup }: ShooterCardProps) {
  const { t } = useTranslation();

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `shooter-${registration.shooter_id}`,
    data: { registration },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const groupId = registration.group_id;
  const groupBorderColor = groupId ? groupColor(groupId) : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`relative bg-gray-600 text-white dark:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pl-3 cursor-grab active:cursor-grabbing touch-none select-none ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* 6px clickable color bar for group membership */}
      {groupBorderColor && onRemoveFromGroup && (
        <div
          className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: groupBorderColor }}
          title={t('registration.ungroup')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromGroup(registration.id);
          }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm dark:text-white truncate">
          {registration.first_name} {registration.last_name}
        </div>
      </div>
    </div>
  );
}
