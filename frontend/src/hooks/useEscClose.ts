import { useEffect } from 'react';

/**
 * Hook that calls onClose when the Escape key is pressed.
 * Used by modal components to support Esc key dismissal.
 */
export function useEscClose(onClose: (() => void) | undefined) {
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}