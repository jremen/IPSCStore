import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

// Reference build timestamp so every build produces unique content hashes
// This forces browsers to fetch the new version instead of using cached JS
declare const __APP_BUILD_TIME__: string;
// Assign to document so it survives tree-shaking and is visible in the built app
(document as any).__buildTime__ = __APP_BUILD_TIME__;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);