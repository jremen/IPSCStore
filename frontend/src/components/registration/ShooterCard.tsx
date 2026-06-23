import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from 'flowbite-react';
import { useConstLabels } from '../../hooks/useConstLabels';
import { divisionLabel } from '../../utils/constants';
import type { RegistrationWithShooter } from '../../types/scoring';

interface ShooterCardProps {
  registration: RegistrationWithShooter;
  isDragging?: boolean;
}

export default function ShooterCard({ registration, isDragging }: ShooterCardProps) {
  const { categoryLabel } = useConstLabels();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `shooter-${registration.shooter_id}`,
    data: { registration },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 cursor-grab active:cursor-grabbing touch-none select-none ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="font-medium text-sm dark:text-white truncate">
        {registration.first_name} {registration.last_name}
      </div>
      <div className="flex gap-1 mt-1">
        <Badge color="blue" size="sm">{divisionLabel(registration.effective_division)}</Badge>
        <Badge color="gray" size="sm">{categoryLabel(registration.effective_category)}</Badge>
        {registration.is_dq && <Badge color="failure" size="sm">DQ</Badge>}
      </div>
    </div>
  );
}
