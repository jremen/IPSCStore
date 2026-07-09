import os from 'os';
import fs from 'fs';
import path from 'path';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { streamSSE } from 'hono/streaming';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware, stageAccessMiddleware } from './middleware/auth.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { requireAdmin, requireAuth, methodGuard } from './middleware/roles.js';
import { matchRoutes } from './routes/matches.js';
import { stageRoutes } from './routes/stages.js';
import { shooterRoutes } from './routes/shooters.js';
import { registrationRoutes } from './routes/registrations.js';
import { scoringRoutes } from './routes/scoring.js';
import { resultsRoutes } from './routes/results.js';
import { uploadRoutes } from './routes/uploads.js';
import { importRoutes } from './routes/import.js';
import { winmssImportRoutes } from './routes/winmssImport.js';
import { pscImportRoutes } from './routes/pscImport.js';
import { pscExportRoutes } from './routes/pscExport.js';
import { authRoutes } from './routes/auth.js';
import { backupRoutes } from './routes/backup.js';
import { localBackupRoutes } from './routes/localBackup.js';
import { matchExportRoutes } from './routes/matchExport.js';
import { auditLogRoutes } from './routes/audit.js';
import { env } from './env.js';
import { eventBroadcaster } from './services/events.js';

const app = new Hono<{
  Variables: {
    domainMode: string;
  };
}>();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', requestLogger);
app.use('*', securityHeaders);
app.onError(errorHandler);

/**
 * Determine the domain mode based on the request path.
 */
function getDomainMode(urlPath: string): 'results' | 'scoring' | 'squads' | 'admin' {
  const normalizedPath = urlPath.toLowerCase();
  if (normalizedPath.startsWith('/results')) return 'results';
  if (normalizedPath.startsWith('/scoring')) return 'scoring';
  if (normalizedPath.startsWith('/squads')) return 'squads';
  return 'admin';
}

// Set domain mode from path for all requests
app.use('*', async (c, next) => {
  c.set('domainMode', getDomainMode(c.req.path));
  await next();
});

// ─── Fully public endpoints (no auth at all) ───

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/events', async (c) => {
  const matchId = c.req.query('matchId') || null;
  return streamSSE(c, async (stream) => {
    eventBroadcaster.add(matchId, stream);
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ matchId, connectedAt: new Date().toISOString() }),
    });
    while (!stream.aborted) {
      await stream.sleep(30000);
    }
  });
});

app.get('/api/lan-info', (c) => {
  const interfaces = os.networkInterfaces();
  let lanIp = '';
  let fallbackIp = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        const addr = iface.address;
        const isContainer = name.startsWith('docker') || name.startsWith('br-') || name.startsWith('veth') || name.startsWith('vnic');
        if (!isContainer && !addr.startsWith('172.')) {
          lanIp = addr;
          break;
        }
        if (!fallbackIp) fallbackIp = addr;
      }
    }
    if (lanIp) break;
  }
  return c.json({ ip: lanIp || fallbackIp || '127.0.0.1', port: env.PORT });
});

// Auth routes (public — login/logout endpoints)
app.route('/api/auth', authRoutes);

// ─── Results routes (public reads) ───
app.route('/api', resultsRoutes);

// ─── Public squads route (GET only, for squads path) ───
// Registered before authMiddleware so it's unauthenticated.
// Squads contain no PII (just squad numbers for grouping).
app.get('/api/matches/:matchId/squads', async (c) => {
  const matchId = c.req.param('matchId');
  const { sql } = await import('./db/client.js');
  const squads = await sql`
    SELECT mr.squad, COUNT(*) as shooter_count
    FROM match_registrations mr
    WHERE mr.match_id = ${matchId} AND mr.squad IS NOT NULL
    GROUP BY mr.squad
    ORDER BY mr.squad
  `;
  const unassigned = await sql`
    SELECT COUNT(*) as count FROM match_registrations
    WHERE match_id = ${matchId} AND squad IS NULL
  `;
  return c.json({
    squads: squads.map((s: any) => ({ squad: s.squad, shooter_count: Number(s.shooter_count) })),
    unassigned_count: Number(unassigned[0]?.count ?? 0),
  });
});

// ─── Upload routes (briefing images — auth required) ───
app.use('/api/uploads', authMiddleware);
app.route('/api', uploadRoutes);

// ─── Matches: all reads + writes require auth ───
app.use('/api/matches', authMiddleware);
app.route('/api/matches', matchRoutes);

// ─── Stages: all reads + writes require auth ───
app.use('/api/matches/:matchId/stages', authMiddleware);
app.use('/api/stages', authMiddleware);
app.route('/api', stageRoutes);

// ─── Shooters: admin only (including reads — PII protection) ───
app.use('/api/shooters', authMiddleware);
app.use('/api/shooters', requireAdmin);
app.route('/api/shooters', shooterRoutes);

// ─── Registrations: all reads + writes require auth ───
app.use('/api/matches/:matchId/registrations', authMiddleware);
app.route('/api', registrationRoutes);

