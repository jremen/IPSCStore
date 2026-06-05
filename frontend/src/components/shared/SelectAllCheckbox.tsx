import { Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

interface SelectAllCheckboxProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggle: () => void;
  selectedCount: number;
  totalCount: number;
}

/** Checkbox with indeterminate state for table header select-all. */
export default function SelectAllCheckbox({ allSelected, someSelected, onToggle, selectedCount, totalCount }: SelectAllCheckboxProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={onToggle}
      />
      {selectedCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount}/{totalCount}
        </span>
      )}
    </div>
  );
}