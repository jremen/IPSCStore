import { app } from 'electron';
import path from 'path';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

/** Common system PostgreSQL binary directories to search */
const SYSTEM_PG_PATHS: Record<string, string[]> = {
  darwin: [
    '/opt/homebrew/opt/postgresql@16/bin',
    '/opt/homebrew/opt/postgresql@17/bin',
    '/opt/homebrew/opt/postgresql/bin',
    '/usr/local/opt/postgresql@16/bin',
    '/usr/local/opt/postgresql@17/bin',
    '/usr/local/opt/postgresql/bin',
    '/usr/local/bin',
  ],
  linux: [
    '/usr/lib/postgresql/16/bin',
    '/usr/lib/postgresql/17/bin',
    '/usr/bin',
  ],
  win32: [
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin',
  ],
};

export interface PgConfig {
  dataDir: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Manages a bundled PostgreSQL instance for the Electron app.
 * On first launch: initializes a data directory and creates the database.
 * On every launch: starts PostgreSQL and waits for readiness.
 * On quit: stops PostgreSQL gracefully.
 */
export class PgManager {
  private config: PgConfig;
  private pgBinDir: string;
  private initialized = false;

  constructor(config?: Partial<PgConfig>) {
    const userDataDir = app.getPath('userData');
    this.config = {
      dataDir: config?.dataDir || path.join(userDataDir, 'pgdata'),
      host: config?.host || '127.0.0.1',
      port: config?.port || 5433,
      database: config?.database || 'ipscscore',
      user: config?.user || 'ipscscore',
      password: config?.password || 'ipscscore',
    };

    // Determine PostgreSQL binary directory
    // Priority: PG_BIN_DIR env var > bundled (production) > system search (dev/fallback)
    if (process.env.PG_BIN_DIR) {
      this.pgBinDir = process.env.PG_BIN_DIR;
    } else {
      const isDev = process.env.ELECTRON_DEV === 'true';
      if (isDev) {
        // Dev mode: search system paths for PostgreSQL binaries
        this.pgBinDir = this.findSystemPgBin();
      } else {
        // Production: use bundled binaries
        this.pgBinDir = path.join(process.resourcesPath, 'pg', 'bin');
      }
    }

    console.log(`[PgManager] Using PostgreSQL binaries from: ${this.pgBinDir}`);
  }

