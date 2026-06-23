import { create } from 'zustand';
import { api, getAuthToken } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import { isBackendReachable, isNetworkError } from '../services/connectivity';
import type { ScoringAlert, TargetScore, ScoreInput, RegistrationWithShooter, ScoringProgress } from '../types/scoring';
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
  shooterListSort: 'none' | 'random';
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
  setShooterListSort: (sort: 'none' | 'random') => void;
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
  shooterListSort: 'none',
  randomSeed: Math.floor(Math.random() * 0xffffffff),
  showSummary: false,
  isOfflineMode: false,
  pendingSaveCount: 0,

  fetchRegistrations: async (matchId) => {
    set({ loading: true, error: null });

    // When offline or backend unreachable, skip the API call entirely and go straight to IndexedDB
    if (!navigator.onLine || !(await isBackendReachable())) {
      try {
        const cached = await offlineDB.getCachedRegistrations(matchId);
        if (cached.length > 0) {
          set({ registrations: cached, loading: false, isOfflineMode: true });
        } else {
          set({ registrations: [], error: 'No cached registrations available', loading: false, isOfflineMode: true });
        }
      } catch {
        set({ registrations: [], error: 'Failed to load cached registrations', loading: false, isOfflineMode: true });
      }
      return;
    }

    try {
      const regs = await api.getRegistrations(matchId);
      set({ registrations: regs, loading: false, isOfflineMode: false });
      // Pre-cache to IndexedDB in background when online
      offlineDB.cacheRegistrations(matchId, regs).catch(() => {});
    } catch (err: any) {
      // Network failed mid-request — try IndexedDB fallback
      try {
        const cached = await offlineDB.getCachedRegistrations(matchId);
        if (cached.length > 0) {
          set({ registrations: cached, loading: false, isOfflineMode: true });
        } else {
          set({ registrations: [], error: err.message, loading: false });
        }
      } catch {
        set({ registrations: [], error: err.message, loading: false });
      }
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

    // When offline or backend unreachable, skip the API call entirely and go straight to IndexedDB
    if (!navigator.onLine || !(await isBackendReachable())) {
      try {
        const cached = await offlineDB.getCachedScore(matchId, stageId, registrationId);
        if (cached) {
          set({ currentScore: parseScore(cached), isExistingScore: true, isOfflineMode: true });
        } else {
          set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
        }
      } catch {
        set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
      }
      return;
    }

    try {
      const result = await api.getShooterScore(matchId, stageId, registrationId);
      set({ currentScore: parseScore(result), isExistingScore: true, isOfflineMode: false });
      // Pre-cache when online
      offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
    } catch {
      // Network failed mid-request — try IndexedDB fallback
      try {
        const cached = await offlineDB.getCachedScore(matchId, stageId, registrationId);
        if (cached) {
          set({ currentScore: parseScore(cached), isExistingScore: true, isOfflineMode: true });
        } else {
          set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
        }
      } catch {
        set({ currentScore: buildEmptyScore(stage), isExistingScore: false, isOfflineMode: true });
      }
    }
  },

  saveScore: async (matchId, stageId, registrationId, data) => {
    set({ saving: true, error: null });
    const payload = buildScorePayload(data);
    const registrations = get().registrations;
    const currentShooter = registrations.find(r => r.id === registrationId);

    if (!navigator.onLine) {
      // OFFLINE: queue the save for later sync
      const token = getAuthToken() || '';
      await offlineDB.addPendingSave({
        matchId,
        stageId,
        registrationId,
        endpoint: 'saveScore',
        payload,
        authToken: token,
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0,
      });
      // Update local cached score immediately so the UI is consistent
      await offlineDB.cacheScore(matchId, stageId, registrationId, { ...payload, targets: (payload as any).targets });
      // Update scoring progress locally so scoredIds and squad status reflect the save
      set((state) => ({
        saving: false,
        isExistingScore: true,
        scoringProgress: addScoredEntry(
          state.scoringProgress,
          stageId,
          registrationId,
          currentShooter?.squad ?? null,
        ),
      }));
      get().refreshPendingCount();
      // Register Background Sync so the score flushes as soon as the device
      // is back online, even if the browser/tab was in the background.
      triggerSync();
      return;
    }

    // ONLINE: normal flow
    try {
      const result = await api.saveScore(matchId, stageId, registrationId, payload);
      set((state) => ({
        saving: false,
        isExistingScore: true,
        // Update scoring progress locally so the same client's UI reflects the
        // save immediately, even before the SSE event arrives.
        scoringProgress: addScoredEntry(
          state.scoringProgress,
          stageId,
          registrationId,
          currentShooter?.squad ?? null,
        ),
      }));
      // Update cache with server response
      offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
    } catch (err: any) {
      // Network failed mid-request — queue as pending
      if (isNetworkError(err)) {
        const token = getAuthToken() || '';
        await offlineDB.addPendingSave({
          matchId,
          stageId,
          registrationId,
          endpoint: 'saveScore',
          payload,
          authToken: token,
          status: 'pending',
          createdAt: Date.now(),
          retryCount: 0,
        });
        await offlineDB.cacheScore(matchId, stageId, registrationId, { ...payload, targets: (payload as any).targets });
        // Update scoring progress locally
        set((state) => ({
          saving: false,
          isExistingScore: true,
          scoringProgress: addScoredEntry(
            state.scoringProgress,
            stageId,
            registrationId,
            currentShooter?.squad ?? null,
          ),
        }));
        get().refreshPendingCount();
        // Register Background Sync so the queued score flushes automatically
        // when connectivity returns.
        triggerSync();
      } else {
        set({ error: err.message, saving: false });
        throw err;
      }
    }
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
    // Don't clear existing progress before trying — avoid UI flash

    // When offline or backend unreachable, skip the API call entirely and go straight to IndexedDB
    if (!navigator.onLine || !(await isBackendReachable())) {
      try {
        const cached = await offlineDB.getCachedScoringProgress(matchId);
        if (cached) {
          set({ scoringProgress: cached, isOfflineMode: true });
        }
        // If no cached data, keep existing progress (don't null it out)
      } catch {
        // IndexedDB failed — keep whatever progress we have
      }
      return;
    }

    try {
      const progress = await api.getScoringProgress(matchId);
      set({ scoringProgress: progress, isOfflineMode: false });
      // Pre-cache when online
      offlineDB.cacheScoringProgress(matchId, progress).catch(() => {});
    } catch {
      // Network failed mid-request — try IndexedDB fallback
      try {
        const cached = await offlineDB.getCachedScoringProgress(matchId);
        if (cached) {
          set({ scoringProgress: cached, isOfflineMode: true });
        }
      } catch {
        // IndexedDB failed — keep whatever progress we have
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