import { app } from 'electron';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { openSync, readSync, closeSync, existsSync } from 'fs';
import { log, logError, getLogPath } from './logger.js';

const execFileAsync = promisify(execFile);

/** Whether we're running on Windows */
const isWin32 = process.platform === 'win32';

/** Whether we're running on Linux ARM64 */
const isLinuxArm64 = process.platform === 'linux' && process.arch === 'arm64';

/**
 * Read the ELF e_machine field from a binary file.
 * Returns the machine type number, or null if the file is not a valid ELF.
 *
 * ELF header: bytes 0-3 = magic (\x7fELF), bytes 18-19 = e_machine (LE)
 */
async function readElfMachine(binPath: string): Promise<number | null> {
  try {
    const fh = await fs.open(binPath, 'r');
    try {
      const buf = Buffer.alloc(20);
      const { bytesRead } = await fh.read(buf, 0, 20, 0);
      if (bytesRead < 20) return null;
      if (buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) return null;
      return buf.readUInt16LE(18);
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }
}

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

/** NTSTATUS code → human-readable name for Windows error diagnostics */
const NTSTATUS_CODES: Record<number, string> = {
  0xc0000135: 'STATUS_DLL_NOT_FOUND',
  0xc000007b: 'STATUS_INVALID_IMAGE_FORMAT',
  0xc0000142: 'STATUS_DLL_INIT_FAILED',
  0xc0000409: 'STATUS_STACK_BUFFER_OVERRUN',
  0xc0000005: 'STATUS_ACCESS_VIOLATION',
  0xc000001d: 'STATUS_ILLEGAL_INSTRUCTION',
};

function statusToString(status: number): string {
  const name = NTSTATUS_CODES[status];
  const hex = `0x${(status >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  return name ? `${name} (${hex})` : hex;
}

/**
 * Parse the PE Import Directory of a Windows executable to discover its
 * required DLL dependencies. Returns an array of DLL filenames.
 * Uses pure-JS pointer arithmetic — no dumpbin or external tool needed.
 */
function parsePeImports(binPath: string): string[] {
  const fd = openSync(binPath, 'r');
  try {
    const fileSize = 1024 * 1024;
    const buf = Buffer.alloc(fileSize);
    const bytesRead = readSync(fd, buf, 0, fileSize, 0);
    const data = buf.subarray(0, bytesRead);
    if (data.length < 4 || data.readUInt16LE(0) !== 0x5A4D) return [];

    const peOffset = data.readUInt32LE(0x3C);
    if (peOffset + 4 > data.length || data.readUInt32LE(peOffset) !== 0x00004550) return [];

    const fileHeader = data.subarray(peOffset + 4, peOffset + 24);
    const numSections = fileHeader.readUInt16LE(2);
    const optHeaderSize = fileHeader.readUInt16LE(16);

    const sectionTableOffset = peOffset + 24;
    const optHeader = data.subarray(sectionTableOffset, sectionTableOffset + optHeaderSize);
    const magic = optHeader.readUInt16LE(0);
    if (magic !== 0x020b && magic !== 0x010b) return [];

    const numRvaAndSizesOff = magic === 0x020b ? 0x6c : 0x60;
    const importDirOff = magic === 0x020b ? 0x70 + 8 : 0x60 + 8;
    const numRvaAndSizes = optHeader.readUInt32LE(numRvaAndSizesOff);
    if (numRvaAndSizes < 2) return [];

    const importRva = optHeader.readUInt32LE(importDirOff);
    if (importRva === 0) return [];

    // Build section table for RVA → file offset resolution
    const sections: Array<{ rva: number; size: number; offset: number }> = [];
    for (let i = 0; i < numSections; i++) {
      const s = sectionTableOffset + optHeaderSize + i * 40;
      if (s + 40 > data.length) break;
      sections.push({
        rva: data.readUInt32LE(s + 12),
        size: data.readUInt32LE(s + 8),
        offset: data.readUInt32LE(s + 20),
      });
    }

    const rvaToOffset = (rva: number): number => {
      for (const s of sections) {
        if (rva >= s.rva && rva < s.rva + s.size) return s.offset + (rva - s.rva);
      }
      return -1;
    };

    // Walk IMAGE_IMPORT_DESCRIPTOR array (20 bytes each, zero-terminated)
    const importDataOff = rvaToOffset(importRva);
    if (importDataOff < 0) return [];

    const dlls: string[] = [];
    for (let off = importDataOff; off + 20 <= data.length; off += 20) {
      const origFirstThunk = data.readUInt32LE(off);
      const nameRva = data.readUInt32LE(off + 12);
      if (origFirstThunk === 0 && nameRva === 0) break;
      if (nameRva === 0) continue;

      const nameOff = rvaToOffset(nameRva);
      if (nameOff < 0 || nameOff >= data.length) continue;

      let end = nameOff;
      while (end < data.length && data[end] !== 0) end++;
      const dllName = data.toString('utf-8', nameOff, end);
      if (dllName) dlls.push(dllName);
    }

    return [...new Set(dlls)];
  } finally {
    closeSync(fd);
  }
}

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

    log(`[PgManager] Using PostgreSQL binaries from: ${this.pgBinDir}`);
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
        log(`[PgManager] Found pg_ctl in PATH: ${binDir}`);
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
        log(`[PgManager] Found pg_ctl at: ${pgCtlPath}`);
        return dir;
      } catch {
        continue;
      }
    }

    // Last resort: return a reasonable default and let it fail with a clear error
    log('[PgManager] Could not find PostgreSQL binaries in system paths');
    return paths[0];
  }

  /**
   * Check that PostgreSQL binaries can load all required shared libraries on Linux.
   * Runs `ldd` on a small PG binary (e.g. pg_config or initdb) to detect missing deps.
   * Returns an array of missing library objects, or empty if all deps are satisfied.
   */
  private async checkLinuxSharedLibs(): Promise<Array<{ name: string; path: string }>> {
    if (process.platform !== 'linux') return [];

    // Find a suitable binary to check — prefer pg_config (small, no PG instance needed)
    const candidates = ['pg_config', 'initdb', 'postgres', 'pg_ctl'];
    let checkBin = '';
    for (const name of candidates) {
      const p = this.getBin(name);
      try {
        await fs.access(p);
        checkBin = p;
        break;
      } catch {
        continue;
      }
    }
    if (!checkBin) {
      log('[PgManager] No PG binary found to check shared libraries');
      return [];
    }

    try {
      // Run ldd to list all shared library dependencies
      const { stdout } = await execFileAsync('ldd', [checkBin], { timeout: 5000 });
      const missing: Array<{ name: string; path: string }> = [];

      for (const line of stdout.split('\n')) {
        // ldd output format:
        //   "libxml2.so.2 => /usr/lib/aarch64-linux-gnu/libxml2.so.2 (0x...)"  — found
        //   "libxml2.so.2 => not found"  — missing
        //   "linux-vdso.so.1 (0x...)"  — kernel-provided, always available
        const notFound = line.match(/^\s*(\S+)\s+=>\s+not found$/);
        if (notFound) {
          missing.push({ name: notFound[1], path: 'not found' });
          continue;
        }

        // Also catch direct errors from ldd itself
        const directError = line.match(/^\s*(\S+)\s+=>\s*$/);
        if (directError) {
          missing.push({ name: directError[1], path: 'not found' });
        }
      }

      if (missing.length > 0) {
        log(`[PgManager] Missing shared libraries: ${missing.map(m => m.name).join(', ')}`);
      }
      return missing;
    } catch (err: any) {
      // ldd might fail if the binary is completely broken
      log(`[PgManager] Cannot check shared libraries (ldd failed): ${err?.message || String(err)}`);
      return [];
    }
  }

  /**
   * On Windows, check that all DLLs imported by initdb.exe are loadable
   * before actually running it. Missing DLLs (especially vcruntime140.dll
   * and msvcp140.dll from the Visual C++ Runtime) cause a silent startup
   * failure with no stdout/stderr. Catches the issue early with an
   * actionable error message.
   */
  private checkWindowsDlls(): void {
    if (process.platform !== 'win32') return;

    const initdbPath = this.getBin('initdb');
    let requiredDlls: string[];
    try {
      requiredDlls = parsePeImports(initdbPath);
    } catch (err: any) {
      log(`[PgManager] Windows preflight: could not parse PE imports: ${err?.message}`);
      return;
    }

    if (requiredDlls.length === 0) {
      log('[PgManager] Windows preflight: no DLL imports found (unusual)');
      return;
    }

    log(`[PgManager] Windows preflight: ${requiredDlls.length} DLL(s) required by initdb`);

    const searchPaths = [
      this.pgBinDir,
      'C:\\Windows\\System32',
    ];

    const missing: Array<{ name: string; foundIn: string | null }> = [];
    for (const dll of requiredDlls) {
      // Skip API set forwarders (api-ms-*, ext-ms-*) — these are virtual
      // DLLs resolved by the Windows loader via the API set schema, not
      // physical files. Always available on Windows 10+, cannot be checked
      // with existsSync.
      const lower = dll.toLowerCase();
      if (lower.startsWith('api-ms-') || lower.startsWith('ext-ms-')) {
        log(`  ${dll}: API set (skipped)`);
        continue;
      }
      let foundIn: string | null = null;
      for (const sp of searchPaths) {
        if (existsSync(path.join(sp, dll))) {
          foundIn = sp;
          break;
        }
      }
      missing.push({ name: dll, foundIn });
    }

    for (const m of missing) {
      log(`  ${m.name}: ${m.foundIn ? `found in ${m.foundIn}` : 'MISSING'}`);
    }

    const trulyMissing = missing.filter(m => !m.foundIn);
    if (trulyMissing.length === 0) {
      log('[PgManager] Windows preflight: all DLLs found');
      return;
    }

    const systemMissing = trulyMissing.filter(m => !existsSync(path.join(this.pgBinDir, m.name)));
    const bundledMissing = trulyMissing.filter(m => existsSync(path.join(this.pgBinDir, m.name)));

    let helpMsg = '';
    if (systemMissing.length > 0) {
      helpMsg +=
        `Missing system DLLs:\n  ${systemMissing.map(m => m.name).join(', ')}\n\n` +
        'This usually means Microsoft Visual C++ 2015-2022 Redistributable (x64) is not installed.\n' +
        'Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe\n';
    }
    if (bundledMissing.length > 0) {
      helpMsg +=
        `Missing bundled DLLs (expected in ${this.pgBinDir}):\n` +
        `  ${bundledMissing.map(m => m.name).join(', ')}\n\n` +
        'Re-run download-pg.sh to re-download the PostgreSQL binaries,\n' +
        'or check that the build process copied all DLLs to the pg/bin/ directory.\n';
    }

    throw new Error(
      `PostgreSQL cannot start on Windows: missing required DLLs\n\n${helpMsg}\n` +
      `Log file: ${getLogPath()}`
    );
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

    // On Windows ARM64, note that we're running x64 binaries under emulation
    // (no native ARM64 PG binaries exist for Windows)
    if (isWin32 && process.arch === 'arm64') {
      log('[PgManager] Running on Windows ARM64 with x64 PostgreSQL binaries (x64 emulation)');
    }

    // Check if the data directory is already a valid PG cluster
    // (has PG_VERSION file, not just an empty directory)
    const pgVersionFile = path.join(this.config.dataDir, 'PG_VERSION');
    try {
      await fs.access(pgVersionFile);
      // PG_VERSION exists — already initialized
      log('[PgManager] Data directory already initialized');
      return;
    } catch {
      // Not initialized — proceed with initdb
    }

    log('[PgManager] Initializing PostgreSQL data directory...');

    // Clean up any leftover directory if it exists
    try {
      await fs.rm(this.config.dataDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist, that's fine
    }

    // Create data directory
    await fs.mkdir(this.config.dataDir, { recursive: true });

    // On Linux ARM64, verify PG binary is actually AArch64 before running initdb
    if (isLinuxArm64) {
      const initdbPath = this.getBin('initdb');
      const eMachine = await readElfMachine(initdbPath);
      if (eMachine !== null && eMachine !== 0xb7) {
        const archName = eMachine === 0x3e ? 'x86_64' : `0x${eMachine.toString(16)}`;
        throw new Error(
          `PostgreSQL binary is ${archName} but this is Linux ARM64. ` +
          `Download the ARM64 build:\n` +
          `  npm run download-pg:linux-arm64\n` +
          `Then rebuild the app.\n` +
          `See electron/scripts/download-pg.sh for fallback options.`
        );
      }
    }

    // On Linux, check that shared libraries are loadable before running initdb.
    // Missing libraries produce cryptic errors (ENOEXEC / "/bin/sh" fallback) that are
    // hard to debug. Catch them early with a clear error message and install instructions.
    if (process.platform === 'linux') {
      const missing = await this.checkLinuxSharedLibs();
      if (missing.length > 0) {
        const libNames = missing.map((m: { name: string; path: string }) => m.name);
        const pkgNames = libNames.map((n: string) => n.replace(/\.so.*/, ''));
        throw new Error(
          `PostgreSQL cannot start: missing shared libraries: ${libNames.join(', ')}\n\n` +
          `Install the required libraries:\n` +
          `  Debian/Ubuntu:  sudo apt install ${pkgNames.join(' ')}\n` +
          `  Fedora/RHEL:    sudo dnf install ${pkgNames.join(' ')}\n` +
          `  Arch Linux:     sudo pacman -S ${pkgNames.join(' ')}\n\n` +
          `Alternatively, set PG_BIN_DIR to point to a system PostgreSQL installation,\n` +
          `or set DATABASE_URL to connect to an external PostgreSQL server.`
        );
      }
    }

    // On Windows, check DLL dependencies before running initdb.
    // A missing DLL (e.g. vcruntime140.dll from the Visual C++ Runtime)
    // causes initdb.exe to fail silently — the Windows loader exits the
    // process before main() runs, so there is no stdout/stderr to capture.
    if (process.platform === 'win32') {
      this.checkWindowsDlls();
    }

    // Run initdb
    const initdb = this.getBin('initdb');
    const env = this.getEnvWithBinPath();
    log(`[PgManager] Running initdb: ${initdb} -D "${this.config.dataDir}" -U ${this.config.user} --auth=trust --encoding=UTF8 --locale=C`);

    try {
      const { stdout, stderr } = await execFileAsync(initdb, [
        '-D', this.config.dataDir,
        '-U', this.config.user,
        '--auth=trust',
        '--encoding=UTF8',
        '--locale=C',
      ], { env, timeout: 60000 });
      if (stdout) log(`[PgManager] initdb stdout: ${stdout.substring(0, 500)}`);
      if (stderr) log(`[PgManager] initdb stderr: ${stderr.substring(0, 500)}`);
    } catch (err: any) {
      // Capture initdb output for better error reporting
      const initdbOut = err?.stdout ? `\nOutput: ${err.stdout.substring(0, 500)}` : '';
      const initdbErr = err?.stderr ? `\nError output: ${err.stderr.substring(0, 500)}` : '';

      // Log detailed error info (especially useful on Windows where
      // NTSTATUS codes like STATUS_DLL_NOT_FOUND are otherwise hidden)
      const exitCode = err?.status !== undefined ? err.status : null;
      const statusHex = exitCode !== null
        ? `0x${(exitCode >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
        : '';
      const statusName = exitCode !== null ? statusToString(exitCode) : '';
      const errDetails = [
        err?.code ? `code=${err.code}` : '',
        statusName ? `status=${statusName}` : exitCode !== null ? `status=${exitCode}` : '',
        err?.signal ? `signal=${err.signal}` : '',
        err?.killed ? 'killed=true' : '',
        err?.path ? `path=${err.path}` : '',
      ].filter(Boolean).join('; ');
      if (errDetails) {
        logError(`[PgManager] initdb failed — ${errDetails}${initdbOut}${initdbErr}`, err?.message || String(err));
      } else {
        logError(`[PgManager] initdb failed${initdbOut}${initdbErr}`, err?.message || String(err));
      }

      // On Windows ARM64, provide a helpful hint about x64 emulation
      if (isWin32 && process.arch === 'arm64') {
        throw new Error(
          `initdb failed on Windows ARM64. No native ARM64 PostgreSQL binaries exist for Windows,\n` +
          `so the app uses x64 binaries under Windows x64 emulation.\n` +
          `Error: ${err?.message || String(err)}${initdbErr}\n\n` +
          `Make sure Windows x64 emulation is enabled (Settings > System > Optional features).\n\n` +
          `Alternatively, set DATABASE_URL to use an external PostgreSQL server.`
        );
      }

      throw new Error(
        `initdb failed: ${err?.message || String(err)}${initdbOut}${initdbErr}\n\n` +
        `Log file: ${getLogPath()}`
      );
    }

    log('[PgManager] PostgreSQL initialized successfully');
  }

  /**
   * Check whether a PostgreSQL server is already running for this data directory.
   * Reads postmaster.pid and checks if the PID is alive and responds on our port.
   */
  private async isPostgresRunning(): Promise<boolean> {
    const pidFile = path.join(this.config.dataDir, 'postmaster.pid');
    try {
      const pidData = await fs.readFile(pidFile, 'utf-8');
      const pid = parseInt(pidData.split('\n')[0], 10);
      if (!pid || isNaN(pid)) return false;

      // Check if the process is alive
      try {
        process.kill(pid, 0);
      } catch {
        return false;
      }

      // Also verify it is accepting connections on our port
      try {
        await this.waitReady(2, 500);
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Clean up a stale postmaster.pid file left by a crashed or forcibly killed server.
   */
  private async cleanStalePidFile(): Promise<void> {
    const pidFile = path.join(this.config.dataDir, 'postmaster.pid');
    try {
      await fs.unlink(pidFile);
      log('[PgManager] Removed stale postmaster.pid');
    } catch {
      // ignore
    }
  }

  /** Start PostgreSQL */
  async start(): Promise<void> {
    log('[PgManager] Starting PostgreSQL...');

    // Ensure data directory exists
    await fs.mkdir(this.config.dataDir, { recursive: true });

    // If postgres is already running for this data directory, just use it.
    // This prevents spurious failures when a previous instance didn't shut down cleanly.
    if (await this.isPostgresRunning()) {
      log('[PgManager] PostgreSQL is already running for this data directory');
      return;
    }

    // No running server — clean up any stale PID file before starting
    await this.cleanStalePidFile();

    // Configure PostgreSQL to listen on our port
    const postgresConf = path.join(this.config.dataDir, 'postgresql.conf');

    // The compiled-in dynamic_library_path points to the EDB install dir
    // (e.g. C:\Program Files\PostgreSQL\16\lib on Windows or
    // /opt/pginstaller_16.auto/... on macOS) which doesn't exist in our bundled app.
    // Set it to our bundled lib directory instead.
    const pgLibDir = path.join(path.dirname(this.pgBinDir), 'lib');
    // Use forward slashes for PostgreSQL config (even on Windows)
    const pgLibDirPg = pgLibDir.replace(/\\/g, '/');
    const dynamicLibraryPathLine = `dynamic_library_path = '${pgLibDirPg}'`;

    try {
      await fs.access(postgresConf);
      // Config file exists — ensure dynamic_library_path is set
      const existingConf = await fs.readFile(postgresConf, 'utf-8');
      if (!existingConf.includes('dynamic_library_path')) {
        // Append the setting if it's missing (upgrades from older versions)
        await fs.appendFile(postgresConf, `\n${dynamicLibraryPathLine}\n`);
        log('[PgManager] Added dynamic_library_path to existing postgresql.conf');
      }
    } catch {
      // Create minimal postgresql.conf
      const confLines = [
        `listen_addresses = '${this.config.host}'`,
        `port = ${this.config.port}`,
        `max_connections = 100`,
        `shared_buffers = 128MB`,
        dynamicLibraryPathLine,
      ];

      await fs.writeFile(postgresConf, confLines.join('\n'));
    }

    const pgCtl = this.getBin('pg_ctl');
    const logFile = path.join(this.config.dataDir, 'pg.log');
    const env = this.getEnvWithBinPath();

    // On Windows, pg_ctl start -w can hang because postgres.exe is a console app
    // that doesn't detach properly. Use -w on macOS/Linux, but skip it on Windows
    // and use our own readiness check instead.
    const args = [
      'start',
      '-D', this.config.dataDir,
      '-l', logFile,
      '-o', `-p ${this.config.port}`,
    ];

    if (!isWin32) {
      args.push('-w'); // Wait until started (works reliably on Unix)
    }

    const tryStart = async (): Promise<void> => {
      try {
        const { stdout, stderr } = await execFileAsync(pgCtl, args, { env, timeout: 30000 });
        if (stdout) log(`[PgManager] pg_ctl stdout: ${stdout.substring(0, 300)}`);
        if (stderr) log(`[PgManager] pg_ctl stderr: ${stderr.substring(0, 300)}`);
      } catch (err: any) {
        // Log pg_ctl output for debugging
        const ctlOut = err?.stdout ? `\nOutput: ${err.stdout.substring(0, 300)}` : '';
        const ctlErr = err?.stderr ? `\nError: ${err.stderr.substring(0, 300)}` : '';
        // On Windows, pg_ctl start without -w returns immediately, so this
        // shouldn't timeout. On Unix with -w, a timeout means PG didn't start.
        if (isWin32 && err?.killed) {
          // Timeout on Windows — pg_ctl might not have started yet, but that's OK
          // We'll check readiness in waitReady()
          log(`[PgManager] pg_ctl start timed out (Windows), checking readiness...${ctlOut}${ctlErr}`);
        } else if (!isWin32) {
          logError(`[PgManager] pg_ctl start failed${ctlOut}${ctlErr}`, err);
          throw err;
        } else {
          // Windows non-timeout error — log but continue to readiness check
          logError(`[PgManager] pg_ctl start error (continuing)${ctlOut}${ctlErr}`, err?.message || String(err));
        }
      }
    };

    await tryStart();

    // On Windows, always wait for readiness manually since we can't rely on -w
    if (isWin32) {
      await this.waitReady(60, 1000);
    } else {
      // On Unix, pg_ctl -w already waited, but do a quick sanity check.
      try {
        await this.waitReady(5, 500);
      } catch {
        // If it didn't become ready, retry once (e.g. stale lock file was cleaned)
        log('[PgManager] First start did not become ready, retrying once...');
        await this.cleanStalePidFile();
        await tryStart();
        await this.waitReady(30, 1000);
      }
    }

    // Ensure the target database exists (create it if not).
    // This decouples database creation from initdb, so if initdb completed
    // but database creation was interrupted (e.g. crash, power loss), the
    // next launch self-heals instead of failing with "database does not exist".
    await this.ensureDatabase();

    log('[PgManager] PostgreSQL started');
  }

  /** Ensure the target database exists; create it if not. */
  private async ensureDatabase(): Promise<void> {
    const createdb = this.getBin('createdb');
    const env = this.getEnvWithBinPath();
    try {
      await execFileAsync(createdb, [
        '-h', this.config.host,
        '-p', String(this.config.port),
        '-U', this.config.user,
        this.config.database,
      ], { env });
    } catch {
      log('[PgManager] Database may already exist, continuing...');
    }
  }

  /** Stop PostgreSQL gracefully */
  async stop(): Promise<void> {
    log('[PgManager] Stopping PostgreSQL...');
    const pgCtl = this.getBin('pg_ctl');
    const env = this.getEnvWithBinPath();

    try {
      await execFileAsync(pgCtl, [
        'stop',
        '-D', this.config.dataDir,
        '-m', 'fast',
        '-w',
      ], { env });
      log('[PgManager] PostgreSQL stopped');
    } catch (err) {
      logError('[PgManager] Error stopping PostgreSQL:', err);
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
        log('[PgManager] PostgreSQL is ready');
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

  /**
   * Get environment variables with the PostgreSQL bin directory added to PATH.
   * On Windows, postgres.exe and pg_ctl.exe need their DLLs (libpq.dll, etc.)
   * to be found via PATH or in the same directory. Adding the bin dir to PATH
   * ensures the DLLs are found even when the working directory differs.
   * On Linux, LD_LIBRARY_PATH is set to pg/lib/ as a safety net alongside RPATH.
   */
  private getEnvWithBinPath(): Record<string, string> {
    const env = { ...process.env as Record<string, string> };
    const pathSep = isWin32 ? ';' : ':';
    const existingPath = env.PATH || env.Path || '';
    // On Windows, env variables can be PATH or Path (case-insensitive)
    const pathKey = isWin32 ? 'PATH' : 'PATH';
    env[pathKey] = this.pgBinDir + pathSep + existingPath;
    // On Windows, also set Path for compatibility
    if (isWin32) {
      env.Path = env[pathKey];
    }
    // On Linux, set LD_LIBRARY_PATH so the dynamic linker finds bundled .so files
    // in pg/lib/ even if RPATH isn't set on a particular binary (belt-and-suspenders).
    if (process.platform === 'linux') {
      const pgLibDir = path.join(this.pgBinDir, '..', 'lib');
      const existingLdLibPath = env.LD_LIBRARY_PATH || '';
      env.LD_LIBRARY_PATH = existingLdLibPath
        ? `${pgLibDir}:${existingLdLibPath}`
        : pgLibDir;
    }
    return env;
  }
}