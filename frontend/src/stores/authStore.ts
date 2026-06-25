import { create } from 'zustand';
import { api } from '../services/api';
import { isBackendReachable } from '../services/connectivity';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminToken: string | null;
  scorerSessionToken: string | null;
  authenticatedMatchId: string | null;
  trustToken: string | null;
  isLocalNetwork: boolean;
  domainMode: 'results' | 'scoring' | 'squads' | 'admin';
  loading: boolean;
  error: string | null;

  adminLogin: (password: string) => Promise<boolean>;
  adminLogout: () => void;
  loginWithTrustToken: (trustToken: string) => Promise<boolean>;
  revalidateTrust: () => Promise<boolean>;
  autoLogin: () => Promise<boolean>;
  logout: () => void;
  canEditStage: (_stageId: string) => boolean;
  restoreSession: () => Promise<void>;
  checkLocalNetwork: () => void;
}

const TRUST_KEY = 'auth_trust_token';
const SESSION_KEY = 'auth_scorer_token';
const MATCH_KEY = 'auth_match_id';
const ADMIN_KEY = 'admin_token';
const ROLE_KEY = 'auth_role';

function clearScorerLocalStorage() {
  localStorage.removeItem(TRUST_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(MATCH_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isAdmin: false,
  adminToken: null,
  scorerSessionToken: null,
  authenticatedMatchId: null,
  trustToken: null,
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

      localStorage.setItem(ADMIN_KEY, token);
      localStorage.setItem(ROLE_KEY, 'admin');

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

    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(ROLE_KEY);
  },

  loginWithTrustToken: async (trustToken: string) => {
    set({ loading: true, error: null });
    try {
      const deviceLabel = navigator.userAgent;
      const response = await api.auth.redeemScorerTrust(trustToken, deviceLabel);

      if (response.error) {
        set({ loading: false, error: response.error });
        return false;
      }

      const { sessionToken, matchId } = response;
      set({
        isAuthenticated: true,
        scorerSessionToken: sessionToken,
        authenticatedMatchId: matchId,
        trustToken,
        loading: false,
        error: null,
      });

      localStorage.setItem(TRUST_KEY, trustToken);
      localStorage.setItem(SESSION_KEY, sessionToken);
      localStorage.setItem(MATCH_KEY, matchId);
      localStorage.setItem(ROLE_KEY, 'scorer');

      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Trust token redemption failed' });
      return false;
    }
  },

  revalidateTrust: async () => {
    const trustToken = localStorage.getItem(TRUST_KEY);
    const sessionToken = localStorage.getItem(SESSION_KEY);

    if (!sessionToken || !trustToken) return false;

    set({ loading: true, error: null });

    // If offline, trust localStorage
    if (!navigator.onLine || !(await isBackendReachable())) {
      const matchId = localStorage.getItem(MATCH_KEY);
      set({
        isAuthenticated: true,
        scorerSessionToken: sessionToken,
        authenticatedMatchId: matchId,
        trustToken,
        loading: false,
        error: null,
      });
      return true;
    }

    // Revalidate session with server (requires BOTH tokens)
    try {
      const result = await api.auth.revalidateScorerSession(trustToken, sessionToken);
      if (result.error) {
        clearScorerLocalStorage();
        set({ loading: false, error: 'Trust revoked. Please rescan the QR code.', trustToken: null, scorerSessionToken: null, authenticatedMatchId: null, isAuthenticated: false });
        return false;
      }

      set({
        isAuthenticated: true,
        scorerSessionToken: result.sessionToken || sessionToken,
        authenticatedMatchId: result.matchId,
        trustToken,
        loading: false,
        error: null,
      });

      if (result.sessionToken && result.sessionToken !== sessionToken) {
        localStorage.setItem(SESSION_KEY, result.sessionToken);
      }

      return true;
    } catch {
      clearScorerLocalStorage();
      set({ loading: false, error: 'Trust revoked. Please rescan the QR code.', trustToken: null, scorerSessionToken: null, authenticatedMatchId: null, isAuthenticated: false });
      return false;
    }
  },

  autoLogin: async () => {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    if (sessionToken) return false;

    set({ loading: true, error: null });
    try {
      const result = await api.auth.scorerAutoLogin();
      if (result.error) {
        set({ loading: false, error: 'No active session found. Please scan the QR code in your camera app and return to this app.' });
        return false;
      }

      set({
        isAuthenticated: true,
        scorerSessionToken: result.sessionToken,
        authenticatedMatchId: result.matchId,
        loading: false,
        error: null,
      });

      localStorage.setItem(SESSION_KEY, result.sessionToken);
      localStorage.setItem(MATCH_KEY, result.matchId);
      localStorage.setItem(ROLE_KEY, 'scorer');
      return true;
    } catch {
      set({ loading: false, error: 'Could not reach the server. Please check your connection and try again.' });
      return false;
    }
  },

  logout: () => {
    const sessionToken = get().scorerSessionToken;
    if (sessionToken) {
      api.auth.scorerLogout(sessionToken).catch(() => {});
    }

    clearScorerLocalStorage();
    set({
      isAuthenticated: false,
      scorerSessionToken: null,
      authenticatedMatchId: null,
      trustToken: null,
      error: null,
    });
  },

  canEditStage: (_stageId: string) => {
    const { isAdmin } = get();
    return isAdmin;
  },

  restoreSession: async () => {
    const role = localStorage.getItem(ROLE_KEY);

    if (role === 'admin') {
      const token = localStorage.getItem(ADMIN_KEY);
      if (token) {
        if (!navigator.onLine || !(await isBackendReachable())) {
          set({ isAuthenticated: true, isAdmin: true, adminToken: token });
          get().checkLocalNetwork();
          return;
        }

        try {
          const me = await api.auth.getMe(`Bearer ${token}`);
          if (me.role === 'admin') {
            set({ isAuthenticated: true, isAdmin: true, adminToken: token });
            get().checkLocalNetwork();
            return;
          }
        } catch {
          localStorage.removeItem(ADMIN_KEY);
          localStorage.removeItem(ROLE_KEY);
        }
      }
    } else if (role === 'scorer') {
      const sessionToken = localStorage.getItem(SESSION_KEY);
      const trustToken = localStorage.getItem(TRUST_KEY);
      if (sessionToken && trustToken) {
        const ok = await get().revalidateTrust();
        if (ok) {
          get().checkLocalNetwork();
          return;
        }
      }
    }

    const ok = await get().autoLogin();
    get().checkLocalNetwork();
    if (ok) return;
  },

  checkLocalNetwork: () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

    let domainMode: 'results' | 'scoring' | 'squads' | 'admin' = 'admin';
    if (hostname === 'vysledky.local' || hostname.endsWith('.vysledky.local') || pathname.startsWith('/vysledky')) {
      domainMode = 'results';
    } else if (hostname === 'hodnotenie.local' || hostname.endsWith('.hodnotenie.local') || pathname.startsWith('/hodnotenie')) {
      domainMode = 'scoring';
    } else if (hostname === 'squads.local' || hostname.endsWith('.squads.local') || pathname.startsWith('/squads')) {
      domainMode = 'squads';
    }

    const isLocal = isElectron || isLocalNetworkHostname(hostname);
    set({ isLocalNetwork: isLocal, domainMode });
  },
}));

function isLocalNetworkHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname === 'host.docker.internal') return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}
