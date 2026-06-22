import { cors } from 'hono/cors';
import { env } from '../env.js';

function getAllowedOrigins(): string | string[] {
  if (env.CORS_ORIGINS === '*') return '*';
  return env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
}

const origins = getAllowedOrigins();

export const corsMiddleware = cors({
  origin: origins,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
