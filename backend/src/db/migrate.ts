import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from './client.js';
import bcrypt from 'bcryptjs';

export async function runMigrations() {
  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Support both ESM (import.meta.dirname) and CJS (__dirname) contexts.
  // In bundled Electron mode, MIGRATIONS_DIR env var overrides the path.
  const migrationsDir = process.env.MIGRATIONS_DIR || (() => {
    const dirName = typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname;
    return join(dirName, 'migrations');
  })();
  let files: string[];
  try {
    files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.log('No migrations directory found, skipping migrations.');
    return;
  }

  const applied = await sql`SELECT name FROM _migrations`;
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  Skipping already applied: ${file}`);
      continue;
    }

    console.log(`  Applying migration: ${file}`);
    const content = readFileSync(join(migrationsDir, file), 'utf-8');

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });

    // After migration 008 adds password_hash column, hash existing plain-text passwords
    if (file === '008_hash_passwords.sql') {
      await hashExistingPlainPasswords();
    }

    console.log(`  Applied: ${file}`);
  }

  console.log('Migrations complete.');
}

/**
 * One-time data migration: hash any remaining plain-text stage passwords.
 * Called right after migration 008 adds the password_hash column,
 * before migration 009 drops the plain-text password column.
 */
async function hashExistingPlainPasswords() {
  const stages = await sql`
    SELECT id, password FROM stages WHERE password IS NOT NULL AND password_hash IS NULL
  `;

  if (stages.length === 0) return;

  console.log(`  Hashing ${stages.length} plain-text stage password(s)...`);

  for (const stage of stages) {
    const hash = await bcrypt.hash(stage.password, 10);
    await sql`
      UPDATE stages SET password_hash = ${hash}, password = NULL WHERE id = ${stage.id}
    `;
  }

  console.log('  Stage password hashing complete.');
}