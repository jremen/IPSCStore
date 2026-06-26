import { Hono } from 'hono';
import { sql } from '../db/client.js';
import {
  exportFullDbAsJson,
  buildDeltaPayload,
  triggerFullBackup,
  getStatus,
  saveConfig,
  getBackupFolder,
  previewFolderBackup,
  applyFolderBackup,
} from '../services/localBackup.js';
import { audit } from '../services/audit.js';

export const localBackupRoutes = new Hono();

// Fetch full backup as gzipped JSON
localBackupRoutes.get('/local-backup/export-full', async (c) => {
  try {
    const json = await exportFullDbAsJson();
    const { gzipSync } = await import('node:zlib');
    const compressed = gzipSync(Buffer.from(json, 'utf-8'));
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    c.header('Content-Type', 'application/gzip');
    c.header('Content-Disposition', `attachment; filename="ipscscore-full-${ts}.json.gz"`);
    return c.body(compressed);
  } catch (err: any) {
    console.error('[LocalBackup] Export full error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Fetch delta as JSON
localBackupRoutes.get('/local-backup/export-delta', async (c) => {
  const matchId = c.req.query('matchId');
  const stageId = c.req.query('stageId');
  const registrationId = c.req.query('registrationId');
  if (!matchId || !stageId || !registrationId) {
    return c.json({ error: 'Missing matchId, stageId, or registrationId' }, 400);
  }
  try {
    const payload = await buildDeltaPayload(matchId, stageId, registrationId);
    return c.json(payload);
  } catch (err: any) {
    console.error('[LocalBackup] Export delta error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Trigger a full backup now
localBackupRoutes.post('/local-backup/trigger', async (c) => {
  try {
    const result = await triggerFullBackup();
    await audit(c, 'backup.trigger', `local:${result.key}`);
    return c.json(result);
  } catch (err: any) {
    console.error('[LocalBackup] Trigger error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get backup status
localBackupRoutes.get('/local-backup/status', async (c) => {
  try {
    const status = await getStatus();
    return c.json(status);
  } catch (err: any) {
    console.error('[LocalBackup] Status error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Save backup config
localBackupRoutes.post('/local-backup/config', async (c) => {
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      const text = await c.req.text();
      body = JSON.parse(text);
    }
    await saveConfig(body);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[LocalBackup] Config save error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Preview what would be restored from a folder
localBackupRoutes.post('/local-backup/preview-folder', async (c) => {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch {
      const text = await c.req.text();
      if (text) body = JSON.parse(text);
    }
    const folder = body.folder || await getBackupFolder();
    if (!folder) return c.json({ error: 'No backup folder configured or specified' }, 400);
    const preview = await previewFolderBackup(folder);
    return c.json(preview);
  } catch (err: any) {
    console.error('[LocalBackup] Preview error:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Restore from a folder: latest full + all deltas
localBackupRoutes.post('/local-backup/restore-folder', async (c) => {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch {
      const text = await c.req.text();
      if (text) body = JSON.parse(text);
    }
    const folder = body.folder || await getBackupFolder();
    if (!folder) return c.json({ error: 'No backup folder configured or specified' }, 400);
    const result = await applyFolderBackup(folder);
    await audit(c, 'backup.restore-folder', `${folder}: ${result.deltasApplied} deltas, ${result.errors.length} errors`);
    return c.json(result);
  } catch (err: any) {
    console.error('[LocalBackup] Restore folder error:', err);
    return c.json({ error: err.message }, 500);
  }
});
