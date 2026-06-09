import { create } from 'zustand';
import { api } from '../services/api';

interface AuthState {
  /** Whether the user is authenticated (has a valid token) */
  isAuthenticated: boolean;
  /** Whether the user is an admin (authenticated with admin password) */
  isAdmin: boolean;
  /** Admin session token */
  adminToken: string | null;
  /** The stage session token for remote scorers */
  stageToken: string | null;
  /** The stage ID the remote scorer is authenticated for */
  authenticatedStageId: string | null;
  /** The stage name the remote scorer is authenticated for */
  authenticatedStageName: string | null;
  /** The match ID the remote scorer is authenticated for */
  authenticatedMatchId: string | null;
  /** Whether the client is on the local network (for UI routing) */
  isLocalNetwork: boolean;
  /** Domain mode based on hostname: 'results' (vysledky.local), 'scoring' (hodnotenie.local), or 'admin' (default) */
  domainMode: 'results' | 'scoring' | 'admin';
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;

  /** Log in as admin with password */
  adminLogin: (password: string) => Promise<boolean>;
  /** Log out the admin */
  adminLogout: () => void;
  /** Log in as a remote scorer for a specific stage */
  login: (stageId: string, password: string) => Promise<boolean>;
  /** Log out the remote scorer */
  logout: () => void;
  /** Check if the user can edit scores for a specific stage */
  canEditStage: (stageId: string) => boolean;
  /** Restore session from localStorage */
  restoreSession: () => Promise<void>;
  /** Check if client is on local network (for UI routing) */
  checkLocalNetwork: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isAdmin: false,
  adminToken: null,
  stageToken: null,
  authenticatedStageId: null,
  authenticatedStageName: null,
  authenticatedMatchId: null,
  isLocalNetwork: false,
  domainMode: 'admin',
  loading: false,
  error: null,

  adminLogin: async (password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.auth.adminLogin(password);
      if (response.error) {
        set({ loading: false, error: response.error });
        return false;
      }

      const { token } = response;
      set({
        isAuthenticated: true,
        isAdmin: true,
        adminToken: token,
        loading: false,
        error: null,
      });

      // Persist to localStorage
      localStorage.setItem('admin_token', token);
      localStorage.setItem('auth_role', 'admin');

      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Login failed' });
      return false;
    }
  },

  adminLogout: () => {
    const token = get().adminToken;
    if (token) {
      api.auth.adminLogout(token).catch(() => {});
    }

    set({
      isAuthenticated: false,
      isAdmin: false,
      adminToken: null,
      error: null,
    });

    localStorage.removeItem('admin_token');
    localStorage.removeItem('auth_role');
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
      localStorage.setItem('auth_role', 'scorer');

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
    localStorage.removeItem('auth_role');
  },

  canEditStage: (stageId: string) => {
    const { isAdmin, authenticatedStageId } = get();
    if (isAdmin) return true;
    return authenticatedStageId === stageId;
  },

  restoreSession: async () => {
    const role = localStorage.getItem('auth_role');

    if (role === 'admin') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        // Validate the admin token with the server
        try {
          const me = await api.auth.getMe(`Bearer ${token}`);
          if (me.role === 'admin') {
            set({
              isAuthenticated: true,
              isAdmin: true,
              adminToken: token,
            });
            get().checkLocalNetwork();
            return;
          }
        } catch {
          // Token invalid, clear it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('auth_role');
        }
      }
    } else if (role === 'scorer') {
      const token = localStorage.getItem('auth_token');
      const stageId = localStorage.getItem('auth_stage_id');
      const stageName = localStorage.getItem('auth_stage_name');
      const matchId = localStorage.getItem('auth_match_id');

      if (token && stageId) {
        // Validate the scorer token with the server
        try {
          const me = await api.auth.getMe(`Bearer ${token}`);
          if (me.role === 'scorer') {
            set({
              isAuthenticated: true,
              stageToken: token,
              authenticatedStageId: me.stageId || stageId,
              authenticatedStageName: me.stageName || stageName,
              authenticatedMatchId: me.matchId || matchId,
            });
            get().checkLocalNetwork();
            return;
          }
        } catch {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_stage_id');
          localStorage.removeItem('auth_stage_name');
          localStorage.removeItem('auth_match_id');
          localStorage.removeItem('auth_role');
        }
      }
    }

    // Not authenticated — check if on local network for UI routing
    get().checkLocalNetwork();
  },

  checkLocalNetwork: () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    // Determine domain mode from server-injected global or hostname
    let domainMode: 'results' | 'scoring' | 'admin' = 'admin';
    if (typeof window !== 'undefined' && window.__DOMAIN_MODE__) {
      domainMode = window.__DOMAIN_MODE__;
    } else if (hostname === 'vysledky.local' || hostname.endsWith('.vysledky.local')) {
      domainMode = 'results';
    } else if (hostname === 'hodnotenie.local' || hostname.endsWith('.hodnotenie.local')) {
      domainMode = 'scoring';
    }

    // Domain mode overrides local network detection:
    // - vysledky.local → public results, never show admin login
    // - hodnotenie.local → scoring login, never show admin login
    // - anything else → existing logic (admin on local, scoring on remote)
    const isLocal = isElectron || isLocalNetworkHostname(hostname);

    set({ isLocalNetwork: isLocal, domainMode });
  },
}));

/**
 * Check if a hostname corresponds to a local/trusted network address.
 * Used only for UI routing (deciding which login form to show).
 * Admin auth is password-based, not IP-based.
 */
function isLocalNetworkHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname === 'host.docker.internal') return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}