  /** Search common system paths for PostgreSQL binaries */
  private findSystemPgBin(): string {
    const platform = process.platform;
    const paths = SYSTEM_PG_PATHS[platform] || SYSTEM_PG_PATHS.linux;

    // Use `which`/`where` to find pg_ctl in PATH first
    try {
      const result = require('child_process').execSync(
        platform === 'win32' ? 'where pg_ctl' : 'which pg_ctl',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      if (result) {
        // pg_ctl is in PATH — return its directory
        const binDir = path.dirname(result.split('\n')[0].trim());
        console.log(`[PgManager] Found pg_ctl in PATH: ${binDir}`);
        return binDir;
      }
    } catch {
      // pg_ctl not in PATH, fall through to search known directories
    }

    // Search known directories
    for (const dir of paths) {
      const pgCtlPath = path.join(dir, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
      try {
        require('fs').accessSync(pgCtlPath);
        console.log(`[PgManager] Found pg_ctl at: ${pgCtlPath}`);
        return dir;
      } catch {
        continue;
      }
    }

    // Last resort: return a reasonable default and let it fail with a clear error
    console.warn('[PgManager] Could not find PostgreSQL binaries in system paths');
    return paths[0];
  }

  /** Get the connection string for the database */
  getConnectionString(): string {
    return `postgresql://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
  }

  /** Check if a binary exists */
  private async binExists(name: string): Promise<boolean> {
    const binPath = this.getBin(name);
    try {
      await fs.access(binPath);
      return true;
    } catch {
      return false;
    }
  }

  /** Initialize PostgreSQL data directory on first launch */
  async initialize(): Promise<void> {
    // Check that pg_ctl exists before trying to initialize
    if (!await this.binExists('pg_ctl')) {
      throw new Error(
        `PostgreSQL binaries not found at: ${this.pgBinDir}\n\n` +
        'Options:\n' +
        '1. Set DATABASE_URL to use an external PostgreSQL server\n' +
        '2. Install PostgreSQL and set PG_BIN_DIR to its bin directory\n' +
        '3. Run with ELECTRON_DEV=true to search for system PostgreSQL\n' +
        `4. Download PostgreSQL binaries to ${this.pgBinDir}`
      );
    }

    // Check if the data directory is already a valid PG cluster
    // (has PG_VERSION file, not just an empty directory)
    const pgVersionFile = path.join(this.config.dataDir, 'PG_VERSION');
    try {
      await fs.access(pgVersionFile);
      // PG_VERSION exists — already initialized
      console.log('[PgManager] Data directory already initialized');
      return;
    } catch {
      // Not initialized — proceed with initdb
    }

    console.log('[PgManager] Initializing PostgreSQL data directory...');

    // Clean up any leftover directory if it exists
    try {
      await fs.rm(this.config.dataDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist, that's fine
    }

    console.log('[PgManager] Initializing PostgreSQL data directory...');

    // Create data directory
    await fs.mkdir(this.config.dataDir, { recursive: true });

    // Run initdb
    const initdb = this.getBin('initdb');
    await execFileAsync(initdb, [
      '-D', this.config.dataDir,
      '-U', this.config.user,
      '--auth=trust',
      '--encoding=UTF8',
    ]);

    // Start temporarily to create database
    await this.start();

    // Wait for readiness
    await this.waitReady();

    // Create the database
    const createdb = this.getBin('createdb');
    try {
      await execFileAsync(createdb, [
        '-h', this.config.host,
        '-p', String(this.config.port),
        '-U', this.config.user,
        this.config.database,
      ]);
    } catch (err) {
      // Database might already exist, that's OK
      console.log('[PgManager] Database may already exist, continuing...');
    }

    // Stop PostgreSQL after initialization
    await this.stop();

    this.initialized = true;
    console.log('[PgManager] PostgreSQL initialized successfully');
  }

  /** Start PostgreSQL */
  async start(): Promise<void> {
    console.log('[PgManager] Starting PostgreSQL...');

    // Ensure data directory exists
    await fs.mkdir(this.config.dataDir, { recursive: true });

    // Configure PostgreSQL to listen on our port
    const postgresConf = path.join(this.config.dataDir, 'postgresql.conf');
    try {
      await fs.access(postgresConf);
    } catch {
      // Create minimal postgresql.conf
      await fs.writeFile(postgresConf, [
        `listen_addresses = '${this.config.host}'`,
        `port = ${this.config.port}`,
        `max_connections = 100`,
        `shared_buffers = 128MB`,
      ].join('\n'));
    }

    const pgCtl = this.getBin('pg_ctl');
    const logFile = path.join(this.config.dataDir, 'pg.log');

    await execFileAsync(pgCtl, [
      'start',
      '-D', this.config.dataDir,
      '-l', logFile,
      '-o', `-p ${this.config.port}`,
      '-w', // Wait until started
    ]);

    console.log('[PgManager] PostgreSQL started');
  }

  /** Stop PostgreSQL gracefully */
  async stop(): Promise<void> {
    console.log('[PgManager] Stopping PostgreSQL...');
    const pgCtl = this.getBin('pg_ctl');

    try {
      await execFileAsync(pgCtl, [
        'stop',
        '-D', this.config.dataDir,
        '-m', 'fast',
        '-w',
      ]);
      console.log('[PgManager] PostgreSQL stopped');
    } catch (err) {
      console.error('[PgManager] Error stopping PostgreSQL:', err);
    }
  }

  /** Wait for PostgreSQL to be ready to accept connections */
  async waitReady(maxRetries = 30, delayMs = 1000): Promise<void> {
    // Use a simple TCP connection check instead of requiring psql binary
    const net = require('net');

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(2000);
          socket.on('connect', () => { socket.destroy(); resolve(); });
          socket.on('error', () => { socket.destroy(); reject(); });
          socket.on('timeout', () => { socket.destroy(); reject(); });
          socket.connect(this.config.port, this.config.host);
        });
        console.log('[PgManager] PostgreSQL is ready');
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('PostgreSQL failed to become ready within the timeout');
  }

  /** Get the full path to a PostgreSQL binary */
  private getBin(name: string): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.pgBinDir, `${name}${ext}`);
  }
}