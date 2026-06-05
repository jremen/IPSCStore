import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const matchRoutes = new Hono();

// List matches
matchRoutes.get('/', async (c) => {
  const matches = await sql`
    SELECT id, name, date, organization, firearm_type, created_at
    FROM matches
    ORDER BY date DESC
  `;
  return c.json(matches);
});

// Create match
matchRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { name, date, organization, firearm_type } = body;

  if (!name || !date || !organization || !firearm_type) {
    return c.json({ error: 'name, date, organization, and firearm_type are required' }, 400);
  }

  const [match] = await sql`
    INSERT INTO matches (name, date, organization, firearm_type)
    VALUES (${name}, ${date}, ${organization}, ${firearm_type})
    RETURNING *
  `;
  return c.json(match, 201);
});

// Get match with summary
matchRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [match] = await sql`
    SELECT * FROM matches WHERE id = ${id}
  `;
  if (!match) return c.json({ error: 'Match not found' }, 404);

  // Get stages summary
  const stages = await sql`
    SELECT id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets,
           min_rounds, max_points, par_time, image_path
    FROM stages WHERE match_id = ${id}
    ORDER BY stage_number
  `;

  // Get registration count
  const [regCount] = await sql`
    SELECT COUNT(*) as count FROM match_registrations WHERE match_id = ${id}
  `;

  // Match summary: totals from all stages
  const summary = stages.reduce(
    (acc, s) => ({
      total_shots: acc.total_shots + s.min_rounds,
      total_points: acc.total_points + Number(s.max_points),
      total_paper: acc.total_paper + s.paper_targets,
      total_steel: acc.total_steel + s.steel_targets,
      total_no_shoot: acc.total_no_shoot + s.no_shoot_targets,
    }),
    { total_shots: 0, total_points: 0, total_paper: 0, total_steel: 0, total_no_shoot: 0 }
  );

  return c.json({ ...match, stages, shooter_count: Number(regCount.count), summary });
});

// Update match
matchRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, date, organization, firearm_type } = body;

  const [updated] = await sql`
    UPDATE matches
    SET name = COALESCE(${name}, name),
        date = COALESCE(${date}, date),
        organization = COALESCE(${organization}, organization),
        firearm_type = COALESCE(${firearm_type}, firearm_type),
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Match not found' }, 404);
  return c.json(updated);
});

// Delete match
matchRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`DELETE FROM matches WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: 'Match not found' }, 404);
  return c.json({ deleted: true });
});