import { useMemo, useCallback } from 'react';
import { useScoringStore } from '../stores/scoringStore';
import { calculatePreview } from '../utils/scoring';
import type { Stage } from '../types/stage';
import type { ScoreInput, TargetScore } from '../types/scoring';

/**
 * Hook encapsulating all non-UI logic for IPSC/Comstock/Virginia/FixedTime scoring sheets.
 * Handles paper hit click, miss click, decrement, no-shoot, steel miss, reset, time change,
 * and live score preview calculation.
 */
export function useIPSCScoring(stage: Stage, score: ScoreInput) {
  const setScore = useScoringStore((s) => s.setScore);

  const pf = (() => {
    const shooter = useScoringStore.getState().registrations.find(
      r => r.id === useScoringStore.getState().currentRegistrationId
    );
    return shooter?.effective_power_factor || 'minor';
  })();

  const hpp = stage.hits_per_paper;

  // Separate targets by type
  const paperTargets = useMemo(
    () => score.targets.filter(t => t.target_type === 'paper').sort((a, b) => a.target_index - b.target_index),
    [score.targets]
  );

  const steelTargets = useMemo(
    () => score.targets.filter(t => t.target_type === 'steel'),
    [score.targets]
  );

  const noShootTargets = useMemo(
    () => score.targets.filter(t => t.target_type === 'no_shoot'),
    [score.targets]
  );

  const npmTargets = useMemo(
    () => score.targets.filter(t => t.target_type === 'npm'),
    [score.targets]
  );

  const noShootHits = useMemo(
    () => noShootTargets.reduce((s, t) => s + t.no_shoot_hits, 0),
    [noShootTargets]
  );

  const steelMisses = useMemo(
    () => steelTargets.filter(t => !t.steel_hit).length,
    [steelTargets]
  );

  const steelNSHits = useMemo(
    () => steelTargets.reduce((s, t) => s + t.no_shoot_hits, 0),
    [steelTargets]
  );

  const npmHits = useMemo(
    () => npmTargets.filter(t => t.steel_hit === true).length,
    [npmTargets]
  );

  /** Aggregated totals across all paper targets for desktop input */
  const paperTotals = useMemo(() => ({
    alpha: paperTargets.reduce((s, t) => s + t.alpha, 0),
    charlie: paperTargets.reduce((s, t) => s + t.charlie, 0),
    delta: paperTargets.reduce((s, t) => s + t.delta, 0),
    miss: paperTargets.reduce((s, t) => s + t.miss, 0),
    no_shoot_hits: paperTargets.reduce((s, t) => s + t.no_shoot_hits, 0),
  }), [paperTargets]);

  const isTargetFinished = useCallback((target: TargetScore) => {
    const totalHits = target.alpha + target.charlie + target.delta + target.miss;
    return totalHits >= hpp;
  }, [hpp]);

  const handlePaperHitClick = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta') => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      const total = t.alpha + t.charlie + t.delta + t.miss;
      if (total < hpp) {
        return { ...t, [field]: t[field] + 1 };
      }
      const stealOrder: Array<'alpha' | 'charlie' | 'delta' | 'miss'> = ['alpha', 'charlie', 'delta', 'miss'];
      for (const stealFrom of stealOrder) {
        if (stealFrom !== field && t[stealFrom] > 0) {
          return { ...t, [stealFrom]: t[stealFrom] - 1, [field]: t[field] + 1 };
        }
      }
      return t;
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [hpp, setScore]);

  const handlePaperMissClick = useCallback((targetIndex: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      const total = t.alpha + t.charlie + t.delta + t.miss;
      if (total >= hpp) {
        const stealOrder: Array<'alpha' | 'charlie' | 'delta'> = ['alpha', 'charlie', 'delta'];
        for (const stealFrom of stealOrder) {
          if (t[stealFrom] > 0) {
            return { ...t, [stealFrom]: t[stealFrom] - 1, miss: t.miss + 1 };
          }
        }
        return t;
      }
      return { ...t, miss: t.miss + 1 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [hpp, setScore]);

  const handlePaperDecrement = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss') => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, [field]: Math.max(0, t[field] - 1) };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  /** Desktop: set exact hit count for a specific zone on a target */
  const handleSetTargetHits = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss' | 'no_shoot_hits', value: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, [field]: Math.max(0, value) };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  /** Desktop: set total hits for a zone across ALL paper targets, distributing across targets */
  const handlePaperTotalsChange = useCallback(((
    field: 'alpha' | 'charlie' | 'delta' | 'miss' | 'no_shoot_hits',
    totalValue: number
  ) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentPaperTargets = currentScore.targets.filter(t => t.target_type === 'paper').sort((a, b) => a.target_index - b.target_index);
    const numTargets = currentPaperTargets.length;
    if (numTargets === 0) return;

    const clamped = Math.max(0, totalValue);

    // No-shoot hits on paper targets: store total on first paper target
    // (NS penalty is per-hit, not per-target, so distribution doesn't matter)
    if (field === 'no_shoot_hits') {
      const newTargets = currentScore.targets.map(t => {
        if (t.target_type !== 'paper') return t;
        return { ...t, no_shoot_hits: 0 };
      });
      const firstPaperIdx = newTargets.findIndex(t => t.target_type === 'paper');
      if (firstPaperIdx >= 0) {
        newTargets[firstPaperIdx] = { ...newTargets[firstPaperIdx], no_shoot_hits: clamped };
      }
      setScore({ ...currentScore, targets: newTargets });
      return;
    }

    // Misses: distribute across targets, filling each up to HPP
    if (field === 'miss') {
      const newTargets = currentScore.targets.map(t => {
        if (t.target_type !== 'paper') return t;
        return { ...t, miss: 0 };
      });
      let remaining = clamped;
      for (let i = 0; i < numTargets && remaining > 0; i++) {
        const idx = newTargets.findIndex(t => t.target_type === 'paper' && t.target_index === currentPaperTargets[i].target_index);
        if (idx >= 0) {
          const missAlloc = Math.min(remaining, hpp);
          newTargets[idx] = { ...newTargets[idx], miss: missAlloc };
          remaining -= missAlloc;
        }
      }
      setScore({ ...currentScore, targets: newTargets });
      return;
    }

    // Alpha/Charlie/Delta: distribute across targets, filling each to HPP
    // Reset the field on all paper targets first, then distribute
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper') return t;
      return { ...t, [field]: 0 };
    });

    let remaining = clamped;
    // First pass: fill targets up to their HPP limit
    for (let i = 0; i < numTargets && remaining > 0; i++) {
      const idx = newTargets.findIndex(t => t.target_type === 'paper' && t.target_index === currentPaperTargets[i].target_index);
      if (idx >= 0) {
        const t = newTargets[idx];
        const currentTotal = t.alpha + t.charlie + t.delta + t.miss;
        const room = Math.max(0, hpp - currentTotal);
        const alloc = Math.min(remaining, room);
        newTargets[idx] = { ...t, [field]: alloc };
        remaining -= alloc;
      }
    }
    // Second pass: if still remaining (total exceeds HPP × targets), spread evenly
    for (let i = 0; i < numTargets && remaining > 0; i++) {
      const idx = newTargets.findIndex(t => t.target_type === 'paper' && t.target_index === currentPaperTargets[i].target_index);
      if (idx >= 0) {
        newTargets[idx] = { ...newTargets[idx], [field]: (newTargets[idx] as any)[field] + 1 };
        remaining -= 1;
      }
    }

    setScore({ ...currentScore, targets: newTargets });
  }), [hpp, setScore]);

  const handlePaperNSClick = useCallback((targetIndex: number, delta: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, no_shoot_hits: Math.max(0, t.no_shoot_hits + delta) };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleResetTarget = useCallback((targetIndex: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleSteelMissChange = useCallback((newMisses: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentSteelTargets = currentScore.targets.filter(t => t.target_type === 'steel');
    const clamped = Math.max(0, Math.min(newMisses, currentSteelTargets.length));
    const hits = currentSteelTargets.length - clamped;
    // Sort steel targets by target_index to distribute hits/misses consistently
    const sortedSteel = [...currentSteelTargets].sort((a, b) => a.target_index - b.target_index);
    const hitSet = new Set(sortedSteel.slice(0, hits).map(t => t.target_index));
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'steel') return t;
      return { ...t, steel_hit: hitSet.has(t.target_index) };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleSteelNSClick = useCallback((delta: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentSteelTargets = currentScore.targets.filter(t => t.target_type === 'steel');
    // Store aggregate NS count on first steel target only (same pattern as no_shoot targets)
    const sortedSteel = [...currentSteelTargets].sort((a, b) => a.target_index - b.target_index);
    const firstIdx = sortedSteel.length > 0 ? sortedSteel[0].target_index : -1;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'steel') return t;
      if (t.target_index === firstIdx) {
        return { ...t, no_shoot_hits: Math.max(0, t.no_shoot_hits + delta) };
      }
      return { ...t, no_shoot_hits: 0 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleResetSteel = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'steel') return t;
      return { ...t, steel_hit: true, no_shoot_hits: 0 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleSteelMissIncrement = useCallback(() => {
    handleSteelMissChange(steelMisses + 1);
  }, [steelMisses, handleSteelMissChange]);

  const handleSteelMissDecrement = useCallback(() => {
    handleSteelMissChange(Math.max(0, steelMisses - 1));
  }, [steelMisses, handleSteelMissChange]);

  const steelHits = steelTargets.length - steelMisses;

  const handleSteelHitIncrement = useCallback(() => {
    // Convert a miss to a hit (decrement misses)
    if (steelMisses > 0) {
      handleSteelMissChange(steelMisses - 1);
    }
  }, [steelMisses, handleSteelMissChange]);

  const handleSteelHitDecrement = useCallback(() => {
    // Convert a hit to a miss (increment misses)
    if (steelMisses < steelTargets.length) {
      handleSteelMissChange(steelMisses + 1);
    }
  }, [steelMisses, steelTargets.length, handleSteelMissChange]);

  // ─── NPM (Non-Penalty Miss) target handlers ───

  const handleNpmHitIncrement = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentNpmTargets = currentScore.targets.filter(t => t.target_type === 'npm');
    // Mark one more NPM target as hit
    const sortedNpm = [...currentNpmTargets].sort((a, b) => a.target_index - b.target_index);
    const firstUnhit = sortedNpm.find(t => t.steel_hit !== true);
    if (!firstUnhit) return; // all already hit
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'npm' || t.target_index !== firstUnhit.target_index) return t;
      return { ...t, steel_hit: true };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleNpmHitDecrement = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentNpmTargets = currentScore.targets.filter(t => t.target_type === 'npm');
    // Un-hit one NPM target (revert to null = not attempted)
    const sortedNpm = [...currentNpmTargets].sort((a, b) => b.target_index - a.target_index);
    const lastHit = sortedNpm.find(t => t.steel_hit === true);
    if (!lastHit) return; // none hit
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'npm' || t.target_index !== lastHit.target_index) return t;
      return { ...t, steel_hit: null };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleResetNpm = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'npm') return t;
      return { ...t, steel_hit: null, no_shoot_hits: 0 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleNoShootChange = useCallback((newHits: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const currentNoShootTargets = currentScore.targets.filter(t => t.target_type === 'no_shoot');
    const clamped = Math.max(0, newHits);
    // Put all no-shoot hits on the first no-shoot target (penalty is per-hit, distribution doesn't matter)
    const sortedNoShoot = [...currentNoShootTargets].sort((a, b) => a.target_index - b.target_index);
    const firstIdx = sortedNoShoot.length > 0 ? sortedNoShoot[0].target_index : -1;
    const newTargets = currentScore.targets.map(t => {
      if (t.target_type !== 'no_shoot') return t;
      return { ...t, no_shoot_hits: t.target_index === firstIdx ? clamped : 0 };
    });
    setScore({ ...currentScore, targets: newTargets });
  }, [setScore]);

  const handleTimeChange = useCallback((value: number | null) => {
    // Read current score from store to avoid stale closure over `score`
    const currentScore = useScoringStore.getState().currentScore;
    if (currentScore) {
      setScore({ ...currentScore, time: value });
    }
  }, [setScore]);

  const handleResetAll = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    const resetTargets = currentScore.targets.map(t => ({
      ...t,
      alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0,
      steel_hit: t.target_type === 'steel' ? true : t.target_type === 'npm' ? null : t.steel_hit,
    }));
    setScore({
      ...currentScore,
      time: null,
      targets: resetTargets,
      procedural_count: 0,
      ftsa_count: 0,
      extra_shot_count: 0,
      extra_hit_count: 0,
      stacking_count: 0,
      overtime_shot_count: 0,
      is_dnf: false,
    });
  }, [setScore]);

  const handleProceduralChange = useCallback((delta: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    setScore({ ...currentScore, procedural_count: Math.max(0, currentScore.procedural_count + delta) });
  }, [setScore]);

  const handlePenaltyFieldChange = useCallback((key: 'extra_shot_count' | 'extra_hit_count' | 'stacking_count' | 'overtime_shot_count', delta: number) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    setScore({ ...currentScore, [key]: Math.max(0, (currentScore[key] as number) + delta) });
  }, [setScore]);

  const handleDnfToggle = useCallback(() => {
    const currentScore = useScoringStore.getState().currentScore;
    if (!currentScore) return;
    setScore({ ...currentScore, is_dnf: !currentScore.is_dnf });
  }, [setScore]);

  // Score preview
  const preview = calculatePreview(
    score.targets.map((t) => ({
      target_type: t.target_type,
      alpha: t.alpha, charlie: t.charlie, delta: t.delta,
      miss: t.miss, no_shoot_hits: t.no_shoot_hits,
      steel_hit: t.steel_hit,
      hits_per_paper: stage.hits_per_paper,
    })),
    score.time,
    stage.scoring_type as any,
    pf as any,
    score.procedural_count,
    score.ftsa_count,
    score.extra_shot_count,
    score.extra_hit_count,
    score.stacking_count,
    score.overtime_shot_count,
  );

  const isVirginia = stage.scoring_type === 'virginia';
  const isFixedTime = stage.scoring_type === 'fixed_time';
  const showExtraPenalties = isVirginia || isFixedTime;

  const hasSidebar = steelTargets.length > 0 || npmTargets.length > 0 || (noShootTargets.length > 0 && stage.paper_targets === 0);

  return {
    paperTargets,
    steelTargets,
    noShootTargets,
    npmTargets,
    noShootHits,
    steelMisses,
    steelNSHits,
    npmHits,
    paperTotals,
    isTargetFinished,
    handlePaperHitClick,
    handlePaperMissClick,
    handlePaperDecrement,
    handleSetTargetHits,
    handlePaperTotalsChange,
    handlePaperNSClick,
    handleResetTarget,
    handleSteelMissChange,
    handleSteelNSClick,
    handleResetSteel,
    steelHits,
    handleSteelHitIncrement,
    handleSteelHitDecrement,
    handleSteelMissIncrement,
    handleSteelMissDecrement,
    handleNpmHitIncrement,
    handleNpmHitDecrement,
    handleResetNpm,
    handleNoShootChange,
    handleTimeChange,
    handleResetAll,
    handleProceduralChange,
    handlePenaltyFieldChange,
    handleDnfToggle,
    preview,
    isVirginia,
    isFixedTime,
    showExtraPenalties,
    hasSidebar,
    hpp,
  };
}
