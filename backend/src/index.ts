import { serve } from '@hono/node-server';
import { createServer } from 'https';
import fs from 'fs';
import { app, enableStaticServing } from './app.js';
import { env } from './env.js';
import { closeDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { startFullBackupTimer } from './services/localBackup.js';

async function main() {
  console.log('Running migrations...');
  await runMigrations();
  startFullBackupTimer();

  // In production (Electron), enable static file serving for the frontend
  const frontendDistPath = process.env.FRONTEND_DIST_PATH;
  if (frontendDistPath) {
    await enableStaticServing(frontendDistPath);
    console.log(`Serving frontend from ${frontendDistPath}`);
  }

  // If TLS cert and key are provided, serve over HTTPS
  if (env.TLS_CERT_PATH && env.TLS_KEY_PATH) {
    const certExists = fs.existsSync(env.TLS_CERT_PATH);
    const keyExists = fs.existsSync(env.TLS_KEY_PATH);

    if (certExists && keyExists) {
      const cert = fs.readFileSync(env.TLS_CERT_PATH);
      const key = fs.readFileSync(env.TLS_KEY_PATH);

      serve(
        {
          fetch: app.fetch,
          port: env.PORT,
          hostname: env.BIND_ADDRESS,
          createServer: () => createServer({ cert, key }),
        },
        (info) => {
          console.log(`Server running at https://${env.BIND_ADDRESS}:${info.port}`);
        }
      );
      return;
    } else {
      console.warn(`[TLS] Certificate files not found: ${env.TLS_CERT_PATH}, ${env.TLS_KEY_PATH}`);
      console.warn('[TLS] Falling back to HTTP');
    }
  }

  // Default: HTTP
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
