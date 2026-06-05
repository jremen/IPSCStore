import { useState, useEffect } from 'react';

/**
 * Detects whether the app is running on desktop (admin) or mobile (scorer).
 * Desktop: Electron app OR wide screen (>= 1024px)
 * Mobile: Browser on a narrow screen
 */
export function useDeviceContext() {
  const [isDesktop, setIsDesktop] = useState(() => {
    // Check Electron context first
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron?.()) {
      return true;
    }
    // Fall back to screen width
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      // Electron always = desktop
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron?.()) {
        setIsDesktop(true);
        return;
      }
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isDesktop };
}