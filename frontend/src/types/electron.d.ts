/**
 * Type declarations for the Electron API bridge.
 * These are only available when running inside an Electron BrowserWindow.
 * In web/Docker mode, window.electronAPI is undefined.
 */
export {};

declare global {
  interface Window {
    __DOMAIN_MODE__?: 'results' | 'scoring' | 'squads' | 'admin';
    electronAPI?: {
      getApiBaseUrl: () => string;
      isElectron: () => boolean;
      getLanIp: () => string;
      /** Direct IP+path URLs such as http://192.168.1.5:3001/vysledky */
      getDomainUrls: () => { vysledky: string; hodnotenie: string; squads: string };
      isPort80Active: () => boolean;
      /** Subscribe to native menu actions. Returns an unsubscribe function. */
      onMenuAction: (callback: (action: string, payload?: any) => void) => () => void;
      /** Report renderer state to the main process so menu items can be enabled/disabled. */
      setMenuState: (state: Record<string, any>) => void;
    };
  }
}