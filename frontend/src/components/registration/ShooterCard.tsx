import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from 'flowbite-react';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import { groupColor } from '../../utils/groupColors';
import type { RegistrationWithShooter } from '../../types/scoring';

interface ShooterCardProps {
  registration: RegistrationWithShooter;
  isDragging?: boolean;
  onRemoveFromGroup?: (registrationId: string) => void;
}

export default function ShooterCard({ registration, isDragging, onRemoveFromGroup }: ShooterCardProps) {
  const { categoryLabel } = useConstLabels();

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
      style={style}
      className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pl-3 cursor-grab active:cursor-grabbing touch-none select-none ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Slim left border for group membership */}
      {groupBorderColor && (
        <div
          className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg pointer-events-none"
          style={{ backgroundColor: groupBorderColor }}
          aria-hidden
        />
      )}

      <div
        className="flex-1 min-w-0"
        {...listeners}
        {...attributes}
      >
        <div className="font-medium text-sm dark:text-white truncate">
          {registration.first_name} {registration.last_name}
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          <Badge color="blue" size="xs">{divisionLabel(registration.effective_division)}</Badge>
          <Badge color="gray" size="xs">{categoryLabel(registration.effective_category)}</Badge>
          {registration.is_dq && <Badge color="failure" size="xs">DQ</Badge>}
        </div>
      </div>

      {/* Group kebab menu */}
      {groupId && onRemoveFromGroup && (
        <button
          type="button"
          className="absolute top-1 right-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          title="Remove from group"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromGroup(registration.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      )}
    </div>
  );
}
