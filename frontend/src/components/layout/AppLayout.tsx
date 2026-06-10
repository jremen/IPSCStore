import { useEffect } from 'react';
import Header from './Header';
import TabBar from './TabBar';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import Matches from '../match/MatchList';
import Stages from '../stage/StageList';
import ShooterDatabase from '../shooter/ShooterDatabase';
import Registration from '../registration/MatchRegistration';
import Scoring from '../scoring/ScoringNav';
import Results from '../results/ResultsOverview';
import AdminLoginPage from '../auth/AdminLoginPage';
import StageLoginPage from '../auth/StageLoginPage';
import PublicResultsView from '../results/PublicResultsView';

export default function AppLayout() {
  const { activeTab, setActiveMatch } = useUIStore();
  const { isAuthenticated, isAdmin, isLocalNetwork, domainMode, authenticatedStageId, authenticatedMatchId, restoreSession } = useAuthStore();

  // Restore auth session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // For remote scorers: set the active match ID so scoring UI works without manual selection
  useEffect(() => {
    if (isAuthenticated && !isAdmin && authenticatedMatchId) {
      setActiveMatch(authenticatedMatchId);
    } else if (!isAuthenticated) {
      setActiveMatch(null);
    }
  }, [isAuthenticated, isAdmin, authenticatedMatchId, setActiveMatch]);

  // Domain mode: vysledky.local → show public results (no login needed)
  if (domainMode === 'results') {
    return <PublicResultsView />;
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

  // Authenticated remote scorer → show only scoring tab
  if (!isAdmin && authenticatedStageId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden lg:overflow-auto">
          <Scoring restrictedStageId={authenticatedStageId} />
        </main>
      </div>
    );
  }

  // Admin → full app
  // Scoring tab needs overflow-hidden on mobile (for sticky header/footer),
  // all other tabs need overflow-auto for normal scrolling.
  const isScoringTab = activeTab === 'scoring';

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
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