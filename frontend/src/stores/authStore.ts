import { create } from 'zustand';
import { api } from '../services/api';

interface AuthState {
  /** Whether the user is authenticated (has a valid token) */
  isAuthenticated: boolean;
  /** Whether the user is an admin (running locally/Electron) */
  isAdmin: boolean;
  /** The stage session token for remote scorers */
  stageToken: string | null;
  /** The stage ID the remote scorer is authenticated for */
  authenticatedStageId: string | null;
  /** The stage name the remote scorer is authenticated for */
  authenticatedStageName: string | null;
  /** The match ID the remote scorer is authenticated for */
  authenticatedMatchId: string | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;

  /** Check if running as admin (localhost or Electron) */
  checkAdmin: () => void;
  /** Log in as a remote scorer for a specific stage */
  login: (stageId: string, password: string) => Promise<boolean>;
  /** Log out the remote scorer */
  logout: () => void;
  /** Check if the user can edit scores for a specific stage */
  canEditStage: (stageId: string) => boolean;
  /** Restore session from localStorage */
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isAdmin: false,
  stageToken: null,
  authenticatedStageId: null,
  authenticatedStageName: null,
  authenticatedMatchId: null,
  loading: false,
  error: null,

  checkAdmin: () => {
    // Admin = running in Electron or on localhost
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isElectron || isLocalhost) {
      set({ isAdmin: true, isAuthenticated: true });
    }
  },

  login: async (stageId: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.auth.stageLogin(stageId, password);
      if (response.error) {
        set({ loading: false, error: response.error });
        return false;
      }

      const { token, stageId: authStageId, stageName, matchId } = response;
      set({
        isAuthenticated: true,
        stageToken: token,
        authenticatedStageId: authStageId,
        authenticatedStageName: stageName,
        authenticatedMatchId: matchId,
        loading: false,
        error: null,
      });

      // Persist to localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_stage_id', authStageId);
      localStorage.setItem('auth_stage_name', stageName);
      localStorage.setItem('auth_match_id', matchId);

      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Login failed' });
      return false;
    }
  },

  logout: () => {
    // Try to invalidate the token on the server
    const token = get().stageToken;
    if (token) {
      api.auth.logout(token).catch(() => {});
    }

    set({
      isAuthenticated: false,
      stageToken: null,
      authenticatedStageId: null,
      authenticatedStageName: null,
      authenticatedMatchId: null,
      error: null,
    });

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_stage_id');
    localStorage.removeItem('auth_stage_name');
    localStorage.removeItem('auth_match_id');
  },

  canEditStage: (stageId: string) => {
    const { isAdmin, authenticatedStageId } = get();
    if (isAdmin) return true;
    return authenticatedStageId === stageId;
  },

  restoreSession: () => {
    const token = localStorage.getItem('auth_token');
    const stageId = localStorage.getItem('auth_stage_id');
    const stageName = localStorage.getItem('auth_stage_name');
    const matchId = localStorage.getItem('auth_match_id');

    if (token && stageId) {
      set({
        isAuthenticated: true,
        stageToken: token,
        authenticatedStageId: stageId,
        authenticatedStageName: stageName,
        authenticatedMatchId: matchId,
      });
    }

    // Also check admin status
    get().checkAdmin();
  },
}));