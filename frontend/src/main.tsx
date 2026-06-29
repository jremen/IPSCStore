import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';
import { registerServiceWorker } from './utils/swRegistration';
import { ScoringBaseUrlProvider } from './components/ScoringBaseUrlProvider';

// Reference build timestamp so every build produces unique content hashes
// This forces browsers to fetch the new version instead of using cached JS
// In dev mode, Vite may not replace __APP_BUILD_TIME__, so fall back to Date.now()
declare const __APP_BUILD_TIME__: string;
// Assign to document so it survives tree-shaking and is visible in the built app
(document as any).__buildTime__ = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : String(Date.now());

// Suppress the benign "ResizeObserver loop completed with undelivered notifications"
// browser warning. Triggered by @floating-ui/dom (Flowbite Modal) and @dnd-kit
// observing many rows at once. The browser already drops the second notification
// to prevent infinite loops — this is purely a console warning, not a real error.
window.addEventListener('error', (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScoringBaseUrlProvider />
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA offline support
registerServiceWorker();