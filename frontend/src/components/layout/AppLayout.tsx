import { useEffect, useRef } from 'react';
import Header from './Header';
import TabBar from './TabBar';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import * as offlineDB from '../../services/offlineDB';
import Matches from '../match/MatchList';
import Stages from '../stage/StageList';
import ShooterDatabase from '../shooter/ShooterDatabase';
import Registration from '../registration/MatchRegistration';
import Scoring from '../scoring/ScoringNav';
import Results from '../results/ResultsOverview';
import AdminLoginPage from '../auth/AdminLoginPage';
import StageLoginPage from '../auth/StageLoginPage';
import PublicResultsView from '../results/PublicResultsView';
import PublicSquadsView from '../squads/PublicSquadsView';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import MenuActionListener from '../shared/MenuActionListener';

export default function AppLayout() {
  const { activeTab, activeMatchId, setActiveMatch } = useUIStore();
  const { fetchMatches } = useMatchStore();
  const { isAuthenticated, isAdmin, isLocalNetwork, domainMode, authenticatedMatchId, restoreSession, logout } = useAuthStore();
  const sessionValidated = useRef(false);

  // Offline support hooks — always active
  useOfflineStatus();
  useOfflineSync();
  useRealtimeUpdates();

  // Native menu action bridge (Electron only)
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();
  const menuListener = isElectron ? <MenuActionListener /> : null;

  // PWA fix: if opened at root (/) in standalone mode, redirect to /hodnotenie
  // This handles existing PWA installations with start_url: '/' (installed from /)
  // After redirect, the user is on /hodnotenie where domainMode='scoring' → StageLoginPage
  useEffect(() => {
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore — iOS Safari standalone
      window.navigator.standalone === true
    );
    if (isStandalone && window.location.pathname === '/') {
      window.location.replace('/hodnotenie');
      return;
    }
    restoreSession();
  }, [restoreSession]);

  // Eagerly load matches list so tabs like Registration have match data
  // available for division/organization lookups without depending on the
  // Matches tab being visited first.
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchMatches();
    }
  }, [isAuthenticated, isAdmin, fetchMatches]);

  // For remote scorers: set the active match ID so scoring UI works without manual selection
  useEffect(() => {
    if (isAuthenticated && !isAdmin && authenticatedMatchId) {
      setActiveMatch(authenticatedMatchId);
    } else if (!isAuthenticated) {
      setActiveMatch(null);
    }
  }, [isAuthenticated, isAdmin, authenticatedMatchId, setActiveMatch]);

  // On domain-specific views, validate the session against the currently running match.
  // If a scorer's session is from an old (non-running) match, clear it so they re-authenticate.
  // On admin view, auto-select the running match when entering scoring/results tabs with no match selected.
  useEffect(() => {
    if (domainMode === 'scoring' || domainMode === 'results') {
      if (sessionValidated.current) return;
      sessionValidated.current = true;

      (async () => {
        let currentMatch: any = null;
        try {
          currentMatch = await api.getCurrentMatch();
        } catch {
          // Backend unreachable — try cached running match from IndexedDB
          try {
            currentMatch = await offlineDB.getCachedCurrentMatch();
          } catch {
            // IndexedDB also failed — leave state as-is
          }
        }

        if (!currentMatch?.id) return;

        // On domain views, always use the running match
        setActiveMatch(currentMatch.id);

        // If a scorer is authenticated but for a different (old) match, clear their session
        if (isAuthenticated && !isAdmin && authenticatedMatchId && authenticatedMatchId !== currentMatch.id) {
          logout();
        }
      })();
    } else if (isAuthenticated && isAdmin && !activeMatchId && (activeTab === 'scoring' || activeTab === 'results')) {
      // Admin: auto-select the running match when entering scoring/results tabs with no match selected
      (async () => {
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
        if (currentMatch?.id) setActiveMatch(currentMatch.id);
      })();
    }
  }, [domainMode, isAuthenticated, isAdmin, activeTab, activeMatchId, authenticatedMatchId, setActiveMatch, logout]);

  // Domain mode: vysledky.local → show public results (no login needed)
  if (domainMode === 'results') {
    return <PublicResultsView />;
  }

  // Domain mode: squads.local → show public squads (no login needed)
  if (domainMode === 'squads') {
    return <PublicSquadsView />;
  }

  // Not authenticated → show login page
  if (!isAuthenticated) {
    // Domain mode: hodnotenie.local → always show stage login (never admin)
    if (domainMode === 'scoring') {
      return <StageLoginPage />;
    }
    // On local network → show admin login
    if (isLocalNetwork) {
      return <AdminLoginPage />;
    }
    // Remote → show scorer login
    return <StageLoginPage />;
  }

  // Authenticated scorer — show scoring UI (unrestricted stage selection)
  if (!isAdmin && authenticatedMatchId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {menuListener}
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden lg:overflow-auto">
          <Scoring />
        </main>
      </div>
    );
  }

  // Admin → full app
  // Scoring tab needs overflow-hidden on mobile (for sticky header/footer),
  // all other tabs need overflow-auto for normal scrolling.
  const isScoringTab = activeTab === 'scoring';

  return (
    <div className="h-screen flex flex-col bg-gray-200 dark:bg-gray-900">
      {menuListener}
      <Header />
      <TabBar />
      <main className={`flex-1 min-h-0 ${isScoringTab ? 'overflow-hidden lg:overflow-auto' : 'overflow-auto'}`}>
        {activeTab === 'matches' && <Matches />}
        {activeTab === 'stages' && <Stages />}
        {activeTab === 'shooters' && <ShooterDatabase />}
        {activeTab === 'registration' && <Registration />}
        {activeTab === 'scoring' && <Scoring />}
        {activeTab === 'results' && <Results />}
      </main>
    </div>
  );
}
