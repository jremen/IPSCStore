import { useScoringStore } from '../stores/scoringStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Returns true if the current score was previously saved and the user is not admin.
 * When true, all scoring inputs should be disabled (read-only mode).
 */
export function useScoringReadOnly(): boolean {
  const isExistingScore = useScoringStore((s) => s.isExistingScore);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  return isExistingScore && !isAdmin;
}