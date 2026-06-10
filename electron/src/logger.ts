import fs from 'fs';
import path from 'path';
import os from 'os';

let logStream: fs.WriteStream | null = null;
let logPath: string | null = null;

/**
 * Get the fallback log directory (used before app is ready).
 * Uses ~/AppData/Roaming/ipscscore-electron on Windows,
 * ~/.ipscscore on macOS/Linux.
 */
function getFallbackLogDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'ipscscore-electron');
  }
  return path.join(os.homedir(), '.ipscscore');
}

/**
 * Initialize the file logger. Can be called before app is ready
 * (uses a fallback directory) or after (uses app.getPath('userData')).
 * Calling again reinitializes with a new path, properly closing the old stream.
 */
export function initLogger(userDataPath?: string): void {
  try {
    const dir = userDataPath || getFallbackLogDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const newPath = path.join(dir, 'ipscscore.log');

    // If we already have a stream open to the same path, just flush and continue
    if (logStream && logPath === newPath) {
      // Same path — just log that we're continuing
      logStream.write(`[logger] Re-initialized (same path): ${newPath}\n`);
      return;
    }

    // Close existing stream before opening a new one (prevents file lock on Windows)
    if (logStream) {
      try {
        logStream.end();
      } catch { /* ignore close errors */ }
      logStream = null;
    }

    // Rotate: if log > 5MB, rename to .log.old and start fresh
    try {
      const stat = fs.statSync(newPath);
      if (stat.size > 5 * 1024 * 1024) {
        const oldPath = newPath + '.old';
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
        fs.renameSync(newPath, oldPath);
      }
    } catch { /* file doesn't exist yet */ }

    logPath = newPath;
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    log(`=== IPSC Score started at ${new Date().toISOString()} ===`);
    log(`Platform: ${process.platform} ${process.arch}`);
    log(`Electron: ${process.versions.electron}, Node: ${process.versions.node}, Chrome: ${process.versions.chrome}`);
    log(`Log file: ${logPath}`);
  } catch (err) {
    // If we can't create the log file, just skip file logging
    console.error('[Logger] Failed to initialize log file:', err);
  }
}

/**
 * Log a message to both console and the log file.
 */
export function log(message: string): void {
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  if (logStream) {
    try {
      logStream.write(line + '\n');
    } catch { /* ignore write errors */ }
  }
}

/**
 * Log an error to both console and the log file.
 */
export function logError(message: string, err?: any): void {
  const timestamp = new Date().toISOString().substring(11, 23);
  const errStr = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
  const line = `[${timestamp}] ERROR: ${message}${errStr ? ' — ' + errStr : ''}`;
  console.error(line);
  if (logStream) {
    try {
      logStream.write(line + '\n');
    } catch { /* ignore write errors */ }
  }
}

/**
 * Flush pending log data to disk.
 * Call before showing error dialogs to ensure logs are persisted.
 */
export function flushLog(): void {
  if (logStream && logStream.writable) {
    try {
      logStream.write(''); // trigger internal flush
    } catch { /* ignore */ }
  }
}

/**
 * Get the path to the current log file (for showing to user in error dialogs).
 */
export function getLogPath(): string {
  return logPath || path.join(os.homedir(), '.ipscscore', 'ipscscore.log');
}