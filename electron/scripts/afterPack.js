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

  // Only run for macOS builds during universal packaging
  if (context.electronPlatformName !== 'darwin') return;

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
};