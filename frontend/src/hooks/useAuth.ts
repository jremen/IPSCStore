import { useAuthStore } from '../stores/authStore';

/**
 * Convenience hook for auth state and permissions.
 */
export function useAuth() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocalNetwork = useAuthStore((s) => s.isLocalNetwork);
  const authenticatedMatchId = useAuthStore((s) => s.authenticatedMatchId);
  const logout = useAuthStore((s) => s.logout);
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const adminLogout = useAuthStore((s) => s.adminLogout);
  const canEditStage = useAuthStore((s) => s.canEditStage);

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