// ─── Scoring: scorer or admin auth ───
app.use('/api/matches/:matchId/stages/:stageId/scores/*', authMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/scores/*', stageAccessMiddleware);

app.use('/api/matches/:matchId/scoring-progress', authMiddleware);
// Recalculate: admin only
app.use('/api/matches/:matchId/stages/:stageId/recalculate', authMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/recalculate', requireAdmin);
app.use('/api/matches/:matchId/recalculate', authMiddleware);
app.use('/api/matches/:matchId/recalculate', requireAdmin);
app.route('/api', scoringRoutes);

// ─── Backup/Restore: admin only ───
app.use('/api/backup', authMiddleware);
app.use('/api/backup', requireAdmin);
app.use('/api/restore', authMiddleware);
app.use('/api/restore', requireAdmin);
app.route('/api', backupRoutes);

// ─── Local Backup (Electron folder backup): admin only ───
app.use('/api/local-backup', authMiddleware);
app.use('/api/local-backup', requireAdmin);
app.route('/api', localBackupRoutes);

// ─── Import: admin only ───
app.use('/api/import', authMiddleware);
app.use('/api/import', requireAdmin);
app.route('/api/import', importRoutes);
app.route('/api/import', winmssImportRoutes);

// ─── Audit Log: admin only ───
app.use('/api/audit', authMiddleware);
app.use('/api/audit', requireAdmin);
app.route('/api', auditLogRoutes);

// ─── Match Export/Import: admin only ───
app.use('/api/matches/import', authMiddleware);
app.use('/api/matches/import', requireAdmin);
app.use('/api/matches/import-psc', authMiddleware);
app.use('/api/matches/import-psc', requireAdmin);
app.use('/api/matches/:id/export', authMiddleware);
app.use('/api/matches/:id/export', requireAdmin);
app.use('/api/matches/:id/export-psc', authMiddleware);
app.use('/api/matches/:id/export-psc', requireAdmin);
app.route('/api', matchExportRoutes);
app.route('/api', pscImportRoutes);
app.route('/api', pscExportRoutes);

// ─── Manifest & Static Serving ───

app.get('/manifest.json', async (c) => {
  let mode = c.req.query('mode') as 'results' | 'scoring' | 'squads' | 'admin' | undefined;

  if (!mode) {
    const referer = c.req.header('referer') || '';
    try {
      const refererUrl = new URL(referer);
      const refererPath = refererUrl.pathname.toLowerCase();
      if (refererPath.startsWith('/results')) {
        mode = 'results';
      } else if (refererPath.startsWith('/scoring')) {
        mode = 'scoring';
      } else if (refererPath.startsWith('/squads')) {
        mode = 'squads';
      }
    } catch {
      // ignore malformed referer
    }
  }

  const frontendDistPath = process.env.FRONTEND_DIST_PATH;

  let manifest: Record<string, any> = {
    name: 'IPSC Score',
    short_name: 'IPSC Score',
    start_url: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#1e293b',
    theme_color: '#1e293b',
    orientation: 'any',
    icons: [
      { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/android-chrome-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/msapplication-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/mstile-150x150.png', sizes: '150x150', type: 'image/png' },
    ],
  };

  if (frontendDistPath) {
    try {
      const manifestPath = path.join(frontendDistPath, 'manifest.json');
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(raw);
    } catch (err) {
      console.error('[Manifest] Failed to read static manifest, using default:', err);
    }
  }

  if (mode === 'results') {
    manifest.start_url = '/results';
    manifest.id = 'ipscscore-results';
  } else if (mode === 'scoring') {
    manifest.start_url = '/scoring';
    manifest.id = 'ipscscore-scoring';
  } else if (mode === 'squads') {
    manifest.start_url = '/squads';
    manifest.id = 'ipscscore-squads';
  }

  return c.json(manifest);
});

export function enableStaticServing(frontendDistPath: string) {
  console.log(`[Static] Setting up frontend serving from: ${frontendDistPath}`);

  if (!fs.existsSync(frontendDistPath)) {
    console.error(`[Static] ERROR: Frontend dist path does not exist: ${frontendDistPath}`);
    return;
  }

  const indexPath = path.join(frontendDistPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`[Static] ERROR: index.html not found at: ${indexPath}`);
    return;
  }

  console.log(`[Static] Found index.html at: ${indexPath}`);

  app.use('*', async (c, next) => {
    const urlPath = c.req.path;
    if (urlPath.startsWith('/api/')) return next();
    if (urlPath !== '/' && urlPath.includes('.')) return next();

    try {
      let html = fs.readFileSync(indexPath, 'utf-8');
      const domainMode = c.get('domainMode') as string | undefined;
      if (domainMode && domainMode !== 'admin') {
        const manifestHref = domainMode === 'results'
          ? '/manifest.json?mode=results'
          : domainMode === 'squads'
            ? '/manifest.json?mode=squads'
            : '/manifest.json?mode=scoring';
        html = html.replace(
          /<link[^>]*rel=["']manifest["'][^>]*>/i,
          `<link rel="manifest" href="${manifestHref}" />`
        );
      }
      return c.html(html);
    } catch (err) {
      console.error('[Static] Failed to serve index.html:', err);
      return c.text('Frontend not found', 500);
    }
  });

  app.use('/*', serveStatic({ root: frontendDistPath }));
}

export { app };
