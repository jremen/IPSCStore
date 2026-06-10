#!/usr/bin/env node

/**
 * Postinstall script for the Electron package.
 *
 * npm workspaces hoist dependencies to the root node_modules/, but
 * electron-builder only copies electron/node_modules/ into the packaged app.
 * This script copies hoisted dependencies that the Electron main process
 * uses via require() so they're available at runtime.
 *
 * Currently needed: dnssd-advertise (pure JS mDNS library)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const electronDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(electronDir, '..');
const rootModules = path.join(rootDir, 'node_modules');
const electronModules = path.join(electronDir, 'node_modules');

// Dependencies that the Electron main process uses via require()
// and that may be hoisted to the root node_modules/ by npm workspaces.
const HOISTED_DEPS = ['dnssd-advertise'];

for (const dep of HOISTED_DEPS) {
  const source = path.join(rootModules, dep);
  const target = path.join(electronModules, dep);

  if (fs.existsSync(target)) {
    // Already exists in electron/node_modules, skip
    continue;
  }

  if (!fs.existsSync(source)) {
    // Not in root node_modules either — maybe npm install hasn't run yet
    console.log(`[postinstall] ${dep} not found in root node_modules, skipping`);
    continue;
  }

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    copyDirSync(source, target);
    console.log(`[postinstall] Copied ${dep} to electron/node_modules/`);
  } catch (err) {
    console.warn(`[postinstall] Failed to copy ${dep}: ${err.message}`);
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}