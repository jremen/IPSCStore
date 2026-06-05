import type { Context } from 'hono';

export const errorHandler = async (err: any, c: Context) => {
  console.error('Unhandled error:', err);

  if (err.code === '23505') {
    return c.json({ error: 'Duplicate entry — this record already exists.' }, 409);
  }
  if (err.code === '23503') {
    return c.json({ error: 'Referenced record not found.' }, 404);
  }
  if (err.code === '23514') {
    return c.json({ error: 'Data validation failed: ' + err.message }, 400);
  }

  return c.json(
    { error: err.message || 'Internal server error' },
    err.status || 500
  );
};