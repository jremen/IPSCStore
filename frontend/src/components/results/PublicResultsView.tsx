import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useResultsStore } from '../../stores/resultsStore';
import ResultsOverview from './ResultsOverview';
import LanguageSelector from '../settings/LanguageSelector';

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export default function PublicResultsView() {
  const { t } = useTranslation();
  const { activeMatchId, setActiveMatch } = useUIStore();
  const { fetchMatches } = useMatchStore();
  const { fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag } = useResultsStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [matchName, setMatchName] = useState<string>('');

  // Load current match on mount
  useEffect(() => {
    (async () => {
      try {
        const currentMatch = await api.getCurrentMatch();
        if (currentMatch?.id) {
          setActiveMatch(currentMatch.id);
          setMatchName(currentMatch.name || '');
        } else {
          setError('noCurrentMatch');
        }
      } catch {
        // If no current match, try loading all matches and showing a message
        await fetchMatches();
        setError('noCurrentMatch');
      } finally {
        setLoading(false);
      }
    })();
  }, [setActiveMatch, fetchMatches]);

  // Fetch results when match is set
  useEffect(() => {
    if (activeMatchId) {
      fetchOverall(activeMatchId);
      fetchByDivision(activeMatchId);
      fetchByStage(activeMatchId);
      fetchByCategory(activeMatchId);
      fetchByTag(activeMatchId);
    }
  }, [activeMatchId, fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag]);

  // Auto-refresh results
  const refreshResults = useCallback(() => {
    const currentMatchId = useUIStore.getState().activeMatchId;
    if (currentMatchId) {
      fetchOverall(currentMatchId);
      fetchByDivision(currentMatchId);
      fetchByStage(currentMatchId);
      fetchByCategory(currentMatchId);
      fetchByTag(currentMatchId);
      setLastRefresh(new Date());
    }
  }, [fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag]);

  useEffect(() => {
    const interval = setInterval(refreshResults, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshResults]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('results.loading')}</p>
        </div>
      </div>
    );
  }

  if (error === 'noCurrentMatch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            🏆 {t('results.publicTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('results.noCurrentMatch')}
          </p>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            vysledky.local
          </div>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Minimal header for public results */}
      <header className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">🏆 {matchName || t('results.publicTitle')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-200">
            {t('results.autoRefresh', { time: lastRefresh.toLocaleTimeString() })}
          </span>
          <LanguageSelector />
        </div>
      </header>

      {/* Results content */}
      <main className="flex-1 overflow-auto">
        <ResultsOverview />
      </main>
    </div>
  );
}