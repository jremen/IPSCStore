import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { TbTrash } from "react-icons/tb";

interface BulkActionToolbarProps {
  selectedCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

/** Floating toolbar shown when items are selected. Displays count and action buttons. */
export default function BulkActionToolbar({
  selectedCount,
  onEdit,
  onDelete,
  onClearSelection,
  editLabel,
  deleteLabel,
}: BulkActionToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
        {t('bulkActions.selectedCount', { count: selectedCount })}
      </span>
      <div className="flex gap-2 ml-auto">
        <Button size="xs" color="blue" onClick={onEdit}>
          {editLabel || t('bulkActions.editSelected')}
        </Button>
        <Button size="xs" color="red" onClick={onDelete}>
          <TbTrash className="size-4 mr-2" />
          {deleteLabel || t('bulkActions.deleteSelected')}
        </Button>
        <Button size="xs" color="gray" onClick={onClearSelection}>
          {t('bulkActions.clearSelection')}
        </Button>
      </div>
    </div>
  );
}
