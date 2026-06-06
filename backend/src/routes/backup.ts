import { Hono } from 'hono';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getPgDumpPath, getPsqlPath, parseDatabaseUrl } from '../utils/pgBin.js';
import { env } from '../env.js';

const execFileAsync = promisify(execFile);

export const backupRoutes = new Hono();

/**
 * POST /api/backup — Export database as a .sql dump file
 * Uses pg_dump with --clean --if-exists for a full restore-capable backup.
 */
backupRoutes.post('/backup', async (c) => {
  let pgDumpPath: string;
  let dbParams: Record<string, string>;

  try {
    pgDumpPath = getPgDumpPath();
    dbParams = parseDatabaseUrl(env.DATABASE_URL);
  } catch (err: any) {
    console.error('[Backup] Setup error:', err);
    return c.json({ error: `Backup setup failed: ${err.message}` }, 500);
  }

  const tmpFile = path.join(os.tmpdir(), `ipscscore-backup-${Date.now()}.sql`);

  try {
    await execFileAsync(pgDumpPath, [
      '--no-password',
      '--clean',
      '--if-exists',
      '--format=plain',
      '-f', tmpFile,
    ], {
      env: { ...process.env, ...dbParams },
      maxBuffer: 50 * 1024 * 1024, // 50 MB buffer for large databases
    });

    const fileContent = await fs.readFile(tmpFile);
    const date = new Date().toISOString().slice(0, 10);

    c.header('Content-Disposition', `attachment; filename="ipscscore-backup-${date}.sql"`);
    c.header('Content-Type', 'text/sql; charset=utf-8');

    return c.body(fileContent);
  } catch (err: any) {
    console.error('[Backup] pg_dump error:', err);
    return c.json({ error: `Backup failed: ${err.message}` }, 500);
  } finally {
    try { await fs.unlink(tmpFile); } catch { /* ignore */ }
  }
});

/**
 * POST /api/restore — Restore database from a .sql dump file
 * Uses psql to execute the dump (which contains DROP/CREATE from --clean --if-exists).
 */
backupRoutes.post('/restore', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  let psqlPath: string;
  let dbParams: Record<string, string>;

  try {
    psqlPath = getPsqlPath();
    dbParams = parseDatabaseUrl(env.DATABASE_URL);
  } catch (err: any) {
    console.error('[Restore] Setup error:', err);
    return c.json({ error: `Restore setup failed: ${err.message}` }, 500);
  }

  const tmpFile = path.join(os.tmpdir(), `ipscscore-restore-${Date.now()}.sql`);

  try {
    // Write uploaded file to temp location
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tmpFile, Buffer.from(arrayBuffer));

    // Run psql to restore — the dump has --clean --if-exists so it drops first
    const { stderr } = await execFileAsync(psqlPath, [
      '--no-password',
      '-f', tmpFile,
    ], {
      env: { ...process.env, ...dbParams },
      maxBuffer: 50 * 1024 * 1024,
    });

    // psql writes notices to stderr even on success
    console.log('[Restore] psql stderr:', stderr?.slice(0, 500));

    return c.json({ success: true, message: 'Database restored successfully' });
  } catch (err: any) {
    console.error('[Restore] Error:', err);
    return c.json({ error: `Restore failed: ${err.message}` }, 500);
  } finally {
    try { await fs.unlink(tmpFile); } catch { /* ignore */ }
  }
});