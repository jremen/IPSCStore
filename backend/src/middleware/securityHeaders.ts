import type { Context, Next } from 'hono';

/**
 * Security headers middleware.
 * Adds standard security headers to all responses.
 */
export async function securityHeaders(c: Context, next: Next) {
  await next();

  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:");

  // HSTS only on HTTPS
  const proto = c.req.header('x-forwarded-proto') || 'http';
  if (proto === 'https') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}
