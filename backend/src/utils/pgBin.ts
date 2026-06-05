import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

let cachedBinDir: string | null = null;

/**
 * Resolve the directory containing PostgreSQL binaries (pg_dump, psql, etc.).
 * - In Electron production: uses bundled binaries at process.resourcesPath/pg/bin/
 * - In Docker/dev: searches system PATH
 * - Fallback: common installation directories
 */
export function getPgBinDir(): string {
  if (cachedBinDir) return cachedBinDir;

  // Electron production: bundled binaries
  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const bundledDir = path.join(resourcesPath, 'pg', 'bin');
    try {
      const ext = process.platform === 'win32' ? '.exe' : '';
      fs.accessSync(path.join(bundledDir, `psql${ext}`));
      cachedBinDir = bundledDir;
      return cachedBinDir;
    } catch {
      // Not bundled, fall through
    }
  }

  // Dev/Docker: find in system PATH
  try {
    const result = execSync(
      process.platform === 'win32' ? 'where psql' : 'which psql',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const dir = path.dirname(result.split('\n')[0].trim());
    cachedBinDir = dir;
    return dir;
  } catch {
    // Not in PATH, fall through
  }

  // Fallback: common installation directories
  const platform = process.platform;
  const fallbacks = platform === 'win32'
    ? ['C:\\Program Files\\PostgreSQL\\16\\bin', 'C:\\Program Files\\PostgreSQL\\17\\bin']
    : platform === 'darwin'
      ? ['/opt/homebrew/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql/bin', '/usr/local/opt/postgresql@16/bin', '/usr/local/opt/postgresql/bin']
      : ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/bin'];

  for (const dir of fallbacks) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    try {
      fs.accessSync(path.join(dir, `psql${ext}`));
      cachedBinDir = dir;
      return dir;
    } catch {
      continue;
    }
  }

  throw new Error('PostgreSQL binaries not found. Install postgresql-client or ensure pg_dump/psql are in PATH.');
}

export function getPgDumpPath(): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(getPgBinDir(), `pg_dump${ext}`);
}

export function getPsqlPath(): string {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(getPgBinDir(), `psql${ext}`);
}

/**
 * Parse DATABASE_URL into connection parameters suitable for pg_dump/psql env vars.
 */
export function parseDatabaseUrl(dbUrl: string): {
  PGHOST: string;
  PGPORT: string;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
} {
  const url = new URL(dbUrl);
  return {
    PGHOST: url.hostname || 'localhost',
    PGPORT: url.port || '5432',
    PGUSER: url.username || 'ipscscore',
    PGPASSWORD: decodeURIComponent(url.password || ''),
    PGDATABASE: url.pathname.slice(1) || 'ipscscore',
  };
}