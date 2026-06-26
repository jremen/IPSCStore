import { app, BrowserWindow, Menu, dialog, ipcMain, utilityProcess } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { PgManager } from './pg-manager.js';
import { setupPort80Redirect, removePort80Redirect, isPort80RedirectActive } from './port80.js';
import { initLogger, log, logError, flushLog, getLogPath } from './logger.js';
import { showDatabaseUrlDialog } from './db-config-dialog.js';
import { buildMenu, setMainWindow, setupMenuIpc, updateMenuState } from './menu.js';

// Initialize the logger IMMEDIATELY — before any async operations or event handlers.
// Uses a fallback directory (not app.getPath) since the app isn't ready yet.
// After app is ready, we'll reinitialize with the correct path.
initLogger();

/**
 * Safe console.log that catches EPIPE errors.
 * When the Electron app is launched by double-clicking (not from a terminal),
 * stdout may be a broken pipe, causing console.log to throw EPIPE.
 */
const origLog = console.log;
const origError = console.error;
console.log = (...args: any[]) => {
  try { origLog.apply(console, args); } catch (e: any) { if (e.code !== 'EPIPE') throw e; }
};
console.error = (...args: any[]) => {
  try { origError.apply(console, args); } catch (e: any) { if (e.code !== 'EPIPE') throw e; }
};

// Catch ALL unhandled promise rejections — this is the most common cause of
// silent crashes on Windows. Without this handler, unhandled rejections crash
// the process with no error dialog and no useful output.
process.on('unhandledRejection', (reason: any) => {
  logError('[Main] Unhandled promise rejection', reason);
  // Try to show an error dialog if the app is running
  if (app.isReady()) {
    dialog.showErrorBox(
      'Unexpected Error',
      `An unexpected error occurred: ${reason instanceof Error ? reason.message : String(reason)}\n\nLog file: ${getLogPath()}`
    );
  }
  // Don't quit — some rejections are non-fatal (e.g., mDNS socket errors)
  // If the app is truly broken, the user can close it manually.
});

let mainWindow: BrowserWindow | null = null;
let pgManager: PgManager | null = null;
let backendProcess: ChildProcess | Electron.UtilityProcess | null = null;
let mDnsStopFunctions: (() => void)[] = [];

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
 * Start mDNS advertising for .local domain names.
 * Uses dnssd-advertise which registers custom hostnames in mDNS,
 * so vysledky.local and hodnotenie.local resolve to this machine's IP.
 * Also advertises DNS-SD services so the app appears in Bonjour browsers.
 */
function startMDns(port: number): void {
  try {
    const { advertise } = require('dnssd-advertise');

    // Advertise results service (vysledky.local)
    const stop1 = advertise({
      name: 'IPSC Score - Results',
      type: 'http',
      protocol: 'tcp',
      port,
      hostname: 'vysledky',
    });
    mDnsStopFunctions.push(stop1);
    log('[mDNS] Advertised: vysledky.local');

    // Advertise scoring service (hodnotenie.local)
    const stop2 = advertise({
      name: 'IPSC Score - Scoring',
      type: 'http',
      protocol: 'tcp',
      port,
      hostname: 'hodnotenie',
    });
    mDnsStopFunctions.push(stop2);
    log('[mDNS] Advertised: hodnotenie.local');

    // Advertise squads service (squads.local)
    const stop3 = advertise({
      name: 'IPSC Score - Squads',
      type: 'http',
      protocol: 'tcp',
      port,
      hostname: 'squads',
    });
    mDnsStopFunctions.push(stop3);
    log('[mDNS] Advertised: squads.local');
  } catch (err) {
    logError('[mDNS] Failed to start mDNS advertising', err);
  }
}

/**
 * Stop mDNS advertising.
 */
