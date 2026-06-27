/**
 * IndexedDB data layer for offline scoring support.
 *
 * Stores stages, registrations, scoring progress, individual scores,
 * and a pending-saves queue for writes that happen while offline.
 */
import type { RegistrationWithShooter, ScoringProgress } from '../types/scoring';
import type { Stage } from '../types/stage';

const DB_NAME = 'ipscscore-offline';
const DB_VERSION = 4;

// ── Types ──────────────────────────────────────────────────────────────────

export interface PendingSave {
  id?: number;
  matchId: string;
  stageId: string;
  registrationId: string;
  endpoint: 'saveScore' | 'dqShooter' | 'undqShooter';
  payload: object;
  /** Auth token captured at save time for replay during sync */
  authToken: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface AuthSession {
  key: string; // always 'scorer'
  sessionToken: string;
  trustToken: string;
  matchId: string;
  role: 'scorer' | 'admin';
  adminToken?: string;
  savedAt: number;
}

// ── Database ───────────────────────────────────────────────────────────────

let dbReady: Promise<IDBDatabase> | null = null;
let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbReady) return dbReady;

  dbReady = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // v1→v2: fix index field name from 'match_id' to 'matchId'
      // v2→v3: same fix (idempotent)
      // The index field must match the key we write in cacheStages/cacheRegistrations.

      // Stages store
      if (!db.objectStoreNames.contains('stages')) {
        const s = db.createObjectStore('stages', { keyPath: 'id' });
        s.createIndex('by_matchId', 'matchId');
      } else if (oldVersion < 3) {
        // Migration: old stores used index on 'match_id', now use 'matchId'.
        // Delete and recreate the index to point at the correct field.
        try {
          const stagesStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('stages');
          if (stagesStore.indexNames.contains('by_matchId')) {
            stagesStore.deleteIndex('by_matchId');
          }
          stagesStore.createIndex('by_matchId', 'matchId');
        } catch {
          // If the upgrade transaction doesn't expose the store, recreate will
          // happen on the next version bump. Non-fatal for read-only cache.
        }
      }

      // Registrations store
      if (!db.objectStoreNames.contains('registrations')) {
        const s = db.createObjectStore('registrations', { keyPath: 'id' });
        s.createIndex('by_matchId', 'matchId');
      } else if (oldVersion < 3) {
        try {
          const regsStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('registrations');
          if (regsStore.indexNames.contains('by_matchId')) {
            regsStore.deleteIndex('by_matchId');
          }
          regsStore.createIndex('by_matchId', 'matchId');
        } catch {
          // Non-fatal.
        }
      }

      // Scoring progress store
      if (!db.objectStoreNames.contains('scoringProgress')) {
        const progressStore = db.createObjectStore('scoringProgress', {
          keyPath: ['matchId', 'stageId', 'registrationId'],
        });
        progressStore.createIndex('by_matchId', 'matchId');
      }

      // Scores store
      if (!db.objectStoreNames.contains('scores')) {
        const scoresStore = db.createObjectStore('scores', {
          keyPath: ['stageId', 'registrationId'],
        });
        scoresStore.createIndex('by_stageId', 'stageId');
        scoresStore.createIndex('by_matchId', 'matchId');
      }

      // Pending saves queue
      if (!db.objectStoreNames.contains('pendingSaves')) {
        const pendingStore = db.createObjectStore('pendingSaves', {
          keyPath: 'id',
          autoIncrement: true,
        });
        pendingStore.createIndex('by_status', 'status');
        pendingStore.createIndex('by_entity', [
          'matchId',
          'stageId',
          'registrationId',
          'endpoint',
        ]);
      }

      // Meta store (sync timestamps, etc.)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      // Offline session passwords (for re-authentication when back online)
      if (!db.objectStoreNames.contains('offlineSessions')) {
        const sessionsStore = db.createObjectStore('offlineSessions', { keyPath: 'stageId' });
        sessionsStore.createIndex('by_matchId', 'matchId');
      }

      // Matches cache (for offline match list)
      if (!db.objectStoreNames.contains('matches')) {
        const matchesStore = db.createObjectStore('matches', { keyPath: 'id' });
        matchesStore.createIndex('by_current', 'is_current');
      }

      // Auth session cache (survives iOS PWA localStorage wipes)
      if (!db.objectStoreNames.contains('authSession')) {
        db.createObjectStore('authSession', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // Handle versionchange from another tab — close and reset so the next
      // caller re-opens at the new version.
      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbReady = null;
      };

      dbInstance = db;
      resolve(db);
    };

    request.onerror = () => {
      dbReady = null;
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });

  return dbReady;
}

