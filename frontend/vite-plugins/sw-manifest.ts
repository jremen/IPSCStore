import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that generates a precache-manifest.json file in the build output.
 *
 * The service worker reads this manifest on install to pre-cache all app shell
 * resources (JS, CSS, HTML, icons, fonts) for offline support.
 */
export function generateSWManifest(): Plugin {
  return {
    name: 'generate-sw-manifest',
    apply: 'build',

    writeBundle(options, bundle) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');

      // Collect all output file names from the Vite bundle
      const assets = Object.keys(bundle)
        .filter((name) => {
          // Skip source maps and the SW itself
          return !name.endsWith('.map') && name !== 'sw.js';
        })
        .map((name) => `/${name}`);

      // Add static public files that aren't in the bundle
      const publicDir = path.resolve(process.cwd(), 'public');
      const publicFiles = listPublicFiles(publicDir)
        .map((f) => `/${f}`);

      // Deduplicate and sort
      const manifest = [...new Set([...assets, ...publicFiles, '/'])].sort();

      const manifestPath = path.join(outDir, 'precache-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`[sw-manifest] Generated precache manifest with ${manifest.length} entries`);
    },
  };
}

/**
 * Recursively list files in the public directory, relative to the public root.
 * Excludes .DS_Store and the service worker itself.
 */
function listPublicFiles(dir: string, base: string = ''): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.name === '.DS_Store') continue;

    if (entry.isDirectory()) {
      files.push(...listPublicFiles(fullPath, relPath));
    } else {
      files.push(relPath);
    }
  }

  return files;
}