function stopMDns(): void {
  for (const stop of mDnsStopFunctions) {
    try {
      stop();
    } catch {
      // Ignore errors during shutdown
    }
  }
  mDnsStopFunctions = [];
  log('[mDNS] Services unregistered');
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
      MIGRATIONS_DIR: path.join(backendDistPath, 'db', 'migrations'),
    };

    // Generate and configure TLS cert for HTTPS
    try {
      const { ensureTlsCert } = require('../utils/tlsCert');
      const lanIp = getLanIp();
      const { certPath, keyPath } = ensureTlsCert(app.getPath('userData'), lanIp);
      env.TLS_CERT_PATH = certPath;
      env.TLS_KEY_PATH = keyPath;
      log(`[TLS] HTTPS enabled — cert: ${certPath}`);
    } catch (err: any) {
      log(`[TLS] Failed to generate TLS cert: ${err.message}`);
      log('[TLS] Falling back to HTTP');
    }

    log(`[Main] Starting backend server from ${entryPoint}`);
    log(`[Main] Frontend dist path: ${frontendDistPath}`);
    log(`[Main] DATABASE_URL set: ${!!env.DATABASE_URL}`);

    const isDev = process.env.ELECTRON_DEV === 'true';

    let settled = false;

    const doResolve = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const doReject = (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    if (isDev) {
      // Development: use system node via child_process.spawn
      const child = spawn('node', [entryPoint], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }) as ChildProcess;
      backendProcess = child;

      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        log(`[Backend] ${output}`);
        if (!settled && (output.includes('Server running') || output.includes('listening'))) {
          doResolve();
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        logError(`[Backend] ${data.toString().trim()}`);
      });

      child.on('error', (err: Error) => {
        logError('[Main] Backend process error', err);
        doReject(err);
      });

      child.on('exit', (code: number | null) => {
        log(`[Main] Backend process exited with code ${code}`);
        backendProcess = null;
        if (!settled) {
          doReject(new Error(`Backend process exited unexpectedly with code ${code}. Check log for details: ${getLogPath()}`));
        }
      });
    } else {
      // Production: use Electron's utilityProcess.fork()
      // This spawns a Node.js subprocess using Electron's built-in engine,
      // so we don't depend on a system `node` binary.
      // Note: NODE_PATH doesn't work with ESM imports, so we don't set it.
      // The backend is bundled with esbuild and has all deps inlined.

      // Verify the entry point exists before forking
      try {
        require('fs').accessSync(entryPoint);
      } catch {
        doReject(new Error(`Backend entry point not found: ${entryPoint}`));
        return;
      }

      let child: Electron.UtilityProcess;
      try {
        child = utilityProcess.fork(entryPoint, [], {
          env,
          stdio: 'pipe',
        });
      } catch (forkErr: any) {
        logError('[Main] utilityProcess.fork() failed', forkErr);
        doReject(new Error(`Failed to fork backend process: ${forkErr.message || String(forkErr)}`));
        return;
      }
      backendProcess = child;

      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        log(`[Backend] ${output}`);
        if (!settled && (output.includes('Server running') || output.includes('listening'))) {
          doResolve();
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        logError(`[Backend] ${data.toString().trim()}`);
      });

      child.on('exit', (code: number) => {
        log(`[Main] Backend process exited with code ${code}`);
        backendProcess = null;
        // If the process exits before we detected startup, reject immediately
        // instead of waiting for the 15-second timeout.
        if (!settled) {
          doReject(new Error(`Backend process exited unexpectedly with code ${code}. Check log for details: ${getLogPath()}`));
        }
      });

      // Handle V8 fatal errors in the utility process
      child.on('error', (type: string, location: string, report: string) => {
        logError(`[Main] Backend process fatal error: ${type} at ${location}`, report);
        if (!settled) {
          doReject(new Error(`Backend process fatal error: ${type} at ${location}`));
        }
      });

      // Log when the process actually spawns (useful for debugging slow starts)
      child.on('spawn', () => {
        log('[Main] Backend process spawned successfully');
      });
    }

    // Timeout: if server doesn't start within 15 seconds, check health endpoint
    setTimeout(() => {
      if (!settled) {
        const http = require('http');
        http.get(`http://localhost:${port}/api/health`, (res: any) => {
          if (res.statusCode === 200) {
            doResolve();
          } else {
            doReject(new Error('Backend server did not start within timeout'));
          }
        }).on('error', () => {
          doReject(new Error('Backend server did not start within timeout'));
        });
      }
    }, 15000);
  });
}

/**
 * Create the main browser window.
 */
