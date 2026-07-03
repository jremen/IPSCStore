#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = [
  './package.json',
  './frontend/package.json',
  './backend/package.json',
  './electron/package.json',
];

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

function bump(version, level) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (level === 'patch') {
    if (patch < 9) return `${major}.${minor}.${patch + 1}`;
    if (minor < 9) return `${major}.${minor + 1}.0`;
    return `${major + 1}.0.0`;
  }
  if (level === 'minor') {
    if (minor < 9) return `${major}.${minor + 1}.0`;
    return `${major + 1}.0.0`;
  }
  if (level === 'major') {
    return `${major + 1}.0.0`;
  }
  throw new Error(`Unknown level: ${level}. Expected patch, minor, or major.`);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    console.error(`Error: Cannot read or parse ${path}`);
    process.exit(1);
  }
}

function validateVersion(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

function printDiff(path, oldVer, newVer) {
  const rel = resolve(ROOT, path);
  console.log(`  ${rel}`);
  console.log(`    -  "version": "${oldVer}"`);
  console.log(`    +  "version": "${newVer}"`);
}

// Parse level from CLI args
const levelArg = process.argv.find(a => a === 'patch' || a === 'minor' || a === 'major');
let level = levelArg || null;

async function main() {
  // Interactive mode
  if (!level) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('[1] patch  [2] minor  [3] major  [4] dry-run preview\n> ', resolve);
    });
    rl.close();
    const map = { '1': 'patch', '2': 'minor', '3': 'major', '4': 'dry-run' };
    const choice = map[answer.trim()];
    if (choice === 'dry-run') {
      level = null;
      return dryRun();
    }
    if (!choice) {
      console.error('Invalid choice');
      process.exit(1);
    }
    level = choice;
  }

  // Safety: check all files exist
  for (const f of FILES) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) {
      console.error(`Error: Missing file ${p}`);
      process.exit(1);
    }
  }

  // Read source of truth (electron/package.json)
  const electronPath = resolve(ROOT, './electron/package.json');
  const electronPkg = readJson(electronPath);
  const currentVersion = electronPkg.version;

  if (!validateVersion(currentVersion)) {
    console.error(`Error: Invalid version in electron/package.json: "${currentVersion}"`);
    process.exit(1);
  }

  // Validate other files match
  for (const f of FILES) {
    if (f === './electron/package.json') continue;
    const p = resolve(ROOT, f);
    const pkg = readJson(p);
    if (pkg.version !== currentVersion) {
      console.warn(`Warning: ${f} version "${pkg.version}" does not match electron version "${currentVersion}"`);
    }
  }

  // Safety: check working tree for uncommitted changes to target files
  if (!FORCE) {
    const { execSync } = await import('child_process');
    for (const f of FILES) {
      try {
        const status = execSync(`git status --porcelain "${resolve(ROOT, f)}"`, {
          encoding: 'utf-8',
          cwd: ROOT,
        }).trim();
        if (status) {
          console.error(`Error: ${f} has uncommitted changes. Use --force to override.`);
          process.exit(1);
        }
      } catch {
        // Not a git repo or git not available — skip check
      }
    }
  }

  const newVersion = bump(currentVersion, level);

  if (!validateVersion(newVersion)) {
    console.error(`Error: Generated invalid version: "${newVersion}"`);
    process.exit(1);
  }

  console.log(`Bumping all 4 files from ${currentVersion} to ${newVersion}\n`);

  for (const f of FILES) {
    const p = resolve(ROOT, f);
    const pkg = readJson(p);
    printDiff(f, pkg.version, newVersion);
    if (!DRY_RUN) {
      pkg.version = newVersion;
      writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
    }
  }

  if (!DRY_RUN) {
    console.log('\nDone. No commit or tag was created — review and commit manually.');
  }
}

async function dryRun() {
  console.log('Dry-run preview:\n');
  for (const f of FILES) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) {
      console.log(`  ${f} — MISSING, skipping`);
      continue;
    }
    const pkg = readJson(p);
    const candidates = [];
    for (const lvl of ['patch', 'minor', 'major']) {
      candidates.push(`${lvl}: ${bump(pkg.version, lvl)}`);
    }
    console.log(`  ${f}  (${pkg.version})`);
    console.log(`    ${candidates.join(', ')}`);
  }
}

if (DRY_RUN && !levelArg) {
  await dryRun();
} else {
  await main();
}
