import { create } from 'zustand';
import { api, getAuthToken } from '../services/api';
import * as offlineDB from '../services/offlineDB';
import type { ScoringAlert, TargetScore, ScoreInput, RegistrationWithShooter, ScoringProgress } from '../types/scoring';
import type { Stage } from '../types/stage';
import { buildEmptyScore } from '../utils/buildEmptyScore';
import { buildScorePayload } from '../utils/buildScorePayload';

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
  showSummary: false,
  isOfflineMode: false,
  pendingSaveCount: 0,

  fetchRegistrations: async (matchId) => {
    set({ loading: true, error: null, registrations: [] });
    try {
      const regs = await api.getRegistrations(matchId);
      set({ registrations: regs, loading: false, isOfflineMode: false });
      // Pre-cache to IndexedDB in background when online
      offlineDB.cacheRegistrations(matchId, regs).catch(() => {});
    } catch (err: any) {
      // Offline fallback: try IndexedDB
      const cached = await offlineDB.getCachedRegistrations(matchId);
      if (cached.length > 0) {
        set({ registrations: cached, loading: false, isOfflineMode: true });
      } else {
        set({ error: err.message, loading: false });
      }
    }
  },

  selectShooter: (registrationId) => {
    set({ currentRegistrationId: registrationId, alerts: [], isExistingScore: false, showSummary: false });
  },

  loadScore: async (matchId, stageId, registrationId, stage) => {
    try {
      const result = await api.getShooterScore(matchId, stageId, registrationId);

      // Parse score_data: postgres driver may return JSONB as a string
      let parsedScoreData: any = result.score_data || {};
      if (typeof parsedScoreData === 'string') {
        try { parsedScoreData = JSON.parse(parsedScoreData); } catch { parsedScoreData = {}; }
      }

      // Parse target_data for each target: same JSONB string issue
      const targets = (result.targets || []).map((t: any) => {
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

      const score: ScoreInput = {
        time: result.time != null ? Number(result.time) : null,
        targets,
        procedural_count: Number(result.procedural_count) || 0,
        ftsa_count: Number(result.ftsa_count) || 0,
        extra_shot_count: Number(result.extra_shot_count) || 0,
        extra_hit_count: Number(result.extra_hit_count) || 0,
        stacking_count: Number(result.stacking_count) || 0,
        overtime_shot_count: Number(result.overtime_shot_count) || 0,
        is_dnf: result.is_dnf,
        chrono: result.chrono,
        score_data: {
          ...parsedScoreData,
          string_times: parsedScoreData.string_times?.map((t: any) => Number(t)),
        },
      };

      set({ currentScore: score, isExistingScore: true, isOfflineMode: false });

      // Pre-cache when online
      offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
    } catch {
      // Offline fallback: try IndexedDB
      const cached = await offlineDB.getCachedScore(matchId, stageId, registrationId);
      if (cached) {
        let parsedScoreData: any = cached.score_data || {};
        if (typeof parsedScoreData === 'string') {
          try { parsedScoreData = JSON.parse(parsedScoreData); } catch { parsedScoreData = {}; }
        }

        const targets = (cached.targets || []).map((t: any) => {
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

        set({
          currentScore: {
            time: cached.time != null ? Number(cached.time) : null,
            targets,
            procedural_count: Number(cached.procedural_count) || 0,
            ftsa_count: Number(cached.ftsa_count) || 0,
            extra_shot_count: Number(cached.extra_shot_count) || 0,
            extra_hit_count: Number(cached.extra_hit_count) || 0,
            stacking_count: Number(cached.stacking_count) || 0,
            overtime_shot_count: Number(cached.overtime_shot_count) || 0,
            is_dnf: cached.is_dnf,
            chrono: cached.chrono,
            score_data: {
              ...parsedScoreData,
              string_times: parsedScoreData.string_times?.map((t: any) => Number(t)),
            },
          },
          isExistingScore: true,
          isOfflineMode: true,
        });
      } else {
        // No cached score — create empty score for the stage
        set({
          currentScore: buildEmptyScore(stage),
          isExistingScore: false,
          isOfflineMode: !navigator.onLine,
        });
      }
    }
  },

  saveScore: async (matchId, stageId, registrationId, data) => {
    set({ saving: true, error: null });
    const payload = buildScorePayload(data);

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
      set({ saving: false, isExistingScore: true });
      get().refreshPendingCount();
      return;
    }

    // ONLINE: normal flow
    try {
      const result = await api.saveScore(matchId, stageId, registrationId, payload);
      set({ saving: false, isExistingScore: true });
      // Update cache with server response
      offlineDB.cacheScore(matchId, stageId, registrationId, result).catch(() => {});
    } catch (err: any) {
      // Network failed mid-request — queue as pending
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('Network request failed')) {
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
        set({ saving: false, isExistingScore: true });
        get().refreshPendingCount();
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

  availableSquads: () => {
    const { registrations } = get();
    const squads = new Set<number>();
    registrations.forEach(r => { if (r.squad !== null && r.squad !== undefined) squads.add(r.squad); });
    return Array.from(squads).sort((a, b) => a - b);
  },

  nextShooter: () => {
    const { registrations, currentRegistrationId, squadFilter } = get();
    const filtered = squadFilter !== null
      ? registrations.filter(r => r.squad === squadFilter)
      : registrations;
    const idx = filtered.findIndex((r) => r.id === currentRegistrationId);
    if (idx < filtered.length - 1) {
      set({ currentRegistrationId: filtered[idx + 1].id, alerts: [] });
    }
  },

  prevShooter: () => {
    const { registrations, currentRegistrationId, squadFilter } = get();
    const filtered = squadFilter !== null
      ? registrations.filter(r => r.squad === squadFilter)
      : registrations;
    const idx = filtered.findIndex((r) => r.id === currentRegistrationId);
    if (idx > 0) {
      set({ currentRegistrationId: filtered[idx - 1].id, alerts: [] });
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

    set({ squadFilter: squad, currentRegistrationId: newRegId, alerts: [], isExistingScore: false });
  },

  setActiveStageId: (stageId) => {
    set({ activeStageId: stageId, showSummary: false });
  },

  setShowSummary: (show) => {
    set({ showSummary: show });
  },

  fetchScoringProgress: async (matchId) => {
    set({ scoringProgress: null });
    try {
      const progress = await api.getScoringProgress(matchId);
      set({ scoringProgress: progress });
      // Pre-cache when online
      offlineDB.cacheScoringProgress(matchId, progress).catch(() => {});
    } catch (err: any) {
      // Offline fallback: try IndexedDB
      const cached = await offlineDB.getCachedScoringProgress(matchId);
      if (cached) {
        set({ scoringProgress: cached, isOfflineMode: true });
      } else {
        // Non-critical: scoring progress is purely visual
        console.error('Failed to fetch scoring progress:', err.message);
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
}));