import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { PgManager } from './pg-manager.js';

let mainWindow: BrowserWindow | null = null;
let pgManager: PgManager | null = null;
let backendProcess: ChildProcess | null = null;

/**
 * Resolve the path to the backend dist directory.
 * In development: relative to the project root.
 * In production: from the app resources directory.
 */
function getBackendDistPath(): string {
  const isDev = process.env.ELECTRON_DEV === 'true';
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'backend', 'dist');
  }
  return path.join(process.resourcesPath, 'backend-dist');
}

/**
 * Get the frontend dist path.
 * In development: relative to the project root.
 * In production: from the app resources directory.
 */
function getFrontendDistPath(): string {
  const isDev = process.env.ELECTRON_DEV === 'true';
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  }
  return path.join(process.resourcesPath, 'frontend-dist');
}

/**
 * Get the LAN IP address for display in the window title.
 */
function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Start the backend server as a child process.
 * Uses `node` to run the backend entry point, which avoids
 * ESM/CJS compatibility issues in Electron's main process.
 */
function startBackend(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendDistPath = getBackendDistPath();
    const frontendDistPath = getFrontendDistPath();
    const entryPoint = path.join(backendDistPath, 'index.js');

    // Set environment for the backend process
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'production',
      PORT: String(port),
      UPLOAD_DIR: path.join(app.getPath('userData'), 'uploads'),
      DATABASE_URL: process.env.DATABASE_URL || '',
      FRONTEND_DIST_PATH: frontendDistPath,
    };

    console.log(`[Main] Starting backend server from ${entryPoint}`);
    console.log(`[Main] Frontend dist path: ${frontendDistPath}`);

    backendProcess = spawn('node', [entryPoint], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      console.log(`[Backend] ${output}`);

      // Wait for the server to be ready
      if (!started && (output.includes('Server running') || output.includes('listening'))) {
        started = true;
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      console.error(`[Backend] ${output}`);
    });

    backendProcess.on('error', (err) => {
      console.error('[Main] Backend process error:', err);
      if (!started) {
        reject(err);
      }
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Main] Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });

    // Timeout: if server doesn't start within 15 seconds, reject
    setTimeout(() => {
      if (!started) {
        // Check if the health endpoint is responding
        const http = require('http');
        http.get(`http://localhost:${port}/api/health`, (res: any) => {
          if (res.statusCode === 200) {
            started = true;
            resolve();
          } else {
            reject(new Error('Backend server did not start within timeout'));
          }
        }).on('error', () => {
          reject(new Error('Backend server did not start within timeout'));
        });
      }
    }, 15000);
  });
}

/**
 * Create the main browser window.
 */
function createWindow(port: number, lanIp: string): void {
  const isDev = process.env.ELECTRON_DEV === 'true';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `IPSC Score${lanIp ? ` — LAN: http://${lanIp}:${port}` : ''}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set environment variables for the preload script
  process.env.ELECTRON_API_URL = `http://localhost:${port}`;
  process.env.ELECTRON_LAN_IP = lanIp;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${port}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Build application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Application entry point.
 */
async function main(): Promise<void> {
  const port = 3001;
  const lanIp = getLanIp();

  console.log('[Main] Starting IPSC Score...');
  console.log(`[Main] LAN IP: ${lanIp}`);

  // Check if we should use an external PostgreSQL
  const externalDbUrl = process.env.DATABASE_URL;

  if (!externalDbUrl) {
    // Initialize and start bundled PostgreSQL
    pgManager = new PgManager();

    try {
      await pgManager.initialize();
      await pgManager.start();
      await pgManager.waitReady();
      process.env.DATABASE_URL = pgManager.getConnectionString();
      console.log('[Main] Bundled PostgreSQL started');
    } catch (err) {
      console.error('[Main] Failed to start PostgreSQL:', err);

      const result = await dialog.showMessageBox({
        type: 'error',
        title: 'Database Error',
        message: 'Failed to start the built-in database.',
        detail: `${err}\n\nYou can try using an external PostgreSQL server by setting the DATABASE_URL environment variable.`,
        buttons: ['Try Anyway', 'Quit'],
        defaultId: 1,
      });

      if (result.response === 1) {
        app.quit();
        return;
      }
    }
  } else {
    console.log(`[Main] Using external PostgreSQL: ${externalDbUrl.replace(/:([^@]+)@/, ':****@')}`);
  }

  // Ensure upload directory exists
  const uploadDir = process.env.UPLOAD_DIR || path.join(app.getPath('userData'), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  process.env.UPLOAD_DIR = uploadDir;

  // Start the backend server (which runs migrations on startup)
  try {
    await startBackend(port);
    console.log('[Main] Backend server started successfully');
  } catch (err) {
    console.error('[Main] Failed to start backend:', err);
    dialog.showErrorBox('Startup Error', `Failed to start the backend server: ${err}`);
    app.quit();
    return;
  }

  // Create the browser window
  createWindow(port, lanIp);

  // Show LAN IP in console for mobile access
  console.log('');
  console.log('========================================');
  console.log('  Mobile devices can connect to:');
  console.log(`  http://${lanIp}:${port}`);
  console.log('========================================');
  console.log('');
}

// App lifecycle
app.on('ready', () => {
  main().catch((err) => {
    console.error('[Main] Failed to start:', err);
    dialog.showErrorBox('Startup Error', `Failed to start: ${err}`);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    const port = parseInt(process.env.PORT || '3001', 10);
    createWindow(port, process.env.ELECTRON_LAN_IP || getLanIp());
  }
});

app.on('before-quit', () => {
  console.log('[Main] Shutting down...');

  // Kill the backend process
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }

  // Stop PostgreSQL
  if (pgManager) {
    pgManager.stop().catch((err) => {
      console.error('[Main] Error stopping PostgreSQL:', err);
    });
  }
});