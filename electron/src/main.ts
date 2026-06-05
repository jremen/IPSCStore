import { app, BrowserWindow, Menu, dialog, utilityProcess } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { PgManager } from './pg-manager.js';

let mainWindow: BrowserWindow | null = null;
let pgManager: PgManager | null = null;
let backendProcess: ChildProcess | Electron.UtilityProcess | null = null;

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
 * Kill the backend process, regardless of its type.
 */
function killBackend(): void {
  if (backendProcess) {
    if ('kill' in backendProcess) {
      (backendProcess as any).kill();
    }
    backendProcess = null;
  }
}

/**
 * Start the backend server as a child process.
 *
 * In production: uses Electron's utilityProcess.fork() which spawns a
 * Node.js subprocess using Electron's built-in V8 engine — no system
 * `node` binary is needed.
 *
 * In development: spawns a separate `node` process for convenience.
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

    const isDev = process.env.ELECTRON_DEV === 'true';

    let started = false;

    if (isDev) {
      // Development: use system node via child_process.spawn
      const child = spawn('node', [entryPoint], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }) as ChildProcess;
      backendProcess = child;

      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        console.log(`[Backend] ${output}`);
        if (!started && (output.includes('Server running') || output.includes('listening'))) {
          started = true;
          resolve();
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        console.error(`[Backend] ${data.toString().trim()}`);
      });

      child.on('error', (err: Error) => {
        console.error('[Main] Backend process error:', err);
        if (!started) reject(err);
      });

      child.on('exit', (code: number | null) => {
        console.log(`[Main] Backend process exited with code ${code}`);
        backendProcess = null;
      });
    } else {
      // Production: use Electron's utilityProcess.fork()
      // This spawns a Node.js subprocess using Electron's built-in engine,
      // so we don't depend on a system `node` binary.
      // Set NODE_PATH so the backend can find its dependencies.
      const backendNodeModules = path.join(process.resourcesPath, 'backend-node-modules');
      env.NODE_PATH = backendNodeModules;

      const child = utilityProcess.fork(entryPoint, [], {
        env,
        stdio: 'pipe',
      });
      backendProcess = child;

      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        console.log(`[Backend] ${output}`);
        if (!started && (output.includes('Server running') || output.includes('listening'))) {
          started = true;
          resolve();
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        console.error(`[Backend] ${data.toString().trim()}`);
      });

      child.on('exit', (code: number) => {
        console.log(`[Main] Backend process exited with code ${code}`);
        backendProcess = null;
      });
    }

    // Timeout: if server doesn't start within 15 seconds, check health endpoint
    setTimeout(() => {
      if (!started) {
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
  killBackend();

  // Stop PostgreSQL
  if (pgManager) {
    pgManager.stop().catch((err) => {
      console.error('[Main] Error stopping PostgreSQL:', err);
    });
  }
});