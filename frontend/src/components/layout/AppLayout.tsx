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
import StageLoginPage from '../auth/StageLoginPage';

export default function AppLayout() {
  const { activeTab, setActiveTab, setActiveMatch } = useUIStore();
  const { isAuthenticated, isAdmin, authenticatedStageId, authenticatedMatchId, restoreSession } = useAuthStore();

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

  // Not authenticated and not admin → show login page
  if (!isAuthenticated) {
    return <StageLoginPage />;
  }

  // Authenticated remote scorer → show only scoring tab
  if (!isAdmin && authenticatedStageId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 overflow-auto">
          <Scoring restrictedStageId={authenticatedStageId} />
        </main>
      </div>
    );
  }

  // Admin → full app
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <TabBar />
      <main className="flex-1 overflow-auto">
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