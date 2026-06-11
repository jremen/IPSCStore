/**
 * Pre-caching service for offline scoring support.
 *
 * When the user is online and opens the scoring tab, we proactively cache
 * all the data needed for offline scoring: stages, registrations, scoring
 * progress, and individual scores for the current stage.
 *
 * This runs in the background and never blocks the UI.
 */
import { api } from './api';
import * as offlineDB from './offlineDB';

/**
 * Pre-cache all scoring data for a match (stages, registrations, progress).
 * Called when the scoring tab is first opened while online.
 */
export async function precacheScoringData(matchId: string): Promise<void> {
  // Skip in Electron (always has local server) or when offline
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron?.()) return;
  if (!navigator.onLine) return;

  try {
    const [stages, registrations, progress] = await Promise.all([
      api.getStages(matchId),
      api.getRegistrations(matchId),
      api.getScoringProgress(matchId),
    ]);

    await Promise.all([
      offlineDB.cacheStages(matchId, stages),
      offlineDB.cacheRegistrations(matchId, registrations),
      offlineDB.cacheScoringProgress(matchId, progress),
    ]);
  } catch (err) {
    // Non-critical — caching is best-effort
    console.warn('[precache] Failed to cache scoring data:', err);
  }
}

/**
 * Pre-cache all individual scores for a specific stage.
 * Called when the user selects a stage (reduces latency for loadScore offline).
 */
export async function precacheStageScores(
  matchId: string,
  stageId: string,
  registrationIds: string[],
): Promise<void> {
  // Skip in Electron or when offline
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron?.()) return;
  if (!navigator.onLine) return;

  // Fetch all scores for this stage in parallel (non-blocking)
  const promises = registrationIds.map((regId) =>
    api.getShooterScore(matchId, stageId, regId)
      .then((score) => offlineDB.cacheScore(matchId, stageId, regId, score))
      .catch(() => {
        // 404 = no score yet for this shooter — that's fine
      })
  );

  await Promise.allSettled(promises);
}