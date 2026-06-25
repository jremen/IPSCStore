import { useAuthStore } from '../stores/authStore';

/**
 * Convenience hook for auth state and permissions.
 */
export function useAuth() {
  const { isAdmin, isAuthenticated, isLocalNetwork, authenticatedMatchId, logout, adminLogin, adminLogout, canEditStage } = useAuthStore();

  return {
    isAdmin,
    isAuthenticated,
    isLocalNetwork,
    authenticatedMatchId,
    logout,
    adminLogin,
    adminLogout,
    canEditStage,
    isRemoteScorer: isAuthenticated && !isAdmin,
  };
}