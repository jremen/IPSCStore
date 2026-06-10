import os from 'os';
import fs from 'fs';
import path from 'path';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware, stageAccessMiddleware } from './middleware/auth.js';
import { scoreLockMiddleware } from './middleware/scoreLock.js';
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
import { env } from './env.js';

const app = new Hono<{
  Variables: {
    domainMode: string;
  };
}>();

// Middleware
app.use('*', corsMiddleware);
app.use('*', requestLogger);
app.onError(errorHandler);

/**
 * Determine the domain mode based on the Host header.
 * - vysledky.local → 'results' (public results view, no login)
 * - hodnotenie.local → 'scoring' (stage login for range masters)
 * - anything else → 'admin' (default, shows admin login on local network)
 */
function getDomainMode(host: string | undefined): 'results' | 'scoring' | 'admin' {
  if (!host) return 'admin';
  const hostname = host.split(':')[0].toLowerCase().trim();
  if (hostname === 'vysledky.local') return 'results';
  if (hostname === 'hodnotenie.local') return 'scoring';
  return 'admin';
}

// Set domain mode from Host header for all requests
app.use('*', async (c, next) => {
  const host = c.req.header('host');
  c.set('domainMode', getDomainMode(host));
  await next();
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// LAN info — returns server's LAN IP and port for mobile device access
app.get('/api/lan-info', (c) => {
  const interfaces = os.networkInterfaces();
  let lanIp = '';
  let fallbackIp = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        const addr = iface.address;
        // Prefer non-docker, non-vpn, non-bridge interfaces
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

// Routes
app.route('/api/matches', matchRoutes);
app.route('/api', stageRoutes);
app.route('/api/shooters', shooterRoutes);
app.route('/api', registrationRoutes);

// Auth routes (public — no middleware)
app.route('/api/auth', authRoutes);

// Scoring routes — protected by stage auth for remote users
app.use('/api/matches/:matchId/stages/:stageId/scores/*', authMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/scores/*', stageAccessMiddleware);
app.use('/api/matches/:matchId/stages/:stageId/scores/*', scoreLockMiddleware);
app.route('/api', scoringRoutes);

app.route('/api', resultsRoutes);
app.route('/api', uploadRoutes);
app.route('/api', backupRoutes);
app.route('/api/import', importRoutes);
app.route('/api/import', winmssImportRoutes);

/**
 * Enable production static file serving for the frontend.
 * Called by the Electron main process after setting FRONTEND_DIST_PATH.
 * In Docker/dev mode, the Vite dev server handles this.
 */
export function enableStaticServing(frontendDistPath: string) {
  console.log(`[Static] Setting up frontend serving from: ${frontendDistPath}`);

  // Validate that the frontend dist directory exists
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

  // SPA fallback middleware: serve index.html for non-API, non-asset routes.
  // This MUST run before serveStatic so that the root path "/" and SPA routes
  // get domain mode injection. If the request has a file extension and the file
  // exists, we skip this handler and let serveStatic handle it.
  // NOTE: We re-read index.html from disk on each request (not cached) so that
  // after a frontend rebuild with new asset hashes, the new index.html is served
  // immediately without requiring a backend restart.
  app.use('*', async (c, next) => {
    const urlPath = c.req.path;

    // Don't intercept API routes
    if (urlPath.startsWith('/api/')) {
      return next();
    }

    // If the path has a file extension, it's likely a static asset request.
    // Let serveStatic handle it by calling next().
    if (urlPath !== '/' && urlPath.includes('.')) {
      return next();
    }

    // This is an SPA route (root path or client-side route) — serve index.html
    // with domain mode injection.
    try {
      let html = fs.readFileSync(indexPath, 'utf-8');
      const domainMode = c.get('domainMode') as string | undefined;
      if (domainMode && domainMode !== 'admin') {
        html = html.replace(
          '<head>',
          `<head><script>window.__DOMAIN_MODE__ = "${domainMode}";</script>`
        );
      }
      return c.html(html);
    } catch (err) {
      console.error('[Static] Failed to serve index.html:', err);
      return c.text('Frontend not found', 500);
    }
  });

  // Serve static assets (JS, CSS, images, fonts, etc.)
  // This only runs if the SPA fallback middleware above called next().
  app.use('/*', serveStatic({ root: frontendDistPath }));
}

export { app };