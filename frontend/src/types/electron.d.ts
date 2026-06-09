/**
 * Type declarations for the Electron API bridge.
 * These are only available when running inside an Electron BrowserWindow.
 * In web/Docker mode, window.electronAPI is undefined.
 */
export {};

declare global {
  interface Window {
    __DOMAIN_MODE__?: 'results' | 'scoring' | 'admin';
    electronAPI?: {
      getApiBaseUrl: () => string;
      isElectron: () => boolean;
      getLanIp: () => string;
      getDomainUrls: () => { vysledky: string; hodnotenie: string };
      isPort80Active: () => boolean;
    };
  }
}