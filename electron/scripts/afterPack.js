/**
 * afterPack hook for electron-builder.
 *
 * When building a universal macOS app, electron-builder creates separate
 * arm64 and x64 app bundles, then merges them with @electron/universal.
 * The merger requires that native binaries differ between the two builds
 * (so it can LIPO-merge them). But our bundled PostgreSQL binaries are
 * universal Mach-O files — identical in both builds — causing the merger
 * to fail with "same in both x64 and arm64 builds".
 *
 * This hook thins each universal binary down to a single architecture
 * (arm64 for the arm64 build, x86_64 for the x64 build) using `lipo -thin`.
 * The universal merger then sees different binaries and correctly
 * LIPO-merges them back into universal binaries in the final app.
 *
 * For Windows builds, validates that the bundled PG binaries match the
 * target architecture (x64 vs arm64).
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// electron-builder uses numeric arch enums from builder-util:
//   x64 = 1, arm64 = 3
// Map to lipo architecture names for `lipo -thin`
const LIPO_ARCH_MAP = {
  1: 'x86_64',  // x64
  3: 'arm64',   // arm64
};

exports.default = async function afterPack(context) {
  console.log('[afterPack] Hook called');
  console.log('[afterPack] Platform:', context.electronPlatformName, 'Arch:', context.arch);
  console.log('[afterPack] appOutDir:', context.appOutDir);

  // macOS: thin universal Mach-O binaries for per-arch builds
  if (context.electronPlatformName === 'darwin') {
    await thinMacBinaries(context);
  }

  // Windows: validate PG binary architecture matches target
  if (context.electronPlatformName === 'win32') {
    validateWindowsPgArch(context);
  }

  // Linux: validate PG binary ELF architecture matches target
  if (context.electronPlatformName === 'linux') {
    validateLinuxPgArch(context);
    validateLinuxSharedLibs(context);
  }
};

async function thinMacBinaries(context) {
  const arch = context.arch;
  const lipoArch = LIPO_ARCH_MAP[arch];
  if (!lipoArch) {
    console.log('[afterPack] Skipping — not a per-arch build (arch=' + arch + ')');
    return;
  }

  // Find the .app bundle inside appOutDir
  let appBundlePath = null;
  const entries = fs.readdirSync(context.appOutDir);
  for (const entry of entries) {
    const fullPath = path.join(context.appOutDir, entry);
    if (entry.endsWith('.app') && fs.statSync(fullPath).isDirectory()) {
      appBundlePath = fullPath;
      break;
    }
  }

  if (!appBundlePath) {
    console.log('[afterPack] No .app bundle found in appOutDir, skipping');
    return;
  }

  const resourcesPath = path.join(appBundlePath, 'Contents', 'Resources');
  const pgDir = path.join(resourcesPath, 'pg');

  console.log('[afterPack] appBundlePath:', appBundlePath);
  console.log('[afterPack] resourcesPath:', resourcesPath);

  if (!fs.existsSync(pgDir)) {
    console.log('[afterPack] PG directory not found at', pgDir, ', skipping');
    return;
  }

  console.log(`[afterPack] Thinning PG binaries to ${lipoArch} for ${arch} build...`);

  let thinned = 0;
  // Thin all executables and shared libraries in pg/bin, pg/lib, and pg/lib/postgresql
  for (const subdir of ['bin', 'lib', 'lib/postgresql']) {
    const dir = path.join(pgDir, subdir);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      try {
        if (!fs.statSync(filePath).isFile()) continue;

        const fileInfo = execSync(`file "${filePath}"`, { encoding: 'utf-8' });
        // Only thin universal (fat) Mach-O binaries
        if (!fileInfo.includes('universal')) continue;

        execSync(`lipo -thin ${lipoArch} -output "${filePath}" "${filePath}"`, { stdio: 'pipe' });
        console.log(`[afterPack]   Thinned: ${subdir}/${file} → ${lipoArch}`);
        thinned++;
      } catch (e) {
        console.log(`[afterPack]   Skipped: ${subdir}/${file} (${e.message})`);
      }
    }
  }

  console.log(`[afterPack] Done — thinned ${thinned} file(s)`);
}

/**
 * Validate that the bundled PostgreSQL binaries match the target Windows architecture.
 * On Windows ARM64, x64 PG binaries require x64 emulation which may not be available.
 * Detects mismatched DLLs (e.g., libcrypto-3-x64.dll in an arm64 build) and warns.
 */
