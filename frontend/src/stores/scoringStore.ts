import { create } from 'zustand';
import { api, getAuthToken } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { isNetworkError, shouldAttemptApiCall } from '../services/connectivity';
import { useUIStore } from './uiStore';
import type { ScoringAlert, ScoreInput, RegistrationWithShooter, ScoringProgress } from '../types/scoring';
import type { Stage } from '../types/stage';
import { buildEmptyScore } from '../utils/buildEmptyScore';
import { buildScorePayload } from '../utils/buildScorePayload';
import { shuffleWithSeed } from '../utils/shuffleWithSeed';

/**
 * Register a Background Sync and attempt an immediate flush whenever a
 * pending save is created. Using a dynamic import avoids a circular module
 * dependency (syncManager imports the scoring store via getState()).
 */
export async function triggerSync() {
  try {
    const { requestSync } = await import('../services/syncManager');
    await requestSync();
  } catch {
    // Sync is best-effort; the polling fallback will retry later.
  }
}

interface ScoringState {
  registrations: RegistrationWithShooter[];
  currentRegistrationId: string | null;
  currentScore: ScoreInput | null;
  /** Whether the current score was loaded from the server (previously saved) vs. newly created */
  isExistingScore: boolean;
  alerts: ScoringAlert[];
  saving: boolean;
  loading: boolean;
  error: string | null;
  squadFilter: number | null; // null = show all squads
  activeStageId: string | null;
  scoringProgress: ScoringProgress | null;
  /** Sort order for the shooter list and prev/next navigation */
  shooterListSort: 'orig' | 'random';
  /** Seed used for the random sort. Bump to reshuffle. */
  randomSeed: number;
  /** Whether the summary confirmation view is showing (remote scorers only) */
  showSummary: boolean;
  /** True when operating in offline mode (reading from IndexedDB) */
  isOfflineMode: boolean;
  /** Number of pending saves waiting to sync */
  pendingSaveCount: number;
}

interface ScoringActions {
  fetchRegistrations: (matchId: string) => Promise<void>;
  selectShooter: (registrationId: string | null) => void;
  loadScore: (matchId: string, stageId: string, registrationId: string, stage: Stage) => Promise<void>;
  saveScore: (matchId: string, stageId: string, registrationId: string, data: ScoreInput) => Promise<void>;
  validateScore: (stage: Stage, score: ScoreInput) => ScoringAlert[];
  setScore: (score: ScoreInput | null) => void;
  setIsExistingScore: (value: boolean) => void;
  nextShooter: () => void;
  prevShooter: () => void;
  setSquadFilter: (squad: number | null) => void;
  setActiveStageId: (stageId: string | null) => void;
  setShooterListSort: (sort: 'orig' | 'random') => void;
  reshuffleRandomOrder: () => void;
  /** Returns registrations filtered by squad and sorted by the current sort mode. */
  orderedRegistrations: () => RegistrationWithShooter[];
  setShowSummary: (show: boolean) => void;
  fetchScoringProgress: (matchId: string) => Promise<void>;
  /** Get registrations filtered by the current squad filter */
  filteredRegistrations: () => RegistrationWithShooter[];
  /** Get sorted list of unique squad numbers from current registrations */
  availableSquads: () => number[];
  /** Get set of registration IDs that have been scored on the current stage */
  scoredIds: () => Set<string>;
  setOfflineMode: (offline: boolean) => void;
  refreshPendingCount: () => Promise<void>;
  updateRegistrationLocal: (registrationId: string, patch: Partial<RegistrationWithShooter>) => void;
}

/** Add a scored entry to the current scoringProgress in the store (used after offline saves) */
function addScoredEntry(
  progress: ScoringProgress | null,
  stageId: string,
  registrationId: string,
  squad: number | null,
): ScoringProgress {
  if (!progress) {
    return { scored: [{ stage_id: stageId, registration_id: registrationId, squad }] };
  }
  // Check if already present
  const exists = progress.scored.some(
    (e) => e.stage_id === stageId && e.registration_id === registrationId,
  );
  if (exists) return progress;
  return { scored: [...progress.scored, { stage_id: stageId, registration_id: registrationId, squad }] };
}

