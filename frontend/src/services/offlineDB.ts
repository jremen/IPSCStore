/**
 * IndexedDB data layer for offline scoring support.
 *
 * Stores stages, registrations, scoring progress, individual scores,
 * and a pending-saves queue for writes that happen while offline.
 */
import type { RegistrationWithShooter, ScoringProgress } from '../types/scoring';
import type { Stage } from '../types/stage';

const DB_NAME = 'ipscscore-offline';
const DB_VERSION = 2;

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

// ── Database ───────────────────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Stages store
      if (!db.objectStoreNames.contains('stages')) {
        const stagesStore = db.createObjectStore('stages', { keyPath: 'id' });
        stagesStore.createIndex('by_matchId', 'match_id');
      }

      // Registrations store
      if (!db.objectStoreNames.contains('registrations')) {
        const regsStore = db.createObjectStore('registrations', { keyPath: 'id' });
        regsStore.createIndex('by_matchId', 'match_id');
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
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });
}

/** Convenience: get a transaction + object store */
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ db: IDBDatabase; store: IDBObjectStore; tx: IDBTransaction }> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { db, store, tx };
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
    store.put({ ...stage, _matchId: matchId });
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
    store.put({ ...reg, _matchId: matchId });
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