import { contextBridge, ipcRenderer } from 'electron';

// These values are set by the main process before the preload script runs
const apiBaseUrl = process.env.ELECTRON_API_URL || 'http://localhost:3001';
const lanIp = process.env.ELECTRON_LAN_IP || '';
const vysledkyUrl = process.env.ELECTRON_VYSLEDKY_URL || '';
const hodnotenieUrl = process.env.ELECTRON_HODNOTENIE_URL || '';
const squadsUrl = process.env.ELECTRON_SQUADS_URL || '';
const port80Active = process.env.ELECTRON_PORT80 === '1';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: () => apiBaseUrl,
  isElectron: () => true,
  getLanIp: () => lanIp,
  // Domain URLs are now direct IP+path links (e.g. http://192.168.1.5:3001/vysledky)
  // instead of .local hostnames, which do not resolve on Android and are unreliable.
  getDomainUrls: () => ({ vysledky: vysledkyUrl, hodnotenie: hodnotenieUrl, squads: squadsUrl }),
  isPort80Active: () => port80Active,

  // Native menu action IPC.
  onMenuAction: (callback: (action: string, payload?: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string, payload?: any) => callback(action, payload);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },
  setMenuState: (state: Record<string, any>) => ipcRenderer.send('set-menu-state', state),
});
