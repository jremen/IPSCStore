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

const app = new Hono();

// Middleware
app.use('*', corsMiddleware);
app.use('*', requestLogger);
app.onError(errorHandler);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
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