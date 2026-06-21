import { useState, useMemo, useCallback } from 'react';

export function useRegistrationFilter(registrations: any[]) {
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (divisionFilter && r.effective_division !== divisionFilter) return false;
      if (categoryFilter && r.effective_category !== categoryFilter) return false;
      return true;
    });
  }, [registrations, search, divisionFilter, categoryFilter]);

  const hasActiveFilters = Boolean(search || divisionFilter || categoryFilter);

  const clearFilters = useCallback(() => {
    setSearch('');
    setDivisionFilter('');
    setCategoryFilter('');
  }, []);

  return {
    search,
    setSearch,
    divisionFilter,
    setDivisionFilter,
    categoryFilter,
    setCategoryFilter,
    filtered,
    hasActiveFilters,
    clearFilters,
  };
}
