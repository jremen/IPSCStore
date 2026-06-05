/**
 * Type declarations for the Electron API bridge.
 * These are only available when running inside an Electron BrowserWindow.
 * In web/Docker mode, window.electronAPI is undefined.
 */
export {};

declare global {
  interface Window {
    electronAPI?: {
      getApiBaseUrl: () => string;
      isElectron: () => boolean;
      getLanIp: () => string;
    };
  }
}