/** Convenience: get a transaction + object store */
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ db: IDBDatabase; store: IDBObjectStore; tx: IDBTransaction }> {
  const db = await openDB();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { db, store, tx };
  } catch (err: any) {
    // Connection was closed (versionchange) — reset and retry once
    if (err?.name === 'InvalidStateError') {
      dbInstance = null;
      dbReady = null;
      const db2 = await openDB();
      const tx = db2.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      return { db: db2, store, tx };
    }
    throw err;
  }
}

/** Wrap an IDB request in a promise */
function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Wait for a transaction to complete */
function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Stages ─────────────────────────────────────────────────────────────────

export async function cacheStages(matchId: string, stages: Stage[]): Promise<void> {
  const { store, tx } = await getStore('stages', 'readwrite');
  for (const stage of stages) {
    store.put({ ...stage, matchId });
  }
  await txComplete(tx);
}

export async function getCachedStages(matchId: string): Promise<Stage[]> {
  const { store } = await getStore('stages');
  const index = store.index('by_matchId');
  return promisify<any[]>(index.getAll(matchId));
}

export async function getCachedStageById(stageId: string): Promise<Stage | null> {
  const { store } = await getStore('stages');
  const result = await promisify<any>(store.get(stageId));
  return result ?? null;
}

// ── Registrations ──────────────────────────────────────────────────────────

export async function cacheRegistrations(matchId: string, registrations: RegistrationWithShooter[]): Promise<void> {
  const { store, tx } = await getStore('registrations', 'readwrite');
  for (const reg of registrations) {
    store.put({ ...reg, matchId });
  }
  await txComplete(tx);
}

export async function getCachedRegistrations(matchId: string): Promise<RegistrationWithShooter[]> {
  const { store } = await getStore('registrations');
  const index = store.index('by_matchId');
  return promisify<any[]>(index.getAll(matchId));
}

// ── Scoring Progress ───────────────────────────────────────────────────────

export async function cacheScoringProgress(matchId: string, progress: ScoringProgress): Promise<void> {
  const { store, tx } = await getStore('scoringProgress', 'readwrite');
  for (const entry of progress.scored) {
    store.put({
      matchId,
      stageId: entry.stage_id,
      registrationId: entry.registration_id,
      squad: entry.squad,
    });
  }
  await txComplete(tx);
}

/** Efficiently add a single scored entry to the IDB scoring progress store */
export async function addScoredEntryToIDB(
  matchId: string,
  stageId: string,
  registrationId: string,
  squad: number | null,
): Promise<void> {
  const { store, tx } = await getStore('scoringProgress', 'readwrite');
  store.put({ matchId, stageId, registrationId, squad });
  await txComplete(tx);
}

export async function getCachedScoringProgress(matchId: string): Promise<ScoringProgress | null> {
  const { store } = await getStore('scoringProgress');
  const index = store.index('by_matchId');
  const entries = await promisify<any[]>(index.getAll(matchId));
  if (entries.length === 0) return null;
  return {
    scored: entries.map((e) => ({
      stage_id: e.stageId,
      registration_id: e.registrationId,
      squad: e.squad,
    })),
  };
}

// ── Scores ─────────────────────────────────────────────────────────────────

export async function cacheScore(
  matchId: string,
  stageId: string,
  registrationId: string,
  score: any,
): Promise<void> {
  const { store, tx } = await getStore('scores', 'readwrite');
  store.put({
    ...score,
    matchId,
    stageId,
    registrationId,
  });
  await txComplete(tx);
}

export async function getCachedScore(
  matchId: string,
  stageId: string,
  registrationId: string,
): Promise<any | null> {
  const { store } = await getStore('scores');
  const request = store.get([stageId, registrationId]);
  const result = await promisify<any>(request);
  // Verify it belongs to the right match
  if (result && result.matchId === matchId) return result;
  return null;
}

// ── Matches cache ──────────────────────────────────────────────────────────

export async function cacheMatches(matches: any[]): Promise<void> {
  const { store, tx } = await getStore('matches', 'readwrite');
  for (const match of matches) {
    store.put(match);
  }
  await txComplete(tx);
}

export async function getCachedMatches(): Promise<any[]> {
  const { store } = await getStore('matches');
  return promisify<any[]>(store.getAll());
}

export async function getCachedCurrentMatch(): Promise<any | null> {
  const { store } = await getStore('matches');
  const index = store.index('by_current');
  const results = await promisify<any[]>(index.getAll(1));
  return results[0] ?? null;
}

// ── Pending Saves ──────────────────────────────────────────────────────────

/** Add a pending save, with dedup: replaces any existing pending save for the same entity+endpoint */
export async function addPendingSave(save: Omit<PendingSave, 'id'>): Promise<number> {
  const db = await openDB();
  const tx = db.transaction('pendingSaves', 'readwrite');
  const store = tx.objectStore('pendingSaves');

  // Check for existing pending save with same entity+endpoint
  const entityIndex = store.index('by_entity');
  const key = [save.matchId, save.stageId, save.registrationId, save.endpoint];
  const existing = await promisify<PendingSave | undefined>(entityIndex.get(key));

  if (existing) {
    // Replace with newer payload
    store.put({
      ...existing,
      payload: save.payload,
      authToken: save.authToken,
      createdAt: save.createdAt,
      status: 'pending' as const,
      retryCount: 0,
      lastError: undefined,
    });
    await txComplete(tx);
    return existing.id!;
  }

  // Add new
  const request = store.add(save);
  const id = await promisify<IDBValidKey>(request) as number;
  await txComplete(tx);
  return id;
}

