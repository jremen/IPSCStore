import { useAuthStore } from '../stores/authStore';

/**
 * Convenience hook for auth state and permissions.
 */
export function useAuth() {
  const { isAdmin, isAuthenticated, authenticatedStageId, authenticatedStageName, authenticatedMatchId, login, logout, canEditStage } = useAuthStore();

  return {
    isAdmin,
    isAuthenticated,
    authenticatedStageId,
    authenticatedStageName,
    authenticatedMatchId,
    login,
    logout,
    canEditStage,
    /** Whether the user is a remote scorer (not admin) */
    isRemoteScorer: isAuthenticated && !isAdmin,
  };
}