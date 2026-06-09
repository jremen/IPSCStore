import { useAuthStore } from '../stores/authStore';

/**
 * Convenience hook for auth state and permissions.
 */
export function useAuth() {
  const { isAdmin, isAuthenticated, isLocalNetwork, authenticatedStageId, authenticatedStageName, authenticatedMatchId, login, logout, adminLogin, adminLogout, canEditStage } = useAuthStore();

  return {
    isAdmin,
    isAuthenticated,
    isLocalNetwork,
    authenticatedStageId,
    authenticatedStageName,
    authenticatedMatchId,
    login,
    logout,
    adminLogin,
    adminLogout,
    canEditStage,
    /** Whether the user is a remote scorer (not admin) */
    isRemoteScorer: isAuthenticated && !isAdmin,
  };
}