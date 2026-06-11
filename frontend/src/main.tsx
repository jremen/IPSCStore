import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';
import { registerServiceWorker } from './utils/swRegistration';

// Reference build timestamp so every build produces unique content hashes
// This forces browsers to fetch the new version instead of using cached JS
// In dev mode, Vite may not replace __APP_BUILD_TIME__, so fall back to Date.now()
declare const __APP_BUILD_TIME__: string;
// Assign to document so it survives tree-shaking and is visible in the built app
(document as any).__buildTime__ = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : String(Date.now());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA offline support
registerServiceWorker();