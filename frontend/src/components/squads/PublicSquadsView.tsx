import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import * as offlineDB from '../../services/offlineDB';
import { useUIStore } from '../../stores/uiStore';
import LanguageSelector from '../settings/LanguageSelector';
import { ThemeToggle } from '../settings/ThemeToggle';
import type { RegistrationWithShooter } from '../../types/scoring';

const AUTO_REFRESH_INTERVAL = 30000;

export default function PublicSquadsView() {
  const { t } = useTranslation();
  const setActiveMatch = useUIStore((s) => s.setActiveMatch);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'noCurrentMatch' | 'loadError' | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [matchName, setMatchName] = useState<string>('');
  const [registrations, setRegistrations] = useState<RegistrationWithShooter[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = useCallback(async () => {
    let currentMatch: any = null;

    try {
      currentMatch = await api.getCurrentMatch();
    } catch {
      try {
        currentMatch = await offlineDB.getCachedCurrentMatch();
      } catch {
        // leave as-is
      }
    }

    if (!currentMatch?.id) {
      setError('noCurrentMatch');
      setLoading(false);
      return;
    }

    setActiveMatch(currentMatch.id);
    setMatchName(currentMatch.name || '');

    try {
      const regs = await api.getRegistrations(currentMatch.id);
      setRegistrations(regs);
      setIsOffline(false);
      // Cache for offline use
      try {
        await offlineDB.cacheRegistrations(currentMatch.id, regs);
        await offlineDB.cacheMatches([currentMatch]);
      } catch {
        // Non-fatal
      }
    } catch {
      // Try cached data
      try {
        const cachedRegs = await offlineDB.getCachedRegistrations(currentMatch.id);
        if (cachedRegs.length > 0) {
          setRegistrations(cachedRegs);
          setIsOffline(true);
        } else {
          setError('loadError');
        }
      } catch {
        setError('loadError');
      }
    }

    setLastRefresh(new Date());
    setLoading(false);
  }, [setActiveMatch]);

  useEffect(() => {
    setActiveTab('squads');
    loadData();
  }, [setActiveTab, loadData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const squadData = useMemo(() => {
    const grouped: Record<number, RegistrationWithShooter[]> = {};
    for (const reg of registrations) {
      const squad = reg.squad ?? 0;
      if (!grouped[squad]) grouped[squad] = [];
      grouped[squad].push(reg);
    }
    // Sort shooters within each squad by last name
    for (const squad of Object.keys(grouped)) {
      grouped[Number(squad)].sort((a, b) =>
        (a.last_name || '').localeCompare(b.last_name || '')
      );
    }
    return grouped;
  }, [registrations]);

  const sortedSquads = useMemo(() => {
    const keys = Object.keys(squadData)
      .map(Number)
      .filter((k) => k > 0)
      .sort((a, b) => a - b);
    return keys;
  }, [squadData]);

  const unassigned = squadData[0] || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('squads.loading')}</p>
        </div>
      </div>
    );
  }

  if (error === 'noCurrentMatch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            📋 {t('squads.publicTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('squads.noCurrentMatch')}
          </p>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            squads.local
          </div>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </div>
      </div>
    );
  }

  if (error === 'loadError') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            📋 {t('squads.publicTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('squads.loadError')}
          </p>
          <button
            onClick={() => { setError(null); setLoading(true); loadData(); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {t('squads.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 dark:bg-gray-900">
      <header className="bg-gray-900 text-white sticky top-0 z-110 px-4 py-2 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">📋 {matchName || t('squads.publicTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-200 dark:text-white">
          <span>{t('squads.autoRefresh', { time: lastRefresh.toLocaleTimeString() })}</span>
          {isOffline && (
            <span className="ml-2 px-1.5 py-0.5 bg-yellow-600 text-white rounded text-[10px] font-medium">
              {t('squads.offline')}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-prose mx-auto w-full px-4 py-6">
        {sortedSquads.length === 0 && unassigned.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            {t('squads.noShooters')}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedSquads.map((squadNum) => (
              <div key={squadNum} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800">
                  <h2 className="text-4xl font-bold text-purple-800 dark:text-purple-200">
                    {t('squads.squadN', { number: squadNum })}
                    <span className="ml-2 text-sm font-normal text-purple-600 dark:text-purple-400">
                      ({t('squads.shooterCount', { count: squadData[squadNum].length })})
                    </span>
                  </h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {squadData[squadNum].map((reg, idx) => (
                    <li key={reg.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-xl text-gray-400 dark:text-gray-500 w-6 text-right tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-2xl text-gray-800 dark:text-gray-200">
                        {reg.first_name} {reg.last_name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
