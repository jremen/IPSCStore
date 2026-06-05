import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const uploadRoutes = new Hono();

// Serve uploaded stage images
uploadRoutes.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');

  const [stage] = await sql`
    SELECT image_path FROM stages WHERE image_path LIKE ${'%' + filename}
  `;
  if (!stage || !stage.image_path) {
    return c.json({ error: 'Image not found' }, 404);
  }

  try {
    const { readFile } = await import('fs/promises');
    const data = await readFile(stage.image_path as string);

    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : 'image/jpeg';

    return c.body(data, 200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
  } catch {
    return c.json({ error: 'Image file not found on disk' }, 404);
  }
});