function createWindow(port: number, lanIp: string, port80Active: boolean): void {
  const isDev = process.env.ELECTRON_DEV === 'true';
  const isDebug = process.argv.includes('--debug') || process.argv.includes('--devtools');
  const baseUrl = port80Active ? `http://${lanIp}` : `http://${lanIp}:${port}`;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `IPSC Score${lanIp ? ` — ${baseUrl}` : ''}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setMainWindow(mainWindow);

  // Set environment variables for the preload script
  process.env.ELECTRON_API_URL = `http://localhost:${port}`;
  process.env.ELECTRON_LAN_IP = lanIp;
  process.env.ELECTRON_PORT80 = port80Active ? '1' : '0';

  // Expose direct IP-based URLs with path prefixes. This works on every
  // platform and device, including Android, which cannot resolve .local domains.
  process.env.ELECTRON_VYSLEDKY_URL = `${baseUrl}/vysledky`;
  process.env.ELECTRON_HODNOTENIE_URL = `${baseUrl}/hodnotenie`;
  process.env.ELECTRON_SQUADS_URL = `${baseUrl}/squads`;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${port}`);
    // Open DevTools in production when --debug flag is provided
    // This helps diagnose issues on Windows where there's no console
    if (isDebug) {
      mainWindow.webContents.openDevTools();
      log('[Main] Debug mode: DevTools opened');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindow(null);
  });

  // Build the full native application menu.
  buildMenu();
}

/**
 * Read persisted database config from the app's user data directory.
 * Returns the DATABASE_URL if previously saved, or null.
 */
async function readDbConfig(): Promise<string | null> {
  const configPath = path.join(app.getPath('userData'), 'db-config.json');
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);
    return config.databaseUrl || null;
  } catch {
    return null;
  }
}

/**
 * Persist the DATABASE_URL to a config file so it survives app restarts.
 */
async function writeDbConfig(databaseUrl: string): Promise<void> {
  const configPath = path.join(app.getPath('userData'), 'db-config.json');
  try {
    await fs.writeFile(configPath, JSON.stringify({ databaseUrl }, null, 2), 'utf-8');
    log(`[Main] Database config saved to: ${configPath}`);
  } catch (err) {
    logError('[Main] Failed to save database config', err);
  }
}

/**
 * Show a dialog when bundled PostgreSQL fails, allowing the user to
 * configure an external PostgreSQL connection.
 * Returns the DATABASE_URL to use, or null if the user chose to quit.
 */
async function showDatabaseConfigDialog(errorMsg: string): Promise<string | null> {
  flushLog();
  return showDatabaseUrlDialog(errorMsg, getLogPath());
}

/**
 * Test if a PostgreSQL connection string is reachable by attempting
 * a TCP connection to the host:port extracted from the URL.
 */
async function testDatabaseConnection(databaseUrl: string): Promise<boolean> {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname || 'localhost';
    const port = parseInt(url.port || '5432', 10);

    return new Promise<boolean>((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, host);
    });
  } catch {
    return false;
  }
}

/**
 * Application entry point.
 */
async function main(): Promise<void> {
  // Reinitialize logger with the proper app data path now that the app is ready
  initLogger(app.getPath('userData'));

  const port = 3001;
  const lanIp = getLanIp();

  log('[Main] Starting IPSC Score...');
  log(`[Main] LAN IP: ${lanIp}`);
  log(`[Main] Platform: ${process.platform} ${process.arch}`);

  // Check for DATABASE_URL from: environment variable > persisted config
  let externalDbUrl: string | undefined = process.env.DATABASE_URL;
  if (!externalDbUrl) {
    externalDbUrl = (await readDbConfig()) || undefined;
    if (externalDbUrl) {
      log('[Main] Using DATABASE_URL from saved config');
      process.env.DATABASE_URL = externalDbUrl;
    }
  }

  // If we have an external DATABASE_URL, verify it's reachable before committing to it.
  // A stale saved URL (e.g., from a previous session where bundled PG failed) will cause
  // the backend to fail with an unhelpful "background server could not be started" error.
  // If the external DB isn't reachable, fall through to try the bundled PostgreSQL.
  if (externalDbUrl) {
    const reachable = await testDatabaseConnection(externalDbUrl);
    if (reachable) {
      log(`[Main] Using external PostgreSQL: ${externalDbUrl.replace(/:([^@]+)@/, ':****@')}`);
    } else {
      log('[Main] Saved external DATABASE_URL is not reachable, trying bundled PostgreSQL instead');
      externalDbUrl = undefined;
      process.env.DATABASE_URL = '';
      // Delete the stale config so we don't keep retrying a dead connection
      const configPath = path.join(app.getPath('userData'), 'db-config.json');
      try { await fs.unlink(configPath); } catch { /* ignore */ }
    }
  }

  if (!externalDbUrl) {
    // Initialize and start bundled PostgreSQL
    pgManager = new PgManager();

    try {
      await pgManager.initialize();
      await pgManager.start();
      process.env.DATABASE_URL = pgManager.getConnectionString();
      log('[Main] Bundled PostgreSQL started');
    } catch (err) {
      logError('[Main] Failed to start PostgreSQL', err);

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      if (errorStack) {
        logError('[Main] Stack trace', errorStack);
      }

      // Show database configuration dialog
      const dbUrl = await showDatabaseConfigDialog(errorMessage);
      if (dbUrl === null) {
        app.quit();
        return;
      }

      // Save the external DATABASE_URL and set it
      process.env.DATABASE_URL = dbUrl;
      await writeDbConfig(dbUrl);
      log(`[Main] Using external PostgreSQL: ${dbUrl.replace(/:([^@]+)@/, ':****@')}`);
    }
  } else {
    log(`[Main] Using external PostgreSQL: ${externalDbUrl.replace(/:([^@]+)@/, ':****@')}`);
  }

  // Ensure upload directory exists
  const uploadDir = process.env.UPLOAD_DIR || path.join(app.getPath('userData'), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  process.env.UPLOAD_DIR = uploadDir;

  // Start the backend server (which runs migrations on startup)
  try {
    await startBackend(port);
    log('[Main] Backend server started successfully');

    // Set up native menu IPC after the backend is ready.
    setupMenuIpc();
  } catch (err) {
    logError('[Main] Failed to start backend', err);
    flushLog();
    const backendError = err instanceof Error ? err.message : String(err);
    const platformInfo = `Platform: ${process.platform} ${process.arch}`;
    let helpText = '';
    if (process.platform === 'win32' && process.arch === 'arm64') {
      helpText = '\n\nYou are on Windows ARM64. If PostgreSQL failed to start, you may need to:\n1. Enable x64 emulation in Windows Settings\n2. Or connect to an external PostgreSQL server via the database config dialog';
    }
    dialog.showErrorBox('Startup Error', `Failed to start the backend server: ${backendError}\n\n${platformInfo}${helpText}\n\nLog file: ${getLogPath()}`);
    app.quit();
    return;
  }

  // Set up folder picker handler for local backup.
  // Must be registered before createWindow() so it's available immediately.
  ipcMain.handle('pick-backup-folder', async () => {
    log('[Backup] pickBackupFolder invoked, mainWindow=' + (mainWindow ? 'set' : 'null'));
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    log('[Backup] dialog result canceled=' + result.canceled + ' paths=' + JSON.stringify(result.filePaths));
    return result.canceled ? null : result.filePaths[0];
  });

  // Create the browser window
  // Try to set up port 80 redirect so .local domains work without port number
  const port80Active = await setupPort80Redirect(port);
  createWindow(port, lanIp, port80Active);

  // Start mDNS advertising for .local domains
  // Advertise port 80 if redirect is active, otherwise port 3001
  const mDnsPort = port80Active ? 80 : port;
  startMDns(mDnsPort);

  // Show LAN access info in console and log
  log('');
  log('========================================');
  log('  Admin interface:');
  log(`  http://localhost:${port}`);
  log('');
  log('  Mobile devices can connect to:');
  log(`  ${process.env.ELECTRON_VYSLEDKY_URL}   (public results)`);
  log(`  ${process.env.ELECTRON_HODNOTENIE_URL}  (range master scoring)`);
  log(`  ${process.env.ELECTRON_SQUADS_URL}      (squads)`);
  log('========================================');
  log('');
}