export async function getPendingSaves(status?: PendingSave['status']): Promise<PendingSave[]> {
  const { store } = await getStore('pendingSaves');
  if (status) {
    const index = store.index('by_status');
    return promisify<PendingSave[]>(index.getAll(status));
  }
  return promisify<PendingSave[]>(store.getAll());
}

export async function updatePendingSave(id: number, updates: Partial<PendingSave>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pendingSaves', 'readwrite');
  const store = tx.objectStore('pendingSaves');
  const existing = await promisify<PendingSave>(store.get(id));
  if (existing) {
    store.put({ ...existing, ...updates });
  }
  await txComplete(tx);
}

export async function removePendingSave(id: number): Promise<void> {
  const { store, tx } = await getStore('pendingSaves', 'readwrite');
  store.delete(id);
  await txComplete(tx);
}

export async function getPendingCount(): Promise<number> {
  const { store } = await getStore('pendingSaves');
  return promisify<number>(store.count());
}

// ── Match data cleanup ─────────────────────────────────────────────────────

/** Delete all records in an object store that match an index value */
async function deleteByIndex(db: IDBDatabase, storeName: string, indexName: string, value: IDBValidKey): Promise<void> {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  const keys = await promisify<IDBValidKey[]>(index.getAllKeys(value));
  for (const key of keys) {
    store.delete(key as IDBValidKey);
  }
  await txComplete(tx);
}

/** Clear all cached data for a specific match */
export async function clearMatchData(matchId: string): Promise<void> {
  const db = await openDB();

  await deleteByIndex(db, 'stages', 'by_matchId', matchId);
  await deleteByIndex(db, 'registrations', 'by_matchId', matchId);
  await deleteByIndex(db, 'scoringProgress', 'by_matchId', matchId);
  await deleteByIndex(db, 'scores', 'by_matchId', matchId);
  await deleteByIndex(db, 'offlineSessions', 'by_matchId', matchId);
}

// ── Offline Sessions ────────────────────────────────────────────────────────

export async function saveOfflinePassword(stageId: string, matchId: string, password: string): Promise<void> {
  const { store, tx } = await getStore('offlineSessions', 'readwrite');
  store.put({ stageId, matchId, password, createdAt: Date.now() });
  await txComplete(tx);
}

export async function getOfflinePassword(stageId: string): Promise<string | null> {
  const { store } = await getStore('offlineSessions');
  const result = await promisify<any>(store.get(stageId));
  return result?.password ?? null;
}

export async function clearOfflinePassword(stageId: string): Promise<void> {
  const { store, tx } = await getStore('offlineSessions', 'readwrite');
  store.delete(stageId);
  await txComplete(tx);
}

export async function clearAllOfflinePasswords(): Promise<void> {
  const { store, tx } = await getStore('offlineSessions', 'readwrite');
  store.clear();
  await txComplete(tx);
}

// ── Auth Session Cache ─────────────────────────────────────────────────────

/**
 * Persist scorer/admin auth session to IndexedDB.
 * iOS PWAs may wipe localStorage under storage pressure; IndexedDB is
 * significantly more durable on the same platform.
 */
export async function saveAuthSession(session: Omit<AuthSession, 'key' | 'savedAt'>): Promise<void> {
  const { store, tx } = await getStore('authSession', 'readwrite');
  store.put({ ...session, key: 'scorer', savedAt: Date.now() });
  await txComplete(tx);
}

/**
 * Retrieve the last cached auth session from IndexedDB.
 * Returns null if no session was ever persisted.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const { store } = await getStore('authSession');
    const result = await promisify<AuthSession | undefined>(store.get('scorer'));
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Clear the cached auth session from IndexedDB (e.g. on logout or trust revoked).
 */
export async function clearAuthSession(): Promise<void> {
  try {
    const { store, tx } = await getStore('authSession', 'readwrite');
    store.delete('scorer');
    await txComplete(tx);
  } catch {
    // Non-critical — best-effort cleanup
  }
}

// ── Meta ───────────────────────────────────────────────────────────────────

export async function setMeta(key: string, value: any): Promise<void> {
  const { store, tx } = await getStore('meta', 'readwrite');
  store.put({ key, value });
  await txComplete(tx);
}

export async function getMeta(key: string): Promise<any> {
  const { store } = await getStore('meta');
  const result = await promisify<any>(store.get(key));
  return result?.value ?? null;
}
