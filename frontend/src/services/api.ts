import type { ScoringProgress } from '../types/scoring';
import { FETCH_TIMEOUT_MS } from './connectivity';

// Use empty string so all API calls go to same origin — Vite dev proxy forwards /api/* to backend
// In production, serve frontend from backend or set VITE_API_URL to the backend URL
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.electronAPI?.getApiBaseUrl) {
    return window.electronAPI.getApiBaseUrl();
  }
  return import.meta.env.VITE_API_URL || '';
}

const API_BASE = getApiBase();

/** Get the auth token from localStorage — prefer admin token over scorer token */
export function getAuthToken(): string | null {
  const role = localStorage.getItem('auth_role');
  if (role === 'admin') {
    return localStorage.getItem('admin_token');
  }
  return localStorage.getItem('auth_token');
}

/** Build headers with optional auth token */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(),
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers, ...options, signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.blob();
  } finally {
    clearTimeout(timer);
  }
}

async function requestText(path: string, options?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers, ...options, signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function uploadFile<T>(path: string, file: File, fieldName: string = 'file'): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: form, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadImage(path: string, file: File): Promise<{ image_path: string }> {
  const form = new FormData();
  form.append('image', file);
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: form, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Matches
export const api = {
  // Auth
  auth: {
    adminLogin: async (password: string): Promise<{ token: string; role: string; error?: string }> => {
      try {
        return await request('/api/auth/admin-login', {
          method: 'POST',
          body: JSON.stringify({ password }),
        });
      } catch (err: any) {
        return { error: err.message, token: '', role: '' };
      }
    },
    adminLogout: async (token: string) => {
      try {
        return await request('/api/auth/admin-logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {
        return { success: true };
      }
    },
    changeAdminPassword: async (currentPassword: string, newPassword: string, adminToken: string): Promise<{ success: boolean; error?: string }> => {
      try {
        return await request('/api/auth/admin-password', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    getAdminPasswordStatus: async (): Promise<{ hasPassword: boolean }> => {
      return request('/api/auth/admin-password-status');
    },
    stageLogin: async (stageId: string, password: string): Promise<{ token: string; stageId: string; stageName: string; matchId: string; error?: string }> => {
      try {
        return await request('/api/auth/stage-login', {
          method: 'POST',
          body: JSON.stringify({ stageId, password }),
        });
      } catch (err: any) {
        return { error: err.message, token: '', stageId: '', stageName: '', matchId: '' };
      }
    },
    getStages: (matchId?: string) => {
      const qs = matchId ? `?matchId=${matchId}` : '';
      return request<any[]>(`/api/auth/stages${qs}`);
    },
    getMe: async (authHeader?: string): Promise<{ role: string; stageId?: string; stageName?: string; isLocalNetwork: boolean; matchId?: string }> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    logout: async (token: string) => {
      try {
        return await request('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {
        return { success: true };
      }
    },
  },

  // Matches
  getMatches: () => request<any[]>('/api/matches'),
  getMatch: (id: string) => request<any>(`/api/matches/${id}`),
  getCurrentMatch: () => request<any | null>('/api/matches/current'),
  setCurrentMatch: (id: string) => request<any>(`/api/matches/${id}/set-current`, { method: 'PUT' }),
  unsetCurrentMatch: () => request<any>('/api/matches/unset-current', { method: 'PUT' }),
  createMatch: (data: any) => request<any>('/api/matches', { method: 'POST', body: JSON.stringify(data) }),
  updateMatch: (id: string, data: any) => request<any>(`/api/matches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMatch: (id: string) => request<any>(`/api/matches/${id}`, { method: 'DELETE' }),

  // Match Export/Import
  exportMatch: (id: string): Promise<Blob> => requestBlob(`/api/matches/${id}/export`),
  importMatch: async (file: File): Promise<{ success: boolean; match_id: string; counts: any }> => {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/matches/import`, { method: 'POST', body: form, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Stages
  getStages: (matchId: string) => request<any[]>(`/api/matches/${matchId}/stages`),
  getStage: (id: string) => request<any>(`/api/stages/${id}`),
  createStage: (matchId: string, data: any) => request<any>(`/api/matches/${matchId}/stages`, { method: 'POST', body: JSON.stringify(data) }),
  updateStage: (id: string, data: any) => request<any>(`/api/stages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStage: (id: string) => request<any>(`/api/stages/${id}`, { method: 'DELETE' }),
  uploadStageImage: (stageId: string, file: File) => uploadImage(`/api/stages/${stageId}/image`, file),
  deleteStageImage: (stageId: string) => request<any>(`/api/stages/${stageId}/image`, { method: 'DELETE' }),

  // Shooters
  getShooters: (params?: { search?: string; limit?: number; offset?: number; include_deleted?: boolean; deleted_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.include_deleted) qs.set('include_deleted', 'true');
    if (params?.deleted_only) qs.set('deleted_only', 'true');
    return request<any>(`/api/shooters?${qs.toString()}`);
  },
  getShooter: (id: string) => request<any>(`/api/shooters/${id}`),
  getShooterMatches: (id: string) => request<any[]>(`/api/shooters/${id}/matches`),
  createShooter: (data: any) => request<any>('/api/shooters', { method: 'POST', body: JSON.stringify(data) }),
  updateShooter: (id: string, data: any) => request<any>(`/api/shooters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShooter: (id: string) => request<any>(`/api/shooters/${id}`, { method: 'DELETE' }),
  restoreShooter: (id: string) => request<any>(`/api/shooters/${id}/restore`, { method: 'POST' }),

  // Bulk shooter operations
  bulkUpdateShooters: (shooterIds: string[], updates: { division?: string; category?: string; power_factor?: string; tag?: string | null }) =>
    request<{ updated: number; failed: Array<{ id: string; reason: string }> }>('/api/shooters/bulk', { method: 'PUT', body: JSON.stringify({ shooterIds, updates }) }),
  bulkDeleteShooters: (shooterIds: string[]) =>
    request<{ deleted: number; failed: Array<{ id: string; name: string; reason: string }> }>('/api/shooters/bulk', { method: 'DELETE', body: JSON.stringify({ shooterIds }) }),

  // Registration groups
  createGroup: (matchId: string, registrationIds: string[]) =>
    request<{ group_id: string }>(`/api/matches/${matchId}/registrations/group`, { method: 'POST', body: JSON.stringify({ registrationIds }) }),
  addToGroup: (matchId: string, groupId: string, registrationIds: string[]) =>
    request<void>(`/api/matches/${matchId}/registrations/group/${groupId}/add`, { method: 'PUT', body: JSON.stringify({ registrationIds }) }),
  ungroupAll: (matchId: string, groupId: string) =>
    request<void>(`/api/matches/${matchId}/registrations/group/${groupId}`, { method: 'DELETE' }),
  ungroupRegistration: (matchId: string, registrationId: string) =>
    request<void>(`/api/matches/${matchId}/registrations/${registrationId}/group`, { method: 'DELETE' }),

  // Bulk registration operations
  bulkUpdateRegistrations: (matchId: string, registrationIds: string[], updates: { division?: string; category?: string; power_factor?: string; tag?: string | null; squad?: number | null }) =>
    request<{ updated: number; failed: Array<{ id: string; name: string; reason: string }> }>(`/api/matches/${matchId}/registrations/bulk`, { method: 'PUT', body: JSON.stringify({ registrationIds, updates }) }),
  bulkRemoveRegistrations: (matchId: string, registrationIds: string[]) =>
    request<{ removed: number; failed: Array<{ id: string; name: string; reason: string }> }>(`/api/matches/${matchId}/registrations/bulk`, { method: 'DELETE', body: JSON.stringify({ registrationIds }) }),
  getTags: () => request<string[]>('/api/shooters/tags'),

  // Registrations
  getRegistrations: (matchId: string) => request<any[]>(`/api/matches/${matchId}/registrations`),
  registerShooters: (matchId: string, data: any) => request<any[]>(`/api/matches/${matchId}/registrations`, { method: 'POST', body: JSON.stringify(data) }),
  createAndAddShooter: (matchId: string, data: any) => request<any>(`/api/matches/${matchId}/registrations/create-and-add`, { method: 'POST', body: JSON.stringify(data) }),
  updateRegistration: (matchId: string, id: string, data: any) => request<any>(`/api/matches/${matchId}/registrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeRegistration: (matchId: string, id: string) => request<any>(`/api/matches/${matchId}/registrations/${id}`, { method: 'DELETE' }),
  getSquads: (matchId: string) => request<any>(`/api/matches/${matchId}/squads`),
  dqShooter: (matchId: string, id: string, reason: string) => request<any>(`/api/matches/${matchId}/registrations/${id}/dq`, { method: 'PUT', body: JSON.stringify({ dq_reason: reason }) }),
  undqShooter: (matchId: string, id: string) => request<any>(`/api/matches/${matchId}/registrations/${id}/undq`, { method: 'PUT' }),

  // Scoring
  getScoringProgress: (matchId: string) => request<ScoringProgress>(`/api/matches/${matchId}/scoring-progress`),
  getStageScores: (matchId: string, stageId: string) => request<any[]>(`/api/matches/${matchId}/stages/${stageId}/scores`),
  getShooterScore: (matchId: string, stageId: string, registrationId: string) =>
    request<any>(`/api/matches/${matchId}/stages/${stageId}/scores/${registrationId}`),
  saveScore: (matchId: string, stageId: string, registrationId: string, data: any) =>
    request<any>(`/api/matches/${matchId}/stages/${stageId}/scores/${registrationId}`, { method: 'PUT', body: JSON.stringify(data) }),
  recalculateStage: (matchId: string, stageId: string) =>
    request<any>(`/api/matches/${matchId}/stages/${stageId}/recalculate`, { method: 'POST' }),
  recalculateMatch: (matchId: string) =>
    request<any>(`/api/matches/${matchId}/recalculate`, { method: 'POST' }),

  // Results
  getOverallResults: (matchId: string) => request<any>(`/api/matches/${matchId}/results/overall`),
  getDivisionResults: (matchId: string) => request<any>(`/api/matches/${matchId}/results/divisions`),
  getStageResults: (matchId: string) => request<any>(`/api/matches/${matchId}/results/stages`),
  getSingleStageResults: (matchId: string, stageId: string) => request<any>(`/api/matches/${matchId}/results/stages/${stageId}`),
  getCategoryResults: (matchId: string) => request<any>(`/api/matches/${matchId}/results/categories`),
  getTagResults: (matchId: string) => request<any>(`/api/matches/${matchId}/results/tags`),
  getShooterStageSummaries: async (matchId: string, registrationId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/matches/${matchId}/shooters/${registrationId}/stage-summaries`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch stage summaries: ${res.statusText}`);
    return res.json();
  },
  exportRegistrationCSV: (matchId: string) => requestText(`/api/matches/${matchId}/registrations/export/csv`),

  // Import
  importShooters: (file: File, options?: { hasHeader?: boolean; columnMapping?: Record<string, string> }) => {
    const form = new FormData();
    form.append('file', file);
    if (options?.hasHeader !== undefined) form.append('hasHeader', String(options.hasHeader));
    if (options?.columnMapping) form.append('columnMapping', JSON.stringify(options.columnMapping));
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/import/shooters`, { method: 'POST', body: form, headers })
      .then(async (res) => { if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error || `HTTP ${res.status}`); return res.json(); });
  },
  importRegistrations: (matchId: string, file: File, options?: { hasHeader?: boolean; columnMapping?: Record<string, string> }) => {
    const form = new FormData();
    form.append('file', file);
    if (options?.hasHeader !== undefined) form.append('hasHeader', String(options.hasHeader));
    if (options?.columnMapping) form.append('columnMapping', JSON.stringify(options.columnMapping));
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/import/matches/${matchId}/registrations`, { method: 'POST', body: form, headers })
      .then(async (res) => { if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error || `HTTP ${res.status}`); return res.json(); });
  },
  importScores: (matchId: string, file: File, options?: { hasHeader?: boolean; columnMapping?: Record<string, string> }) => {
    const form = new FormData();
    form.append('file', file);
    if (options?.hasHeader !== undefined) form.append('hasHeader', String(options.hasHeader));
    if (options?.columnMapping) form.append('columnMapping', JSON.stringify(options.columnMapping));
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/import/matches/${matchId}/scores`, { method: 'POST', body: form, headers })
      .then(async (res) => { if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error || `HTTP ${res.status}`); return res.json(); });
  },

  // WinMSS Import
  importWinMSS: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/import/winmss`, { method: 'POST', body: form, headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      });
  },

  // WinMSS Inspect (debug — shows table/column structure)
  inspectWinMSS: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/import/winmss/inspect`, { method: 'POST', body: form, headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      });
  },

  // Database Backup & Restore
  exportBackup: (): Promise<Blob> => requestBlob('/api/backup', { method: 'POST' }),

  importBackup: async (file: File): Promise<{ success: boolean; message: string }> => {
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/restore`, { method: 'POST', body: form, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};