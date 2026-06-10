import { BrowserWindow, dialog } from 'electron';
import path from 'path';

/**
 * Show a simple window that lets the user enter a DATABASE_URL.
 * Returns the URL string, or null if the user cancelled.
 */
export async function showDatabaseUrlDialog(errorMsg: string, logPath: string): Promise<string | null> {
  const isArm64 = process.platform === 'win32' && process.arch === 'arm64';
  const archNote = isArm64
    ? 'You are on Windows ARM64. The bundled PostgreSQL uses x64 binaries which require Windows x64 emulation. If the emulation is unavailable, connect to an external PostgreSQL server instead.'
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>IPSC Score — Database Configuration</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      background: #1a1a2e;
      color: #e0e0e0;
    }
    h1 { font-size: 20px; margin-bottom: 12px; color: #fff; }
    .error-box {
      background: #3d1f1f;
      border: 1px solid #8b3a3a;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .note {
      background: #1f2d3d;
      border: 1px solid #3a5a8b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 13px;
      line-height: 1.5;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #ccc;
    }
    input[type=text] {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      font-family: 'SF Mono', 'Consolas', monospace;
      border: 1px solid #444;
      border-radius: 6px;
      background: #2a2a3e;
      color: #fff;
      outline: none;
    }
    input[type=text]:focus {
      border-color: #4a9eff;
      box-shadow: 0 0 0 2px rgba(74,158,255,0.2);
    }
    .hint {
      font-size: 12px;
      color: #888;
      margin-top: 6px;
      line-height: 1.4;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
    button {
      padding: 8px 20px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-primary {
      background: #4a9eff;
      color: #fff;
    }
    .btn-primary:hover { background: #3a8eef; }
    .btn-secondary {
      background: #444;
      color: #ccc;
    }
    .btn-secondary:hover { background: #555; }
    .btn-danger {
      background: #8b3a3a;
      color: #fff;
    }
    .btn-danger:hover { background: #9b4a4a; }
  </style>
</head>
<body>
  <h1>Database Configuration Required</h1>
  <div class="error-box">${escapeHtml(errorMsg)}</div>
  ${archNote ? `<div class="note">${escapeHtml(archNote)} You need to connect to an external PostgreSQL server that is already running on this machine or your network.</div>` : ''}
  <label for="dburl">PostgreSQL Connection String</label>
  <input type="text" id="dburl" placeholder="postgresql://user:password@host:port/database" autofocus>
  <div class="hint">
    Format: postgresql://user:password@host:port/database<br>
    Example: postgresql://postgres:postgres@localhost:5432/ipscscore<br><br>
    To install PostgreSQL locally: winget install -e --id PostgreSQL.PostgreSQL.17
  </div>
  <div class="buttons">
    <button class="btn-danger" onclick="quit()">Quit</button>
    <button class="btn-secondary" onclick="openLog()">View Log</button>
    <button class="btn-primary" onclick="connect()">Connect</button>
  </div>
  <script>
    const { clipboard, shell } = require('electron');
    const input = document.getElementById('dburl');

    // Pre-fill from clipboard if it looks like a connection string
    try {
      const clip = clipboard.readText();
      if (clip && clip.startsWith('postgresql://')) {
        input.value = clip;
        input.select();
      }
    } catch {}

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') connect();
      if (e.key === 'Escape') quit();
    });

    function connect() {
      const url = input.value.trim();
      if (!url.startsWith('postgresql://')) {
        input.style.borderColor = '#ff4444';
        input.focus();
        return;
      }
      window.__dbUrl = url;
      window.close();
    }

    function quit() {
      window.__dbUrl = null;
      window.close();
    }

    function openLog() {
      shell.showItemInFolder(${JSON.stringify(logPath)});
    }
  </script>
</body>
</html>`;

  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 560,
      height: 420,
      title: 'IPSC Score — Database Configuration',
      resizable: true,
      minimizable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Remove menu bar
    win.setMenu(null);

    win.on('closed', () => {
      resolve(null);
    });

    // Load the HTML content
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    // Intercept window close to get the result
    win.webContents.on('did-finish-load', () => {
      // Inject a way to get the result before the window closes
      win.webContents.executeJavaScript(`
        window.addEventListener('beforeunload', (e) => {
          // Result will be read via executeJavaScript after close event
        });
      `).catch(() => {});
    });

    // When the window closes, try to read the result
    win.on('close', () => {
      win.webContents.executeJavaScript('window.__dbUrl || null')
        .then((result: string | null) => {
          resolve(result);
        })
        .catch(() => {
          resolve(null);
        });
    });
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}