// App lifecycle
app.on('ready', () => {
  main().catch((err) => {
    logError('[Main] Failed to start', err);
    flushLog();
    dialog.showErrorBox('Startup Error', `Failed to start: ${err}\n\nLog file: ${getLogPath()}`);
    app.quit();
  });
});

// Ignore EPIPE errors — these happen when console.log writes to a broken pipe
// (e.g. when the app is launched by double-clicking, not from a terminal).
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE') return;
  logError('[Main] Uncaught exception', err);
  flushLog();
  dialog.showErrorBox('Unexpected Error', `${err?.message || String(err)}\n\nLog file: ${getLogPath()}`);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    const port = parseInt(process.env.PORT || '3001', 10);
    createWindow(port, process.env.ELECTRON_LAN_IP || getLanIp(), isPort80RedirectActive());
  } else {
    setMainWindow(mainWindow);
    buildMenu();
  }
});

app.on('before-quit', () => {
  log('[Main] Shutting down...');

  // Stop mDNS advertising
  stopMDns();

  // Remove port 80 redirect
  removePort80Redirect().catch((err) => {
    logError('[Main] Error removing port 80 redirect', err);
  });

  // Kill the backend process
  killBackend();

  // Stop PostgreSQL
  if (pgManager) {
    pgManager.stop().catch((err) => {
      logError('[Main] Error stopping PostgreSQL', err);
    });
  }
});