import os from 'os';
import fs from 'fs';
import path from 'path';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware, stageAccessMiddleware } from './middleware/auth.js';
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

const app = new Hono();

// Middleware
app.use('*', corsMiddleware);
app.use('*', requestLogger);
app.onError(errorHandler);

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

  // Serve built frontend assets (JS, CSS, images, fonts, etc.)
  app.use('/*', serveStatic({ root: frontendDistPath }));

  // SPA fallback: serve index.html for any non-API, non-file route.
  // Uses direct fs.readFile instead of serveStatic to avoid path resolution issues.
  app.get('*', async (c) => {
    // Don't serve index.html for API routes
    if (c.req.path.startsWith('/api/')) {
      return c.notFound();
    }
    try {
      const html = fs.readFileSync(indexPath, 'utf-8');
      return c.html(html);
    } catch (err) {
      console.error('[Static] Failed to read index.html:', err);
      return c.text('Frontend not found', 500);
    }
  });
}

export { app };