function validateWindowsPgArch(context) {
  const arch = context.arch;
  // electron-builder arch: 1 = x64, 3 = arm64
  const targetArch = arch === 3 ? 'arm64' : 'x64';

  const pgDir = path.join(context.appOutDir, 'resources', 'pg');
  if (!fs.existsSync(pgDir)) {
    console.log('[afterPack] PG directory not found at', pgDir, ', skipping validation');
    return;
  }

  const pgBinDir = path.join(pgDir, 'bin');
  if (!fs.existsSync(pgBinDir)) {
    console.log('[afterPack] PG bin directory not found, skipping validation');
    return;
  }

  // Check for architecture markers in DLL filenames
  // EDB x64 binaries have names like: libcrypto-3-x64.dll, libssl-3-x64.dll, wx*_x64_custom.dll
  // ARM64 binaries from theseus-rs would NOT have "x64" in their DLL names
  const x64Markers = fs.readdirSync(pgBinDir).filter(f =>
    f.toLowerCase().includes('x64') && f.endsWith('.dll')
  );

  if (targetArch === 'arm64' && x64Markers.length > 0) {
    // This is expected — no native ARM64 PG binaries exist for Windows.
    // The download-pg:win-arm64 script intentionally uses x64 binaries
    // which run under Windows x64 emulation on ARM64.
    console.log(`[afterPack] Windows ARM64 build using x64 PG binaries (x64 emulation required)`);
    x64Markers.forEach(f => console.log(`[afterPack]   - ${f}`));
  } else if (targetArch === 'arm64' && x64Markers.length === 0) {
    // Unexpected: ARM64 build with no x64 markers — maybe wrong binaries were downloaded
    console.warn(`[afterPack] WARNING: Building for Windows ARM64 but no x64 DLL markers found in PG bin/`);
    console.warn(`[afterPack] Expected x64 PG binaries (running under emulation). The PG binaries may be wrong.`);
  } else if (targetArch === 'x64' && x64Markers.length === 0) {
    console.warn(`[afterPack] WARNING: Building for Windows x64 but no x64 DLL markers found in PG bin/`);
    console.warn(`[afterPack] The PG binaries may be for a different architecture.`);
  } else {
    console.log(`[afterPack] PG binary architecture looks correct for ${targetArch}`);
  }
}

/**
 * Validate that the bundled PostgreSQL binaries match the target Linux architecture.
 * On Linux ARM64, x86-64 binaries cause a cryptic shell error because the kernel
 * returns ENOEXEC, glibc falls back to /bin/sh, and dash tries to parse ELF as a script.
 * This check catches the mismatch at build time with a clear error message.
 *
 * ELF header reference:
 *   Bytes 0-3:   Magic (\x7fELF)
 *   Byte 4:      Class (2 = 64-bit)
 *   Byte 5:      Data encoding (1 = little-endian)
 *   Bytes 18-19: e_machine (0x3E = x86-64, 0xB7 = AArch64)
 */
