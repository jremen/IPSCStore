import { create } from 'zustand';
import { api } from '../services/api';
import type { ScoringAlert, TargetScore, ScoreInput, RegistrationWithShooter, ScoringProgress } from '../types/scoring';
import type { Stage } from '../types/stage';

interface ScoringState {
  registrations: RegistrationWithShooter[];
  currentRegistrationId: string | null;
  currentScore: ScoreInput | null;
  alerts: ScoringAlert[];
  saving: boolean;
  loading: boolean;
  error: string | null;
  squadFilter: number | null; // null = show all squads
  activeStageId: string | null;
  scoringProgress: ScoringProgress | null;
}

interface ScoringActions {
  fetchRegistrations: (matchId: string) => Promise<void>;
  selectShooter: (registrationId: string) => void;
  loadScore: (matchId: string, stageId: string, registrationId: string) => Promise<void>;
  saveScore: (matchId: string, stageId: string, registrationId: string, data: ScoreInput) => Promise<void>;
  validateScore: (stage: Stage, score: ScoreInput) => ScoringAlert[];
  setScore: (score: ScoreInput) => void;
  nextShooter: () => void;
  prevShooter: () => void;
  setSquadFilter: (squad: number | null) => void;
  setActiveStageId: (stageId: string | null) => void;
  fetchScoringProgress: (matchId: string) => Promise<void>;
  /** Get registrations filtered by the current squad filter */
  filteredRegistrations: () => RegistrationWithShooter[];
  /** Get sorted list of unique squad numbers from current registrations */
  availableSquads: () => number[];
  /** Get set of registration IDs that have been scored on the current stage */
  scoredIds: () => Set<string>;
}

export const useScoringStore = create<ScoringState & ScoringActions>((set, get) => ({
  registrations: [],
  currentRegistrationId: null,
  currentScore: null,
  alerts: [],
  saving: false,
  loading: false,
  error: null,
  squadFilter: null,
  activeStageId: null,
  scoringProgress: null,

  fetchRegistrations: async (matchId) => {
    set({ loading: true, error: null });
    try {
      const regs = await api.getRegistrations(matchId);
      set({ registrations: regs, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  selectShooter: (registrationId) => {
    set({ currentRegistrationId: registrationId, alerts: [] });
  },

  loadScore: async (matchId, stageId, registrationId) => {
    try {
      const result = await api.getShooterScore(matchId, stageId, registrationId);
      set({
        currentScore: {
          time: result.time,
          targets: (result.targets || []).map((t: any) => ({
            ...t,
            target_data: t.target_data || {},
          })),
          procedural_count: result.procedural_count,
          ftsa_count: result.ftsa_count,
          extra_shot_count: result.extra_shot_count,
          extra_hit_count: result.extra_hit_count,
          stacking_count: result.stacking_count,
          overtime_shot_count: result.overtime_shot_count,
          is_dnf: result.is_dnf,
          chrono: result.chrono,
          score_data: result.score_data || {},
        },
      });
    } catch {
      // No score yet — init empty
      set({ currentScore: null });
    }
  },

  saveScore: async (matchId, stageId, registrationId, data) => {
    set({ saving: true, error: null });
    try {
      await api.saveScore(matchId, stageId, registrationId, data);
      set({ saving: false });
    } catch (err: any) {
      set({ error: err.message, saving: false });
      throw err;
    }
  },

  validateScore: (stage, score) => {
    const alerts: ScoringAlert[] = [];
    const scoringType = stage.scoring_type;
    const config = stage.config || {};

    // Zone-per-target types (IPSC, IDPA, Hit Factor)
    const zoneTypes = ['comstock', 'virginia', 'fixed_time', 'hit_factor', 'idpa'];
    if (zoneTypes.includes(scoringType)) {
      const totalHits = score.targets.reduce((sum, t) => {
        if (t.target_type === 'paper') return sum + t.alpha + t.charlie + t.delta + t.miss;
        return sum;
      }, 0);

      if (totalHits < stage.min_rounds) {
        alerts.push({ type: 'warning', message: `Only ${totalHits} hits entered, but minimum is ${stage.min_rounds}` });
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

    set({ squadFilter: squad, currentRegistrationId: newRegId, alerts: [] });
  },

  setActiveStageId: (stageId) => {
    set({ activeStageId: stageId });
  },

  fetchScoringProgress: async (matchId) => {
    try {
      const progress = await api.getScoringProgress(matchId);
      set({ scoringProgress: progress });
    } catch (err: any) {
      // Non-critical: scoring progress is purely visual
      console.error('Failed to fetch scoring progress:', err.message);
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
}));