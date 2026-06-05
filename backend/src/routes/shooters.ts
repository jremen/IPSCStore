import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const shooterRoutes = new Hono();

// List/search shooters
shooterRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let shooters;
  let total;

  if (search) {
    const pattern = `%${search}%`;
    shooters = await sql`
      SELECT * FROM shooters
      WHERE first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern}
      ORDER BY last_name, first_name
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [count] = await sql`
      SELECT COUNT(*) as count FROM shooters
      WHERE first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern}
    `;
    total = Number(count.count);
  } else {
    shooters = await sql`
      SELECT * FROM shooters ORDER BY last_name, first_name LIMIT ${limit} OFFSET ${offset}
    `;
    const [count] = await sql`SELECT COUNT(*) as count FROM shooters`;
    total = Number(count.count);
  }

  return c.json({ shooters, total, limit, offset });
});

// Get all distinct tags for autocomplete
shooterRoutes.get('/tags', async (c) => {
  const tags = await sql`
    SELECT DISTINCT tag FROM shooters WHERE tag IS NOT NULL AND tag != '' ORDER BY tag
  `;
  return c.json(tags.map((t: any) => t.tag));
});

// Create shooter
shooterRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email } = body;

  if (!first_name || !last_name || !category || !division || !power_factor || !region) {
    return c.json({ error: 'first_name, last_name, category, division, power_factor, and region are required' }, 400);
  }

  const [shooter] = await sql`
    INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
    VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
    RETURNING *
  `;
  return c.json(shooter, 201);
});

// Get shooter detail
shooterRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [shooter] = await sql`SELECT * FROM shooters WHERE id = ${id}`;
  if (!shooter) return c.json({ error: 'Shooter not found' }, 404);

  // Get match history
  const history = await sql`
    SELECT mr.id, mr.match_id, m.name as match_name, m.date, mr.division, mr.category, mr.power_factor, mr.is_dq
    FROM match_registrations mr
    JOIN matches m ON m.id = mr.match_id
    WHERE mr.shooter_id = ${id}
    ORDER BY m.date DESC
  `;

  return c.json({ ...shooter, match_history: history });
});

// Update shooter
shooterRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email } = body;

  const [updated] = await sql`
    UPDATE shooters
    SET first_name = COALESCE(${first_name}, first_name),
        last_name = COALESCE(${last_name}, last_name),
        category = COALESCE(${category}, category),
        tag = ${tag !== undefined ? tag : sql`tag`},
        division = COALESCE(${division}, division),
        power_factor = COALESCE(${power_factor}, power_factor),
        region = COALESCE(${region}, region),
        email = ${email !== undefined ? email : sql`email`},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Shooter not found' }, 404);
  return c.json(updated);
});

// Delete shooter
shooterRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await sql`DELETE FROM shooters WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return c.json({ error: 'Shooter not found' }, 404);
    return c.json({ deleted: true });
  } catch (err: any) {
    if (err.code === '23503') {
      return c.json({ error: 'Cannot delete shooter — registered in one or more matches' }, 409);
    }
    throw err;
  }
});