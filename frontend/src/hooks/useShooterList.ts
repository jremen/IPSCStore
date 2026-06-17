import { useMemo, useState } from 'react';
import { useScoringStore } from '../stores/scoringStore';
import { useScoringProgress } from './useScoringProgress';
import { shuffleWithSeed } from '../utils/shuffleWithSeed';

/**
 * Provides search + sort state for the ShooterListScreen.
 *
 * - Search filters by name, division, category, and squad number.
 * - Sort: 'none' = registered order, 'random' = Fisher-Yates shuffle with a
 *   store-managed seed that the user can refresh.
 */
export function useShooterList() {
  const [search, setSearch] = useState('');
  const { registrations, squadFilter, shooterListSort, randomSeed,
          setShooterListSort, reshuffleRandomOrder } = useScoringStore();
  const { scoredIds } = useScoringProgress();

  // Filter by squad (from store) first, then by search query, then apply sort.
  const list = useMemo(() => {
    const filteredBySquad = squadFilter === null
      ? registrations
      : registrations.filter(r => r.squad === squadFilter);

    const q = search.trim().toLowerCase();
    const filtered = q
      ? filteredBySquad.filter(r =>
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
          r.effective_division.toLowerCase().includes(q) ||
          r.effective_category.toLowerCase().includes(q) ||
          (r.squad !== null && r.squad !== undefined && String(r.squad).includes(q))
        )
      : filteredBySquad;

    // Random sort uses a seeded shuffle so the order is stable until the user refreshes.
    if (shooterListSort === 'random') {
      return shuffleWithSeed(filtered, randomSeed);
    }
    return filtered;
  }, [registrations, squadFilter, search, shooterListSort, randomSeed]);

  return {
    search,
    setSearch,
    list,
    shooterListSort,
    setShooterListSort,
    reshuffleRandomOrder,
    scoredIds,
  };
}