function validateLinuxPgArch(context) {
  const arch = context.arch;
  // electron-builder arch: 1 = x64, 3 = arm64
  const targetArch = arch === 3 ? 'arm64' : 'x64';

  const pgDir = path.join(context.appOutDir, 'resources', 'pg');
  if (!fs.existsSync(pgDir)) {
    console.log('[afterPack] PG directory not found at', pgDir, ', skipping validation');
    return;
  }

  const pgBinDir = path.join(pgDir, 'bin');
  if (!fs.existsSync(pgBinDir)) {
    console.log('[afterPack] PG bin directory not found, skipping validation');
    return;
  }

  // ELF e_machine values
  const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // \x7fELF
  const E_MACHINE = { x86_64: 0x3e, arm64: 0xb7 };

  // Read the first bytes of initdb to check the ELF header
  const initdbPath = path.join(pgBinDir, 'initdb');
  if (!fs.existsSync(initdbPath)) {
    console.log('[afterPack] initdb not found at', initdbPath, ', skipping validation');
    return;
  }

  const fd = fs.openSync(initdbPath, 'r');
  try {
    const header = Buffer.alloc(20);
    fs.readSync(fd, header, 0, 20, 0);

    // Check ELF magic
    if (header.subarray(0, 4).equals(ELF_MAGIC)) {
      const e_machine = header.readUInt16LE(18);
      const actualArch = e_machine === E_MACHINE.arm64 ? 'arm64'
        : e_machine === E_MACHINE.x86_64 ? 'x64'
        : `unknown (0x${e_machine.toString(16)})`;

      console.log(`[afterPack] PG initdb ELF e_machine: 0x${e_machine.toString(16)} (${actualArch}), target: ${targetArch}`);

      if (targetArch === 'arm64' && e_machine !== E_MACHINE.arm64) {
        throw new Error(
          `[afterPack] BUILD FAILED: Linux ARM64 AppImage requires AArch64 PostgreSQL binaries, ` +
          `but initdb is ${actualArch}.\n` +
          `Run: npm run download-pg:linux-arm64\n` +
          `Then rebuild with: npm run build:linux-arm64`
        );
      }

      if (targetArch === 'x64' && e_machine !== E_MACHINE.x86_64) {
        throw new Error(
          `[afterPack] BUILD FAILED: Linux x64 AppImage requires x86_64 PostgreSQL binaries, ` +
          `but initdb is ${actualArch}.\n` +
          `Run: npm run download-pg:linux\n` +
          `Then rebuild with: npm run build:linux`
        );
      }

      console.log(`[afterPack] PG binary architecture is correct for ${targetArch}`);
    } else {
      console.log(`[afterPack] initdb is not an ELF binary (file magic: ${header.subarray(0, 4).toString('hex')}), skipping architecture check`);
    }
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Check that key shared libraries are present in pg/lib/.
 * If they're missing, the Linux AppImage will fail with "cannot open shared object file".
 * This catches the case where download-pg.sh ran on macOS without Docker or ldd.
 */
function validateLinuxSharedLibs(context) {
  const pgDir = path.join(context.appOutDir, 'resources', 'pg');
  if (!fs.existsSync(pgDir)) return;

  const pgLibDir = path.join(pgDir, 'lib');
  if (!fs.existsSync(pgLibDir)) {
    console.log('[afterPack] WARNING: pg/lib/ directory not found — shared libraries may be missing');
    return;
  }

  // libxml2 is the most common missing dep (PG is built with --with-libxml)
  const required = ['libxml2.so.2'];
  const missing = required.filter((name) => {
    // Check for exact match or glob (libxml2.so.2 or libxml2.so.2.*)
    const matches = fs.readdirSync(pgLibDir).filter((f) =>
      f === name || f.startsWith(name + '.')
    );
    return matches.length === 0;
  });

  if (missing.length > 0) {
    console.warn(
      `[afterPack] WARNING: Missing shared libraries in pg/lib/: ${missing.join(', ')}\n` +
      `  The Linux AppImage will fail at runtime with "cannot open shared object file".\n` +
      `  Ensure download-pg.sh ran with Docker or ldd available.`
    );
  } else {
    console.log('[afterPack] Shared library check passed');
  }
}