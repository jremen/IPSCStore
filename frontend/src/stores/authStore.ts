import { create } from 'zustand';
import { api } from '../services/api';
import { isBackendReachable, isNetworkError } from '../services/connectivity';
import { saveAuthSession, getAuthSession, clearAuthSession } from '../services/offlineDB';
import { generateDeviceId } from '../utils/deviceId';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminToken: string | null;
  scorerSessionToken: string | null;
  authenticatedMatchId: string | null;
  trustToken: string | null;
  deviceId: string | null;
  pendingApproval: boolean;
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
  restoreFromIDB: () => Promise<boolean>;
  checkLocalNetwork: () => void;
}

const TRUST_KEY = 'auth_trust_token';
const SESSION_KEY = 'auth_scorer_token';
const MATCH_KEY = 'auth_match_id';
const ADMIN_KEY = 'admin_token';
const ROLE_KEY = 'auth_role';
export const DEVICE_ID_KEY = 'scorer_device_id';

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function clearScorerLocalStorage() {
  localStorage.removeItem(TRUST_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(MATCH_KEY);
  localStorage.removeItem(ROLE_KEY);
  clearAuthSession().catch(() => {});
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isAdmin: false,
  adminToken: null,
  scorerSessionToken: null,
  authenticatedMatchId: null,
  trustToken: null,
  deviceId: null,
  pendingApproval: false,
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

      saveAuthSession({ sessionToken: token, trustToken: '', matchId: '', role: 'admin', adminToken: token }).catch(() => {});

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
    set({ loading: true, error: null, pendingApproval: false });
    try {
      const deviceLabel = navigator.userAgent;
      const deviceId = getOrCreateDeviceId();
      const response = await api.auth.redeemScorerTrust(trustToken, deviceLabel, deviceId);

      if (response.error) {
        set({ loading: false, error: response.error });
        return false;
      }

      if (response.pending) {
        set({
          deviceId,
          pendingApproval: true,
          authenticatedMatchId: response.matchId,
          trustToken,
          loading: false,
          error: null,
        });
        localStorage.setItem(TRUST_KEY, trustToken);
        localStorage.setItem(MATCH_KEY, response.matchId);
        return false;
      }

      const { sessionToken, matchId } = response;
      set({
        isAuthenticated: true,
        scorerSessionToken: sessionToken,
        authenticatedMatchId: matchId,
        trustToken,
        deviceId,
        pendingApproval: false,
        loading: false,
        error: null,
      });

      localStorage.setItem(TRUST_KEY, trustToken);
      localStorage.setItem(SESSION_KEY, sessionToken);
      localStorage.setItem(MATCH_KEY, matchId);
      localStorage.setItem(ROLE_KEY, 'scorer');

      saveAuthSession({ sessionToken, trustToken, matchId, deviceId, role: 'scorer' }).catch(() => {});

      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Trust token redemption failed' });
      return false;
    }
  },

  revalidateTrust: async () => {
    const trustToken = localStorage.getItem(TRUST_KEY);
    const sessionToken = localStorage.getItem(SESSION_KEY);

    if (!sessionToken || !trustToken) {
      // localStorage empty — try IDB fallback
      const idbSession = await getAuthSession().catch(() => null);
      if (idbSession && idbSession.role === 'scorer' && idbSession.sessionToken && idbSession.trustToken) {
        // Hydrate from IDB
        localStorage.setItem(TRUST_KEY, idbSession.trustToken);
        localStorage.setItem(SESSION_KEY, idbSession.sessionToken);
        localStorage.setItem(MATCH_KEY, idbSession.matchId);
        localStorage.setItem(ROLE_KEY, 'scorer');
        if (idbSession.deviceId) {
          localStorage.setItem(DEVICE_ID_KEY, idbSession.deviceId);
        }
        set({
          isAuthenticated: true,
          scorerSessionToken: idbSession.sessionToken,
          authenticatedMatchId: idbSession.matchId,
          trustToken: idbSession.trustToken,
          deviceId: idbSession.deviceId || null,
          loading: false,
          error: null,
        });
        return true;
      }
      return false;
    }

    set({ loading: true, error: null });

    // If offline, trust localStorage (or IDB-mirrored state)
    if (!navigator.onLine || !(await isBackendReachable())) {
      const matchId = localStorage.getItem(MATCH_KEY);
      const deviceId = getOrCreateDeviceId();
      set({
        isAuthenticated: true,
        scorerSessionToken: sessionToken,
        authenticatedMatchId: matchId,
        trustToken,
        deviceId,
        loading: false,
        error: null,
      });
      return true;
    }

    // Revalidate session with server (requires BOTH tokens)
    try {
      const deviceId = getOrCreateDeviceId();
      const result = await api.auth.revalidateScorerSession(trustToken, sessionToken, deviceId);
      if (result.error) {
        clearScorerLocalStorage();
        set({ loading: false, error: 'Trust revoked. Please rescan the QR code.', trustToken: null, scorerSessionToken: null, authenticatedMatchId: null, isAuthenticated: false, pendingApproval: false });
        return false;
      }

      const newSessionToken = result.sessionToken || sessionToken;
      set({
        isAuthenticated: true,
        scorerSessionToken: newSessionToken,
        authenticatedMatchId: result.matchId,
        trustToken,
        deviceId,
        pendingApproval: false,
        loading: false,
        error: null,
      });

      if (result.sessionToken && result.sessionToken !== sessionToken) {
        localStorage.setItem(SESSION_KEY, result.sessionToken);
      }

      // Mirror to IDB
      saveAuthSession({ sessionToken: newSessionToken, trustToken, matchId: result.matchId, deviceId, role: 'scorer' }).catch(() => {});

      return true;
    } catch (err: any) {
      // Network error: trust local state, don't destroy session
      if (isNetworkError(err) || !navigator.onLine) {
        const matchId = localStorage.getItem(MATCH_KEY);
        const deviceId = getOrCreateDeviceId();
        set({
          isAuthenticated: true,
          scorerSessionToken: sessionToken,
          authenticatedMatchId: matchId,
          trustToken,
          deviceId,
          loading: false,
          error: null,
        });
        return true;
      }
      // Real server error (e.g. 401): clear session
      clearScorerLocalStorage();
      set({ loading: false, error: 'Trust revoked. Please rescan the QR code.', trustToken: null, scorerSessionToken: null, authenticatedMatchId: null, isAuthenticated: false, pendingApproval: false });
      return false;
    }
  },

  autoLogin: async () => {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    if (sessionToken) return false;

    set({ loading: true, error: null });
    try {
      const deviceId = getOrCreateDeviceId();
      const result = await api.auth.scorerAutoLogin(deviceId);
      if (result.error) {
        set({ loading: false, error: 'No active session found. Please scan the QR code in your camera app and return to this app.' });
        return false;
      }

      set({
        isAuthenticated: true,
        scorerSessionToken: result.sessionToken,
        authenticatedMatchId: result.matchId,
        deviceId,
        loading: false,
        error: null,
      });

      localStorage.setItem(SESSION_KEY, result.sessionToken);
      localStorage.setItem(MATCH_KEY, result.matchId);
      localStorage.setItem(ROLE_KEY, 'scorer');

      saveAuthSession({ sessionToken: result.sessionToken, trustToken: '', matchId: result.matchId, deviceId, role: 'scorer' }).catch(() => {});

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
      deviceId: null,
      pendingApproval: false,
      error: null,
    });
  },

  canEditStage: (_stageId: string) => {
    const { isAdmin } = get();
    return isAdmin;
  },

  restoreFromIDB: async () => {
    const idbSession = await getAuthSession().catch(() => null);
    if (!idbSession) return false;

    const { sessionToken, trustToken, matchId, role, adminToken, deviceId } = idbSession;

    if (role === 'admin' && adminToken) {
      localStorage.setItem(ADMIN_KEY, adminToken);
      localStorage.setItem(ROLE_KEY, 'admin');
      set({
        isAuthenticated: true,
        isAdmin: true,
        adminToken,
      });
      get().checkLocalNetwork();
      return true;
    }

    if (role === 'scorer' && sessionToken) {
      localStorage.setItem(TRUST_KEY, trustToken);
      localStorage.setItem(SESSION_KEY, sessionToken);
      localStorage.setItem(MATCH_KEY, matchId);
      localStorage.setItem(ROLE_KEY, 'scorer');
      if (deviceId) {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      set({
        isAuthenticated: true,
        scorerSessionToken: sessionToken,
        authenticatedMatchId: matchId,
        trustToken,
        deviceId: deviceId || null,
      });
      get().checkLocalNetwork();
      return true;
    }

    return false;
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

    // localStorage empty — try IDB fallback (iOS PWA may have wiped localStorage)
    const idbOk = await get().restoreFromIDB();
    if (idbOk) {
      get().checkLocalNetwork();
      return;
    }

    // Last resort: cookie-based autoLogin (requires network)
    const ok = await get().autoLogin();
    get().checkLocalNetwork();
    if (ok) return;
  },

  checkLocalNetwork: () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';

    let domainMode: 'results' | 'scoring' | 'squads' | 'admin' = 'admin';
    if (pathname.startsWith('/results')) {
      domainMode = 'results';
    } else if (pathname.startsWith('/scoring')) {
      domainMode = 'scoring';
    } else if (pathname.startsWith('/squads')) {
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
