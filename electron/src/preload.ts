import { contextBridge, ipcRenderer } from 'electron';

// These values are set by the main process before the preload script runs
const apiBaseUrl = process.env.ELECTRON_API_URL || 'http://localhost:3001';
const lanIp = process.env.ELECTRON_LAN_IP || '';
const resultsUrl = process.env.ELECTRON_RESULTS_URL || '';
const scoringUrl = process.env.ELECTRON_SCORING_URL || '';
const squadsUrl = process.env.ELECTRON_SQUADS_URL || '';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: () => apiBaseUrl,
  isElectron: () => true,
  getLanIp: () => lanIp,
  getDomainUrls: () => ({ results: resultsUrl, scoring: scoringUrl, squads: squadsUrl }),

  // Native menu action IPC.
  onMenuAction: (callback: (action: string, payload?: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string, payload?: any) => callback(action, payload);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },
  setMenuState: (state: Record<string, any>) => ipcRenderer.send('set-menu-state', state),

  // Folder picker for local backup
  pickBackupFolder: () => ipcRenderer.invoke('pick-backup-folder') as Promise<string | null>,
});
