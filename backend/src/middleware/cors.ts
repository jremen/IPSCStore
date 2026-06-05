import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: '*',  // Allow all origins — local network app
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});