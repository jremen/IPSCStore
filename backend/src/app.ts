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
import { scoreLockMiddleware } from './middleware/scoreLock.js';
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
import { authRoutes } from './routes/auth.js';
import { backupRoutes } from './routes/backup.js';
import { matchExportRoutes } from './routes/matchExport.js';
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
 * Determine the domain mode based on the Host header or the request path.
 */
function getDomainMode(host: string | undefined, urlPath: string): 'results' | 'scoring' | 'admin' {
  if (!host) return 'admin';
  const hostname = host.split(':')[0].toLowerCase().trim();
  const normalizedPath = urlPath.toLowerCase();
  if (hostname === 'vysledky.local' || normalizedPath.startsWith('/vysledky')) return 'results';
  if (hostname === 'hodnotenie.local' || normalizedPath.startsWith('/hodnotenie')) return 'scoring';
  return 'admin';
}

// Set domain mode from Host header and path for all requests
app.use('*', async (c, next) => {
  const host = c.req.header('host');
  c.set('domainMode', getDomainMode(host, c.req.path));
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

// ─── Upload routes (public reads — stage briefing images) ───
app.route('/api', uploadRoutes);

// ─── Matches: public reads, admin writes ───
// GET is public; POST/PUT/DELETE require admin
app.use('/api/matches', authMiddleware);
app.use('/api/matches', methodGuard(['admin']));
app.route('/api/matches', matchRoutes);

// ─── Stages: public reads, admin writes ───
// GET is public; POST/PUT/DELETE require admin
app.use('/api/matches/:matchId/stages', authMiddleware);
app.use('/api/matches/:matchId/stages', methodGuard(['admin']));
app.use('/api/stages', authMiddleware);
app.use('/api/stages', methodGuard(['admin']));
app.route('/api', stageRoutes);

// ─── Shooters: admin only (including reads — PII protection) ───
app.use('/api/shooters', authMiddleware);
app.use('/api/shooters', requireAdmin);
app.route('/api/shooters', shooterRoutes);

// ─── Registrations: public reads, admin writes ───
app.use('/api/matches/:matchId/registrations', authMiddleware);
app.use('/api/matches/:matchId/registrations', methodGuard(['admin']));
app.use('/api/matches/:matchId/squads', authMiddleware);
app.route('/api', registrationRoutes);

// ─── Scoring: scorer or admin auth ───
app.use('/api/matches/:matchId/stages/:stageId/scores/*', authMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/scores/*', stageAccessMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/scores/*', scoreLockMiddleware);
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

// ─── Import: admin only ───
app.use('/api/import', authMiddleware);
app.use('/api/import', requireAdmin);
app.route('/api/import', importRoutes);
app.route('/api/import', winmssImportRoutes);

// ─── Match Export/Import: admin only ───
app.use('/api/matches/import', authMiddleware);
app.use('/api/matches/import', requireAdmin);
app.use('/api/matches/:id/export', authMiddleware);
app.use('/api/matches/:id/export', requireAdmin);
app.route('/api', matchExportRoutes);

// ─── Manifest & Static Serving ───

app.get('/manifest.json', async (c) => {
  let mode = c.req.query('mode') as 'results' | 'scoring' | 'admin' | undefined;

  if (!mode) {
    const referer = c.req.header('referer') || '';
    try {
      const refererUrl = new URL(referer);
      const refererPath = refererUrl.pathname.toLowerCase();
      const refererHost = refererUrl.hostname.toLowerCase();
      if (refererPath.startsWith('/vysledky') || refererHost === 'vysledky.local') {
        mode = 'results';
      } else if (refererPath.startsWith('/hodnotenie') || refererHost === 'hodnotenie.local') {
        mode = 'scoring';
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
    manifest.start_url = '/vysledky';
    manifest.id = 'ipscscore-results';
  } else if (mode === 'scoring') {
    manifest.start_url = '/hodnotenie';
    manifest.id = 'ipscscore-scoring';
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
        html = html.replace(
          '<head>',
          `<head><script>window.__DOMAIN_MODE__ = "${domainMode}";</script>`
        );
        const manifestHref = domainMode === 'results'
          ? '/manifest.json?mode=results'
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
