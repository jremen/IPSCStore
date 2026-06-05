import { contextBridge } from 'electron';

// These values are set by the main process before the preload script runs
const apiBaseUrl = process.env.ELECTRON_API_URL || 'http://localhost:3001';
const lanIp = process.env.ELECTRON_LAN_IP || '';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: () => apiBaseUrl,
  isElectron: () => true,
  getLanIp: () => lanIp,
});