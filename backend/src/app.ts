import os from 'os';
import { Hono } from 'hono';
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
 * Called by the Electron main process after setting NODE_ENV=production.
 * In Docker/dev mode, the Vite dev server handles this.
 */
export async function enableStaticServing(frontendDistPath: string) {
  const { serveStatic } = await import('@hono/node-server/serve-static');

  // Serve built frontend assets
  app.use('/*', serveStatic({ root: frontendDistPath }));

  // SPA fallback: serve index.html for any non-API, non-file route
  app.get('*', serveStatic({ root: frontendDistPath, path: 'index.html' }));
}

export { app };