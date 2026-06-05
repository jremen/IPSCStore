import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const shooterRoutes = new Hono();

// List/search shooters
shooterRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 0;
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let shooters;
  let total;

  if (search) {
    const pattern = `%${search}%`;
    if (limit > 0) {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern}
        ORDER BY last_name, first_name
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern}
        ORDER BY last_name, first_name
      `;
    }
    const [count] = await sql`
      SELECT COUNT(*) as count FROM shooters
      WHERE first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern}
    `;
    total = Number(count.count);
  } else {
    if (limit > 0) {
      shooters = await sql`
        SELECT * FROM shooters ORDER BY last_name, first_name LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      shooters = await sql`
        SELECT * FROM shooters ORDER BY last_name, first_name
      `;
    }
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

// Bulk update shooters
shooterRoutes.put('/bulk', async (c) => {
  const { shooterIds, updates } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: 'shooterIds must be a non-empty array' }, 400);
  }

  const setClauses: string[] = [];
  if (updates.division) setClauses.push(`division = '${updates.division}'`);
  if (updates.category) setClauses.push(`category = '${updates.category}'`);
  if (updates.power_factor) setClauses.push(`power_factor = '${updates.power_factor}'`);

  if (setClauses.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  const updated = await sql`
    UPDATE shooters SET ${sql.unsafe(setClauses.join(', '))}, updated_at = NOW()
    WHERE id = ANY(${shooterIds}::uuid[])
    RETURNING id, first_name, last_name
  `;

  const failedIds = shooterIds.filter((id: string) => !updated.find((u: any) => u.id === id));
  const failed = failedIds.map((id: string) => ({ id, name: '', reason: 'Update failed' }));

  return c.json({ updated: updated.length, failed });
});

// Bulk delete shooters
shooterRoutes.delete('/bulk', async (c) => {
  const { shooterIds } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: 'shooterIds must be a non-empty array' }, 400);
  }

  // Check which shooters are registered in matches (cannot delete)
  const registered = await sql`
    SELECT DISTINCT shooter_id FROM match_registrations WHERE shooter_id = ANY(${shooterIds}::uuid[])
  `;
  const registeredIds = new Set(registered.map((r: any) => r.shooter_id));

  const deletableIds = shooterIds.filter((id: string) => !registeredIds.has(id));
  const failedIds = shooterIds.filter((id: string) => !deletableIds.includes(id));

  let deleted = 0;
  if (deletableIds.length > 0) {
    const result = await sql`
      DELETE FROM shooters WHERE id = ANY(${deletableIds}::uuid[]) RETURNING id, first_name, last_name
    `;
    deleted = result.length;
  }

  // Get names for failed deletions
  const failedShooters = await sql`
    SELECT id, first_name, last_name FROM shooters WHERE id = ANY(${failedIds}::uuid[])
  `;
  const failed = failedShooters.map((s: any) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    reason: 'Shooter is registered in one or more matches',
  }));

  return c.json({ deleted, failed });
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