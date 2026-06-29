import { Checkbox } from 'flowbite-react';

interface SelectAllCheckboxProps {
  allSelected: boolean;
  someSelected: boolean;
  onToggle: () => void;
  selectedCount: number;
  totalCount: number;
}

/** Checkbox with indeterminate state for table header select-all. */
export default function SelectAllCheckbox({ allSelected, someSelected, onToggle, selectedCount, totalCount }: SelectAllCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={onToggle}
        className="size-5 cursor-pointer"
      />
      {selectedCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount}/{totalCount}
        </span>
      )}
    </div>
  );
}
