import { useState, useCallback, useMemo } from 'react';

/**
 * Generic selection hook for managing a set of selected IDs.
 * Used by tables with checkbox columns for bulk actions.
 */
export function useSelection<T extends string>(allIds: T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(allIds));
  }, [allIds]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  return {
    selected,
    selectedArray: useMemo(() => Array.from(selected), [selected]),
    selectedCount: selected.size,
    toggle,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
    hasSelection: selected.size > 0,
  };
}