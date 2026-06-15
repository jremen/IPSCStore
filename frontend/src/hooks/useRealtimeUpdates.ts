import { useEffect } from 'react';
import { connectToEventStream } from '../services/sse';
import { useUIStore } from '../stores/uiStore';
import { useScoringStore } from '../stores/scoringStore';
import { useResultsStore } from '../stores/resultsStore';
import { useMatchStore } from '../stores/matchStore';
import { useStageStore } from '../stores/stageStore';

interface ScoreSavedPayload {
  matchId: string;
  stageId: string | null;
  registrationId: string | null;
}

const isDebug = typeof window !== 'undefined' && localStorage.getItem('ipscscore-debug-sse') === 'true';

function debug(...args: unknown[]) {
  if (isDebug) console.log('[SSE realtime]', ...args);
}

/**
 * Maintain a single Server-Sent Events connection for the lifetime of the app
 * and refresh the relevant data whenever another client saves a score.
 *
 * The connection is opened without a match filter so it stays stable when the
 * user switches matches. All filtering is done against the latest store state
 * via `getState()` to avoid stale closures.
 */
export function useRealtimeUpdates() {
  useEffect(() => {
    const sse = connectToEventStream(null);

    const unsubscribe = sse.subscribe<ScoreSavedPayload>('score:saved', (payload) => {
      debug('score:saved received', payload);
      const eventMatchId = payload.matchId;
      const activeMatchId = useUIStore.getState().activeMatchId;
      const runningMatchId = useMatchStore.getState().runningMatch?.id ?? null;

      debug('match ids', { eventMatchId, activeMatchId, runningMatchId });

      // Refresh scoring progress for the active match (drives shooter checkmarks,
      // squad status, and stage tab checkmarks) and the running match (drives
      // the TabBar progress indicator).
      if (eventMatchId === activeMatchId) {
        debug('refreshing progress for active match');
        useScoringStore.getState().fetchScoringProgress(eventMatchId);
      }
      if (eventMatchId === runningMatchId && runningMatchId !== activeMatchId) {
        debug('refreshing progress for running match');
        useScoringStore.getState().fetchScoringProgress(eventMatchId);
      }

      // Nothing else to do if the event isn't for the match we're focused on.
      if (eventMatchId !== activeMatchId) return;

      const activeTab = useUIStore.getState().activeTab;
      const stageId = payload.stageId;
      const registrationId = payload.registrationId;

      // Scoring tab: reload the active shooter's score if this event is about
      // the score currently being edited.
      if (activeTab === 'scoring') {
        const scoringState = useScoringStore.getState();
        const activeStageId = scoringState.activeStageId;
        const currentRegistrationId = scoringState.currentRegistrationId;
        const currentStage = useStageStore.getState().currentStage;

        if (
          stageId &&
          registrationId &&
          stageId === activeStageId &&
          registrationId === currentRegistrationId &&
          currentStage
        ) {
          debug('reloading active score');
          scoringState.loadScore(eventMatchId, stageId, registrationId, currentStage);
        }
      }

      // Results tab: refresh whichever views are currently loaded.
      if (activeTab === 'results') {
        debug('refreshing results');
        const resultsState = useResultsStore.getState();
        resultsState.fetchOverall(eventMatchId);
        resultsState.fetchByDivision(eventMatchId);
        resultsState.fetchByStage(eventMatchId);
        resultsState.fetchByCategory(eventMatchId);
        resultsState.fetchByTag(eventMatchId);
      }
    });

    return () => {
      unsubscribe();
      sse.close();
    };
  }, []);
}
