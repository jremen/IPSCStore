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

// Middleware
app.use('*', corsMiddleware);
app.use('*', requestLogger);
app.onError(errorHandler);

/**
 * Determine the domain mode based on the Host header or the request path.
 * - vysledky.local or /vysledky path → 'results' (public results view, no login)
 * - hodnotenie.local or /hodnotenie path → 'scoring' (stage login for range masters)
 * - anything else → 'admin' (default, shows admin login on local network)
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

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Server-Sent Events stream — pushes real-time match updates to connected clients
app.get('/api/events', async (c) => {
  const matchId = c.req.query('matchId') || null;

  return streamSSE(c, async (stream) => {
    eventBroadcaster.add(matchId, stream);
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ matchId, connectedAt: new Date().toISOString() }),
    });

    // Keep the connection alive while the client is interested.
    // `stream.aborted` becomes true when the client disconnects; the
    // broadcaster's onAbort listener then removes this stream.
    while (!stream.aborted) {
      await stream.sleep(30000);
    }
  });
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
app.route('/api', matchExportRoutes);
app.route('/api/import', importRoutes);
app.route('/api/import', winmssImportRoutes);

/**
 * Serve a dynamic manifest.json so that PWAs installed from /vysledky or
 * /hodnotenie launch back to the correct path instead of the admin root (/).
 *
 * The frontend's index.html is injected with `?mode=results` or
 * `?mode=scoring` for those domain modes, so the browser fetches the right
 * manifest when adding the page to the home screen.
 */
app.get('/manifest.json', async (c) => {
  let mode = c.req.query('mode') as 'results' | 'scoring' | 'admin' | undefined;

  // Fallback: if no query param, try to infer from the Referer header.
  // This helps when a cached or third-party page requests /manifest.json directly.
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
  // Name and short_name always stay "IPSCScore" as requested by the user,
  // regardless of which path the PWA was installed from.

  return c.json(manifest);
});

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
        // Inject domain mode for the React app
        html = html.replace(
          '<head>',
          `<head><script>window.__DOMAIN_MODE__ = "${domainMode}";</script>`
        );

        // Point the PWA manifest at a path-aware version so "Add to home screen"
        // launches back to /vysledky or /hodnotenie instead of the admin root.
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

  // Serve static assets (JS, CSS, images, fonts, etc.)
  // This only runs if the SPA fallback middleware above called next().
  app.use('/*', serveStatic({ root: frontendDistPath }));
}

export { app };