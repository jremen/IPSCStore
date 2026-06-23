import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import type { RegistrationWithShooter } from '../types/scoring';

export interface UseSquaddingResult {
  registrations: RegistrationWithShooter[];
  columns: Record<number, RegistrationWithShooter[]>;
  unassigned: RegistrationWithShooter[];
  squadCount: number;
  loading: boolean;
  moveShooter: (shooterId: string, toSquad: number) => void;
  assignShooterToSquad: (registrationId: string, toSquad: number) => void;
  flushPending: () => Promise<void>;
  refresh: () => void;
  query: string;
  setQuery: (q: string) => void;
  totalShooterCount: number;
}

export function useSquadding(matchId: string | null): UseSquaddingResult {
  const { addToast } = useUIStore();
  const [registrations, setRegistrations] = useState<RegistrationWithShooter[]>([]);
  const [squadCount, setSquadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Map<string, number | null>>(new Map());

  const fetchData = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [regs, match] = await Promise.all([
        api.getRegistrations(matchId),
        api.getMatch(matchId),
      ]);
      const stages = match.stages ?? [];
      setRegistrations(regs);
      setSquadCount(stages.length);
    } catch {
      addToast('Failed to load registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [matchId, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const flushSave = useCallback(async (): Promise<void> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending.size === 0 || !matchId) return;

    const lastUpdate = Array.from(pending.entries()).reduce<Record<string, number | null>>((acc, [id, squad]) => {
      if (squad !== undefined) acc[id] = squad;
      return acc;
    }, {});

    pending.clear();

    const registrationIds = Object.keys(lastUpdate);
    const finalSquad = lastUpdate[registrationIds[registrationIds.length - 1]];

    try {
      await api.bulkUpdateRegistrations(matchId, registrationIds, { squad: finalSquad });
      addToast('squadding.saveSuccess', 'success');
    } catch {
      addToast('squadding.saveError', 'error');
    }
  }, [matchId, addToast]);

  const moveShooter = useCallback((shooterId: string, toSquad: number) => {
    // Find registration for this shooter
    const reg = registrations.find((r) => r.shooter_id === shooterId);
    if (!reg) return;

    // Expand to all group members if this shooter is in a group
    const idsToMove = reg.group_id
      ? registrations.filter((r) => r.group_id === reg.group_id).map((r) => r.id)
      : [reg.id];

    // Optimistic update: move all group members to new squad
    setRegistrations((prev) => {
      const idSet = new Set(idsToMove);
      return prev.map((r) =>
        idSet.has(r.id) ? { ...r, squad: toSquad } : r
      );
    });

    // Track the pending update for all group members
    for (const id of idsToMove) {
      pendingRef.current.set(id, toSquad);
    }

    // Debounce the actual API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushSave, 250);
  }, [registrations, flushSave]);

  const assignShooterToSquad = useCallback((registrationId: string, toSquad: number) => {
    const reg = registrations.find((r) => r.id === registrationId);
    const idsToMove = reg?.group_id
      ? registrations.filter((r) => r.group_id === reg.group_id).map((r) => r.id)
      : [registrationId];

    const idSet = new Set(idsToMove);
    setRegistrations((prev) =>
      prev.map((r) => (idSet.has(r.id) ? { ...r, squad: toSquad } : r))
    );

    for (const id of idsToMove) {
      pendingRef.current.set(id, toSquad);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushSave, 250);
  }, [registrations, flushSave]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      flushSave();
    };
  }, [flushSave]);

  const columns = useMemo(() => {
    const cols: Record<number, RegistrationWithShooter[]> = {};
    if (squadCount === 0) return cols;
    for (let i = 1; i <= squadCount; i++) cols[i] = [];
    for (const r of registrations) {
      const sq = r.squad;
      if (sq !== null && sq !== undefined && sq >= 1 && sq <= squadCount) {
        cols[sq].push(r);
      }
    }
    return cols;
  }, [registrations, squadCount]);

  const unassigned = useMemo(() => {
    return registrations.filter((r) => {
      const sq = r.squad;
      return sq === null || sq === undefined || sq < 1 || sq > squadCount;
    });
  }, [registrations, squadCount]);

  const totalShooterCount = registrations.length;

  return {
    registrations,
    columns,
    unassigned,
    squadCount,
    loading,
    moveShooter,
    assignShooterToSquad,
    flushPending: flushSave,
    refresh: fetchData,
    query,
    setQuery,
    totalShooterCount,
  };
}