export const useScoringStore = create<ScoringState & ScoringActions>((set, get) => ({
  registrations: [],
  currentRegistrationId: null,
  currentScore: null,
  isExistingScore: false,
  alerts: [],
  saving: false,
  loading: false,
  error: null,
  squadFilter: null,
  activeStageId: null,
  scoringProgress: null,
  shooterListSort: 'orig',
  randomSeed: Math.floor(Math.random() * 0xffffffff),
  showSummary: false,
  isOfflineMode: false,
  pendingSaveCount: 0,

  fetchRegistrations: async (matchId) => {
    set({ loading: true, error: null });

    // Cache-first: try IndexedDB immediately — no network probe, instant render
    let cachedData: RegistrationWithShooter[] | null = null;
    try {
      const cached = await offlineDB.getCachedRegistrations(matchId);
      if (cached.length > 0) cachedData = cached;
    } catch { /* IDB error — proceed to network path */ }

    if (cachedData) {
      set({ registrations: cachedData, loading: false, isOfflineMode: true });
    }

    // If online and reachable, try API in background to refresh with fresh data
    if (shouldAttemptApiCall()) {
      try {
        const regs = await api.getRegistrations(matchId);
        set({ registrations: regs, loading: false, isOfflineMode: false });
        offlineDB.cacheRegistrations(matchId, regs).catch(() => {});
      } catch {
        // API failed — keep cached data if available, otherwise show error
        if (!cachedData) {
          set({ registrations: [], error: 'Could not load registrations', loading: false });
        }
      }
    } else if (!cachedData) {
      // Offline + no cache — show empty state immediately
      set({ registrations: [], error: 'No cached registrations available', loading: false, isOfflineMode: true });
    }
  },

  selectShooter: (registrationId) => {
    set({ currentRegistrationId: registrationId, currentScore: null, alerts: [], isExistingScore: false, showSummary: false });
  },

  loadScore: async (matchId, stageId, registrationId, stage) => {
    // Helper to parse a cached/API score object into ScoreInput format
    const parseScore = (raw: any): ScoreInput => {
      let parsedScoreData: any = raw.score_data || {};
      if (typeof parsedScoreData === 'string') {
        try { parsedScoreData = JSON.parse(parsedScoreData); } catch { parsedScoreData = {}; }
      }
      const targets = (raw.targets || []).map((t: any) => {
        let targetData = t.target_data || {};
        if (typeof targetData === 'string') {
          try { targetData = JSON.parse(targetData); } catch { targetData = {}; }
        }
        return {
          target_index: t.target_index,
          target_type: t.target_type,
          alpha: Number(t.alpha),
          charlie: Number(t.charlie),
          delta: Number(t.delta),
          miss: Number(t.miss),
          no_shoot_hits: Number(t.no_shoot_hits),
          steel_hit: t.steel_hit,
          target_data: targetData,
        };
      });
      return {
        time: raw.time != null ? Number(raw.time) : null,
        targets,
        procedural_count: Number(raw.procedural_count) || 0,
        ftsa_count: Number(raw.ftsa_count) || 0,
        extra_shot_count: Number(raw.extra_shot_count) || 0,
        extra_hit_count: Number(raw.extra_hit_count) || 0,
        stacking_count: Number(raw.stacking_count) || 0,
        overtime_shot_count: Number(raw.overtime_shot_count) || 0,
        is_dnf: raw.is_dnf,
        chrono: raw.chrono,
        score_data: {
          ...parsedScoreData,
          string_times: parsedScoreData.string_times?.map((t: any) => Number(t)),
        },
      };
    };

    // Cache-first: try IndexedDB immediately — no network probe, instant render
    let cachedData: any = null;
    try {
      cachedData = await offlineDB.getCachedScore(matchId, stageId, registrationId);
    } catch { /* IDB error — proceed to network path */ }

    if (cachedData) {
      set({ currentScore: parseScore(cachedData), isExistingScore: true, isOfflineMode: true });
    }

    // If online and reachable, try API in background to refresh with fresh data.
    // Skip the API call for shooters with no score per scoringProgress and no
    // cached score — avoids the 5s timeout when switching to a fresh shooter.
    if (shouldAttemptApiCall()) {
      const sp = get().scoringProgress;
      const hasScoredEntry = sp != null && sp.scored.some(
        (e) => e.stage_id === stageId && e.registration_id === registrationId,
      );

      if (hasScoredEntry || cachedData || sp == null) {
        try {
          const result = await api.getShooterScore(matchId, stageId, registrationId);
          set({ currentScore: parseScore(result), isExistingScore: true, isOfflineMode: false });
          offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
        } catch {
          // API failed — keep cached data if available, otherwise show empty
          if (!cachedData) {
            set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
          }
        }
      } else {
        // No cached score and scoringProgress confirms no score exists
        set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
      }
    } else if (!cachedData) {
      // Offline + no cache — show empty score immediately
      set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
    }
  },

  saveScore: async (matchId, stageId, registrationId, data) => {
    set({ saving: true, error: null });
    const payload = buildScorePayload(data);
    const registrations = get().registrations;
    const currentShooter = registrations.find(r => r.id === registrationId);
    const squad = currentShooter?.squad ?? null;
    const token = getAuthToken() || '';

    // ALWAYS mark scored in-memory immediately — UI flips to "scored" instantly
    set((state) => ({
      saving: false,
      isExistingScore: true,
      scoringProgress: addScoredEntry(state.scoringProgress, stageId, registrationId, squad),
    }));

    /** Rollback the optimistic scored entry */
    const rollback = () => {
      set((state) => ({
        scoringProgress: state.scoringProgress
          ? {
              scored: state.scoringProgress.scored.filter(
                (e) => !(e.stage_id === stageId && e.registration_id === registrationId),
              ),
            }
          : null,
        isExistingScore: false,
      }));
    };

    /** Persist to IDB in the background (offline queue) */
    const persistToIDB = () => {
      const pendingSave = {
        matchId, stageId, registrationId,
        endpoint: 'saveScore' as const,
        payload,
        authToken: token,
        status: 'pending' as const,
        createdAt: Date.now(),
        retryCount: 0,
      };

      offlineDB.saveOfflineScore({
        matchId, stageId, registrationId, squad,
        score: { ...payload, targets: (payload as any).targets },
        pendingSave,
      })
        .then(() => {
          get().refreshPendingCount();
          setTimeout(() => { triggerSync().catch(() => {}); }, 0);
        })
        .catch(() => {
          rollback();
          useUIStore.getState().addToast('Save failed — please try again', 'error');
        });
    };

    if (!shouldAttemptApiCall()) {
      persistToIDB();
      return;
    }

    // ONLINE: try API in the background — don't block the caller
    api.saveScore(matchId, stageId, registrationId, payload)
      .then((result) => {
        offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
      })
      .catch((err: any) => {
        if (isNetworkError(err)) {
          persistToIDB();
        } else {
          rollback();
          useUIStore.getState().addToast(err?.message ?? 'Save failed', 'error');
        }
      });
  },

  validateScore: (stage, score) => {
    const alerts: ScoringAlert[] = [];

    // DNF scores are always valid — skip validation errors
    if (score.is_dnf) return alerts;

    const scoringType = stage.scoring_type;
    const config = stage.config || {};

    // Zone-per-target types (IPSC, IDPA, Hit Factor)
    const zoneTypes = ['comstock', 'virginia', 'fixed_time', 'hit_factor', 'idpa'];
    if (zoneTypes.includes(scoringType)) {
      const totalHits = score.targets.reduce((sum, t) => {
        if (t.target_type === 'paper') return sum + t.alpha + t.charlie + t.delta + t.miss;
        if (t.target_type === 'steel') return sum + 1; // always 1 — shooter fired a round whether hit or miss
        return sum;
      }, 0);

      if (totalHits < stage.min_rounds) {
        alerts.push({ type: 'error', message: `Only ${totalHits} hits entered, but minimum is ${stage.min_rounds}` });
      }

      if (totalHits > stage.min_rounds) {
        alerts.push({ type: 'error', message: `${totalHits} hits entered, but maximum is ${stage.min_rounds}` });
      }

      if (scoringType === 'virginia' && stage.steel_targets > 0) {
        alerts.push({ type: 'error', message: 'Steel targets not allowed on Virginia Count stages' });
      }

      if ((scoringType === 'comstock' || scoringType === 'virginia' || scoringType === 'hit_factor') && (!score.time || score.time <= 0)) {
        alerts.push({ type: 'error', message: 'Time is required for Comstock/Virginia Count scoring' });
      }

      if (scoringType === 'idpa' && (!score.time || score.time <= 0)) {
        alerts.push({ type: 'error', message: 'Time is required for IDPA scoring' });
      }
    }

    // Time-plus types require time
    if (scoringType === 'multi_gun' && (!score.time || score.time <= 0)) {
      alerts.push({ type: 'error', message: 'Time is required for Multi-Gun scoring' });
    }

    // Action Steel: at least one string time required
    if (scoringType === 'action_steel') {
      const sd = score.score_data || {};
      const times: number[] = sd.string_times || [];
      const hasAnyTime = times.some(t => t > 0);
      if (!hasAnyTime) {
        alerts.push({ type: 'error', message: 'At least one string time is required' });
      }
    }

    return alerts;
  },

  setScore: (score) => set({ currentScore: score }),

  setIsExistingScore: (value) => set({ isExistingScore: value }),

  filteredRegistrations: () => {
    const { registrations, squadFilter } = get();
    if (squadFilter === null) return registrations;
    return registrations.filter(r => r.squad === squadFilter);
  },

  orderedRegistrations: () => {
    const { registrations, squadFilter, shooterListSort, randomSeed } = get();
    const filtered = squadFilter === null
      ? registrations
      : registrations.filter(r => r.squad === squadFilter);
    if (shooterListSort === 'random') {
      return shuffleWithSeed(filtered, randomSeed);
    }
    return filtered;
  },

  setShooterListSort: (sort) => {
    set({ shooterListSort: sort });
  },

  reshuffleRandomOrder: () => {
    set({ randomSeed: Math.floor(Math.random() * 0xffffffff) });
  },

  availableSquads: () => {
    const { registrations } = get();
    const squads = new Set<number>();
    registrations.forEach(r => { if (r.squad !== null && r.squad !== undefined) squads.add(r.squad); });
    return Array.from(squads).sort((a, b) => a - b);
  },

  nextShooter: () => {
    const { currentRegistrationId } = get();
    const filtered = get().orderedRegistrations();
    const idx = filtered.findIndex((r) => r.id === currentRegistrationId);
    if (idx < filtered.length - 1) {
      set({ currentRegistrationId: filtered[idx + 1].id, currentScore: null, alerts: [] });
    }
  },

  prevShooter: () => {
    const { currentRegistrationId } = get();
    const filtered = get().orderedRegistrations();
    const idx = filtered.findIndex((r) => r.id === currentRegistrationId);
    if (idx > 0) {
      set({ currentRegistrationId: filtered[idx - 1].id, currentScore: null, alerts: [] });
    }
  },

  setSquadFilter: (squad) => {
    const { registrations, currentRegistrationId } = get();
    let newRegId = currentRegistrationId;

    if (squad !== null && currentRegistrationId) {
      const currentReg = registrations.find(r => r.id === currentRegistrationId);
      if (!currentReg || currentReg.squad !== squad) {
        // Current shooter is not in the new squad — select first shooter in that squad
        const firstInSquad = registrations.find(r => r.squad === squad);
        newRegId = firstInSquad?.id ?? null;
      }
    }

    set({ squadFilter: squad, currentRegistrationId: newRegId, currentScore: null, alerts: [], isExistingScore: false });
  },

  setActiveStageId: (stageId) => {
    set({ activeStageId: stageId, showSummary: false });
  },

  setShowSummary: (show) => {
    set({ showSummary: show });
  },

  fetchScoringProgress: async (matchId) => {
    // Merge helper: union of fetched entries + in-memory optimistic entries
    // This prevents optimistic checkmarks from being erased by stale IDB/API data.
    const merge = (fetched: ScoringProgress): ScoringProgress => {
      const current = get().scoringProgress;
      if (!current) return fetched;
      const fetchedKeys = new Set(fetched.scored.map(e => `${e.stage_id}:${e.registration_id}`));
      const optimistic = current.scored.filter(
        e => !fetchedKeys.has(`${e.stage_id}:${e.registration_id}`),
      );
      return { scored: [...fetched.scored, ...optimistic] };
    };

    // Cache-first: try IndexedDB immediately — no network probe, instant render
    // Don't clear existing progress before trying — avoid UI flash
    try {
      const cached = await offlineDB.getCachedScoringProgress(matchId);
      if (cached) {
        set({ scoringProgress: merge(cached), isOfflineMode: true });
      }
    } catch { /* IDB error — proceed to network path */ }

    // If online and reachable, try API in background to refresh with fresh data
    if (shouldAttemptApiCall()) {
      try {
        const progress = await api.getScoringProgress(matchId);
        set({ scoringProgress: merge(progress), isOfflineMode: false });
        offlineDB.cacheScoringProgress(matchId, progress).catch(() => {});
      } catch {
        // API failed — keep cached data if available
      }
    }
  },

  scoredIds: () => {
    const { scoringProgress, activeStageId } = get();
    if (!scoringProgress || !activeStageId) return new Set<string>();
    return new Set(
      scoringProgress.scored
        .filter(e => e.stage_id === activeStageId)
        .map(e => e.registration_id)
    );
  },

  setOfflineMode: (offline: boolean) => set({ isOfflineMode: offline }),

  refreshPendingCount: async () => {
    const count = await offlineDB.getPendingCount();
    set({ pendingSaveCount: count });
  },

  updateRegistrationLocal: (registrationId, patch) => set((state) => ({
    registrations: state.registrations.map((r) =>
      r.id === registrationId ? { ...r, ...patch } : r,
    ),
  })),
}));
