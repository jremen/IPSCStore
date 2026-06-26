import { Hono } from 'hono';
import { sql } from '../db/client.js';
import { isUnaccentAvailable } from '../utils/unaccent.js';
import { audit } from '../services/audit.js';

export const shooterRoutes = new Hono();

// List/search shooters — admin only (PII protection)
shooterRoutes.get('/', async (c) => {
  const search = c.req.query('search') || '';
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 0;
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const includeDeleted = c.req.query('include_deleted') === 'true';
  const deletedOnly = c.req.query('deleted_only') === 'true';

  let deletedFilter: string;
  if (deletedOnly) {
    deletedFilter = 'AND deleted_at IS NOT NULL';
  } else if (includeDeleted) {
    deletedFilter = '';
  } else {
    deletedFilter = 'AND deleted_at IS NULL';
  }

  let shooters;
  let total;

  if (search) {
    const pattern = `%${search}%`;
    const useUnaccent = await isUnaccentAvailable();

    if (useUnaccent) {
      if (limit > 0) {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
             OR unaccent(last_name) ILIKE unaccent(${pattern})
             OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
             OR unaccent(last_name) ILIKE unaccent(${pattern})
             OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
        `;
      }
      const [count] = await sql`
        SELECT COUNT(*) as count FROM shooters
        WHERE (unaccent(first_name) ILIKE unaccent(${pattern})
           OR unaccent(last_name) ILIKE unaccent(${pattern})
           OR email ILIKE ${pattern})
        ${sql.unsafe(deletedFilter)}
      `;
      total = Number(count.count);
    } else {
      if (limit > 0) {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        shooters = await sql`
          SELECT * FROM shooters
          WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
          ${sql.unsafe(deletedFilter)}
          ORDER BY last_name, first_name
        `;
      }
      const [count] = await sql`
        SELECT COUNT(*) as count FROM shooters
        WHERE (first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern})
        ${sql.unsafe(deletedFilter)}
      `;
      total = Number(count.count);
    }
  } else {
    if (limit > 0) {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE 1=1 ${sql.unsafe(deletedFilter)}
        ORDER BY last_name, first_name
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      shooters = await sql`
        SELECT * FROM shooters
        WHERE 1=1 ${sql.unsafe(deletedFilter)}
        ORDER BY last_name, first_name
      `;
    }
    const [count] = await sql`SELECT COUNT(*) as count FROM shooters WHERE 1=1 ${sql.unsafe(deletedFilter)}`;
    total = Number(count.count);
  }

  return c.json({ shooters, total, limit, offset });
});

// Export all active shooters as CSV — admin only
shooterRoutes.get('/export/csv', async (c) => {
  const shooters = await sql`
    SELECT first_name, last_name, category, tag, division, power_factor, region, email
    FROM shooters
    WHERE deleted_at IS NULL
    ORDER BY last_name, first_name
  `;

  let csv = '﻿';
  csv += 'first_name;last_name;category;tag;division;power_factor;region;email\n';
  for (const s of shooters) {
    csv += `${s.first_name};${s.last_name};${s.category};${s.tag || ''};${s.division};${s.power_factor};${s.region};${s.email || ''}\n`;
  }

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="shooters.csv"');
  return c.body(csv);
});

// Get all distinct tags for autocomplete
shooterRoutes.get('/tags', async (c) => {
  const tags = await sql`
    SELECT DISTINCT tag FROM shooters
    WHERE tag IS NOT NULL AND tag != '' AND deleted_at IS NULL
    ORDER BY tag
  `;
  return c.json(tags.map((t: any) => t.tag));
});

// Create shooter — admin only
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
  await audit(c, 'shooter.create', `shooters:${shooter.id}`, { name: `${first_name} ${last_name}` });
  return c.json(shooter, 201);
});

// Bulk update shooters — admin only
shooterRoutes.put('/bulk', async (c) => {
  const { shooterIds, updates } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: 'shooterIds must be a non-empty array' }, 400);
  }

  const setClauses: string[] = [];
  if (updates.division) setClauses.push(`division = '${updates.division}'`);
  if (updates.category) setClauses.push(`category = '${updates.category}'`);
  if (updates.power_factor) setClauses.push(`power_factor = '${updates.power_factor}'`);
  if (updates.tag !== undefined) setClauses.push(`tag = '${updates.tag || null}'`);

  if (setClauses.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  const updated = await sql`
    UPDATE shooters SET ${sql.unsafe(setClauses.join(', '))}, updated_at = NOW()
    WHERE id = ANY(${shooterIds}::uuid[]) AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;

  const failedIds = shooterIds.filter((id: string) => !updated.find((u: any) => u.id === id));
  const failed = failedIds.map((id: string) => ({ id, name: '', reason: 'Shooter not found or already deleted' }));

  return c.json({ updated: updated.length, failed });
});

// Bulk soft-delete shooters — admin only
shooterRoutes.delete('/bulk', async (c) => {
  const { shooterIds } = await c.req.json();
  if (!Array.isArray(shooterIds) || shooterIds.length === 0) {
    return c.json({ error: 'shooterIds must be a non-empty array' }, 400);
  }

  const result = await sql`
    UPDATE shooters SET deleted_at = NOW()
    WHERE id = ANY(${shooterIds}::uuid[]) AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;

  const updatedIds = new Set(result.map((r: any) => r.id));
  const failedIds = shooterIds.filter((id: string) => !updatedIds.has(id));

  let failed: Array<{ id: string; name: string; reason: string }> = [];
  if (failedIds.length > 0) {
    const failedShooters = await sql`
      SELECT id, first_name, last_name, deleted_at FROM shooters WHERE id = ANY(${failedIds}::uuid[])
    `;
    failed = failedShooters.map((s: any) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      reason: s.deleted_at ? 'Already deleted' : 'Not found',
    }));
  }

  return c.json({ deleted: result.length, failed });
});

// Get matches a shooter is registered in
shooterRoutes.get('/:id/matches', async (c) => {
  const id = c.req.param('id');
  const registrations = await sql`
    SELECT mr.id as registration_id, m.id as match_id, m.name as match_name, m.date,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category
    FROM match_registrations mr
    JOIN matches m ON m.id = mr.match_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.shooter_id = ${id}
    ORDER BY m.date DESC
  `;
  return c.json(registrations);
});

// Get shooter detail
shooterRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [shooter] = await sql`SELECT * FROM shooters WHERE id = ${id}`;
  if (!shooter) return c.json({ error: 'Shooter not found' }, 404);

  const history = await sql`
    SELECT mr.id, mr.match_id, m.name as match_name, m.date, mr.division, mr.category, mr.power_factor, mr.is_dq
    FROM match_registrations mr
    JOIN matches m ON m.id = mr.match_id
    WHERE mr.shooter_id = ${id}
    ORDER BY m.date DESC
  `;

  return c.json({ ...shooter, match_history: history });
});

// Update shooter — admin only
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
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `;
  if (!updated) {
    const [existing] = await sql`SELECT id FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: 'Shooter not found' }, 404);
    return c.json({ error: 'Shooter is deleted and cannot be edited' }, 410);
  }
  await audit(c, 'shooter.update', `shooters:${id}`);
  return c.json(updated);
});

// Soft-delete shooter — admin only
shooterRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`
    UPDATE shooters SET deleted_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id, first_name, last_name
  `;
  if (result.length === 0) {
    const [existing] = await sql`SELECT id FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: 'Shooter not found' }, 404);
    return c.json({ error: 'Shooter already deleted' }, 410);
  }
  await audit(c, 'shooter.delete', `shooters:${id}`);
  return c.json({ deleted: true });
});

// Restore a soft-deleted shooter — admin only
shooterRoutes.post('/:id/restore', async (c) => {
  const id = c.req.param('id');
  const [shooter] = await sql`
    UPDATE shooters SET deleted_at = NULL, updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NOT NULL
    RETURNING *
  `;
  if (!shooter) {
    const [existing] = await sql`SELECT id, deleted_at FROM shooters WHERE id = ${id}`;
    if (!existing) return c.json({ error: 'Shooter not found' }, 404);
    return c.json({ error: 'Shooter is not deleted' }, 400);
  }
  await audit(c, 'shooter.restore', `shooters:${id}`);
  return c.json(shooter);
});
