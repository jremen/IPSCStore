#!/usr/bin/env node
/**
 * Bundle the backend with esbuild for the Electron production build.
 *
 * This creates a single JS file with all dependencies inlined,
 * eliminating the need for node_modules at runtime.
 * Migration SQL files are copied alongside the bundle.
 */

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const backendSrc = path.join(projectRoot, 'backend', 'src');
const outDir = path.join(__dirname, '..', 'dist-backend');

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'db', 'migrations'), { recursive: true });

// Stale .map files from prior builds (with sourcemap: true) are not
// overwritten when sourcemap: false, so remove them explicitly.
for (const file of fs.readdirSync(outDir)) {
  if (file.endsWith('.map')) {
    fs.unlinkSync(path.join(outDir, file));
  }
}

console.log('[bundle-backend] Bundling backend with esbuild...');

try {
  await esbuild.build({
    entryPoints: [path.join(backendSrc, 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: outDir,
    format: 'esm',
    // Inject __dirname and __filename shims for ESM compatibility
    // (Electron 34 uses Node.js 20 which doesn't support import.meta.dirname)
    banner: {
      js: [
        'import { fileURLToPath } from "url";',
        'import { dirname } from "path";',
        'const __filename = fileURLToPath(import.meta.url);',
        'const __dirname = dirname(__filename);',
      ].join('\n'),
    },
    // Don't mark any packages as external — bundle everything
    packages: 'bundle',
    // Mark Node.js built-in modules as external
    external: [],
    // Minification (optional, disabled for debugging)
    minify: false,
    // Source maps for debugging
    sourcemap: false,
    // Define NODE_ENV for production
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    // TypeScript config
    tsconfig: path.join(projectRoot, 'backend', 'tsconfig.json'),
  });

  console.log('[bundle-backend] Bundle created successfully');
} catch (err) {
  console.error('[bundle-backend] Bundle failed:', err);
  process.exit(1);
}

// Copy migration SQL files
console.log('[bundle-backend] Copying migration files...');
const migrationsSrc = path.join(backendSrc, 'db', 'migrations');
const migrationsDest = path.join(outDir, 'db', 'migrations');

if (fs.existsSync(migrationsSrc)) {
  // Ensure dest exists
  fs.mkdirSync(migrationsDest, { recursive: true });

  for (const file of fs.readdirSync(migrationsSrc)) {
    if (file.endsWith('.sql')) {
      fs.copyFileSync(
        path.join(migrationsSrc, file),
        path.join(migrationsDest, file)
      );
    }
  }
  console.log(`[bundle-backend] Copied migration files to ${migrationsDest}`);
} else {
  console.warn('[bundle-backend] WARNING: No migrations directory found at', migrationsSrc);
}

// Also copy compiled migrations if they exist (from tsc build)
const compiledMigrations = path.join(projectRoot, 'backend', 'dist', 'db', 'migrations');
if (fs.existsSync(compiledMigrations)) {
  for (const file of fs.readdirSync(compiledMigrations)) {
    if (file.endsWith('.sql')) {
      const destFile = path.join(migrationsDest, file);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(path.join(compiledMigrations, file), destFile);
      }
    }
  }
  console.log('[bundle-backend] Also copied compiled migration files');
}

// Write a package.json with "type": "module" so Node.js/Electron
// recognizes the bundle as ESM without the MODULE_TYPELESS_PACKAGE_JSON warning.
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2) + '\n'
);

console.log('[bundle-backend] Done! Output:', outDir);