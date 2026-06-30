/**
 * Sync manager for flushing pending offline saves back to the server.
 *
 * Uses the Background Sync API when available (Chrome/Edge),
 * and falls back to online event + periodic polling for Safari/others.
 */
import * as offlineDB from './offlineDB';
import { api } from './api';
import { isNetworkError } from './connectivity';
import { useScoringStore } from '../stores/scoringStore';
import type { PendingSave } from './offlineDB';

const MAX_RETRIES = 5;

/**
 * Flush all pending saves to the server, processing them sequentially
 * in creation order. Returns the number of successfully synced saves.
 */
export async function flushPendingSaves(): Promise<number> {
  const pending = await offlineDB.getPendingSaves('pending');
  if (pending.length === 0) return 0;

  // Sort by creation time (oldest first)
  pending.sort((a, b) => a.createdAt - b.createdAt);

  let synced = 0;

  for (const save of pending) {
    try {
      await offlineDB.updatePendingSave(save.id!, { status: 'syncing' });
    } catch {
      // If update fails (e.g., DB issue), skip this entry
      continue;
    }

    try {
      await syncSingleSave(save);
      await offlineDB.removePendingSave(save.id!);
      synced++;
    } catch (err: any) {
      const retryCount = save.retryCount + 1;

      if (isNetworkError(err)) {
        // Network error — stop processing, will retry later
        await offlineDB.updatePendingSave(save.id!, { status: 'pending', retryCount });
        break;
      } else if (err.message?.includes('HTTP 401') || err.message?.includes('Unauthorized')) {
        // Auth token expired — mark as failed
        await offlineDB.updatePendingSave(save.id!, {
          status: 'failed',
          retryCount,
          lastError: 'Session expired. Please log in again.',
        });
      } else if (retryCount >= MAX_RETRIES) {
        // Too many retries — mark as failed
        await offlineDB.updatePendingSave(save.id!, {
          status: 'failed',
          retryCount,
          lastError: err.message,
        });
      } else {
        // Server error — retry later
        await offlineDB.updatePendingSave(save.id!, {
          status: 'pending',
          retryCount,
          lastError: err.message,
        });
      }
    }
  }

  // Refresh the pending count in the scoring store
  await useScoringStore.getState().refreshPendingCount();

  // After successful sync, refresh scoring progress from server if online
  if (synced > 0 && navigator.onLine) {
    // Find the matchId from the last synced save
    const remaining = await offlineDB.getPendingSaves();
    const matchIdFromSave = remaining[0]?.matchId || pending[0]?.matchId;
    if (matchIdFromSave) {
      try {
        await useScoringStore.getState().fetchScoringProgress(matchIdFromSave);
      } catch {
        // Non-critical — progress will be stale until next refresh
      }
    }
  }

  return synced;
}

/** Replay a single pending save to the server */
async function syncSingleSave(save: PendingSave): Promise<void> {
  switch (save.endpoint) {
    case 'saveScore': {
      await replaySaveScore(save);
      break;
    }
    case 'dqShooter': {
      await replayDqShooter(save);
      break;
    }
    case 'undqShooter': {
      await replayUndqShooter(save);
      break;
    }
    default:
      throw new Error(`Unknown endpoint: ${save.endpoint}`);
  }
}

async function replaySaveScore(save: PendingSave): Promise<void> {
  const { matchId, stageId, registrationId, payload } = save;

  // Check for potential conflict: was the server score modified after our offline save?
  try {
    const serverScore = await api.getShooterScore(matchId, stageId, registrationId);
    if (serverScore?.updated_at) {
      const serverModifiedAt = new Date(serverScore.updated_at).getTime();
      if (serverModifiedAt > save.createdAt) {
        // Conflict detected: server was updated after our offline save
        // We still save (last-write-wins) but this info could be surfaced to the user
        // For now, we proceed — the conflict toast is handled by the caller
      }
    }
  } catch {
    // Score not found on server (404) — no conflict, proceed
  }

  try {
    const result = await api.saveScore(matchId, stageId, registrationId, payload);
    // Update cached score with server response
    await offlineDB.cacheScore(matchId, stageId, registrationId, result);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    if (msg.includes('already saved') || msg.includes('HTTP 409')) {
      // Host already has this score; discard our stale offline save.
      // Refresh cache from server so local UI reflects the authoritative state.
      try {
        const serverScore = await api.getShooterScore(matchId, stageId, registrationId);
        await offlineDB.cacheScore(matchId, stageId, registrationId, serverScore);
      } catch {
        // Server score unavailable (may have been deleted); ignore cache refresh
      }
    } else {
      throw err;
    }
  }
}

async function replayDqShooter(save: PendingSave): Promise<void> {
  await api.dqShooter(save.matchId, save.registrationId, (save.payload as Record<string, unknown>).dq_reason as string || '');
}

async function replayUndqShooter(save: PendingSave): Promise<void> {
  await api.undqShooter(save.matchId, save.registrationId);
}

/**
 * Request a Background Sync if supported, and also attempt an immediate flush
 * if the browser is online. This is the primary trigger for syncing.
 */
export async function requestSync(): Promise<void> {
  // Try Background Sync API (Chrome, Edge). This registers a one-shot sync
  // that fires as soon as the device is back online, even if the page is
  // in the background.
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // TypeScript doesn't have SyncManager types by default
      await (reg as any).sync.register('ipscscore-sync-scores');
      console.log('[SW] Background Sync registered');
    } catch (err) {
      console.log('[SW] Background Sync registration failed:', err);
      // Sync registration failed (e.g., permission denied) — fallback will handle it
    }
  }

  // Always attempt immediate flush if online (covers browsers without Sync API)
  if (navigator.onLine) {
    flushPendingSaves().catch(() => {});
  }
}

/**
 * Check if there are any failed saves that need user attention
 */
export async function getFailedSaves(): Promise<PendingSave[]> {
  return offlineDB.getPendingSaves('failed');
}

/**
 * Get all saves with a specific status
 */
export async function getSavesByStatus(status: PendingSave['status']): Promise<PendingSave[]> {
  return offlineDB.getPendingSaves(status);
}