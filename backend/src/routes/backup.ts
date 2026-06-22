import { Hono } from 'hono';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getPgDumpPath, getPsqlPath, parseDatabaseUrl } from '../utils/pgBin.js';
import { env } from '../env.js';
import { audit } from '../services/audit.js';

const execFileAsync = promisify(execFile);

export const backupRoutes = new Hono();

/**
 * POST /api/backup — Export database as a .sql dump file (admin only)
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
      maxBuffer: 50 * 1024 * 1024,
    });

    const fileContent = await fs.readFile(tmpFile);
    const date = new Date().toISOString().slice(0, 10);

    await audit(c, 'backup.export');

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
 * POST /api/restore — Restore database from a .sql dump file (admin only)
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
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tmpFile, Buffer.from(arrayBuffer));

    const { stderr } = await execFileAsync(psqlPath, [
      '--no-password',
      '-f', tmpFile,
    ], {
      env: { ...process.env, ...dbParams },
      maxBuffer: 50 * 1024 * 1024,
    });

    console.log('[Restore] psql stderr:', stderr?.slice(0, 500));

    await audit(c, 'backup.restore');

    return c.json({ success: true, message: 'Database restored successfully' });
  } catch (err: any) {
    console.error('[Restore] Error:', err);
    return c.json({ error: `Restore failed: ${err.message}` }, 500);
  } finally {
    try { await fs.unlink(tmpFile); } catch { /* ignore */ }
  }
});
