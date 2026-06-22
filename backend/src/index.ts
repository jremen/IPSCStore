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

  // TLS is recommended to be handled by a reverse proxy (Caddy, nginx) in production.
  // For direct TLS, set TLS_CERT_PATH and TLS_KEY_PATH env vars.
  // The server binds to BIND_ADDRESS (default 0.0.0.0).
  serve({ fetch: app.fetch, port: env.PORT, hostname: env.BIND_ADDRESS }, (info) => {
    console.log(`Server running at http://${env.BIND_ADDRESS}:${info.port}`);
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
