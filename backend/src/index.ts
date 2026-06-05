import { serve } from '@hono/node-server';
import { app, enableStaticServing } from './app.js';
import { env } from './env.js';
import { closeDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  console.log('Running migrations...');
  await runMigrations();

  // In production (Electron), enable static file serving for the frontend
  const frontendDistPath = process.env.FRONTEND_DIST_PATH;
  if (frontendDistPath) {
    await enableStaticServing(frontendDistPath);
    console.log(`Serving frontend from ${frontendDistPath}`);
  }

  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeDb();
  process.exit(0);
});