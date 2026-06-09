import { contextBridge } from 'electron';

// These values are set by the main process before the preload script runs
const apiBaseUrl = process.env.ELECTRON_API_URL || 'http://localhost:3001';
const lanIp = process.env.ELECTRON_LAN_IP || '';
const vysledkyUrl = process.env.ELECTRON_VYSLEDKY_URL || '';
const hodnotenieUrl = process.env.ELECTRON_HODNOTENIE_URL || '';
const port80Active = process.env.ELECTRON_PORT80 === '1';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: () => apiBaseUrl,
  isElectron: () => true,
  getLanIp: () => lanIp,
  getDomainUrls: () => ({ vysledky: vysledkyUrl, hodnotenie: hodnotenieUrl }),
  isPort80Active: () => port80Active,
});