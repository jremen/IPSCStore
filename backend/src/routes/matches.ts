import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const matchRoutes = new Hono();

// List matches
matchRoutes.get('/', async (c) => {
  const matches = await sql`
    SELECT m.id, m.name, m.date, m.organization, m.firearm_type, m.match_level, m.is_current, m.created_at,
           (SELECT COUNT(*) FROM match_registrations mr WHERE mr.match_id = m.id) AS shooter_count
    FROM matches m
    ORDER BY m.date DESC
  `;
  return c.json(matches.map(m => ({ ...m, shooter_count: Number(m.shooter_count), match_level: m.match_level ?? null })));
});

// Create match
matchRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const { name, date, organization, firearm_type, match_level } = body;

  if (!name || !date || !organization || !firearm_type) {
    return c.json({ error: 'name, date, organization, and firearm_type are required' }, 400);
  }

  // Validate match_level (optional, must be 1-5)
  const level = match_level === null || match_level === undefined || match_level === ''
    ? null
    : Number(match_level);
  if (level !== null && (!Number.isInteger(level) || level < 1 || level > 5)) {
    return c.json({ error: 'match_level must be an integer between 1 and 5' }, 400);
  }

  const [match] = await sql`
    INSERT INTO matches (name, date, organization, firearm_type, match_level)
    VALUES (${name}, ${date}, ${organization}, ${firearm_type}, ${level})
    RETURNING *
  `;
  return c.json(match, 201);
});

// Get the current match
matchRoutes.get('/current', async (c) => {
  const [match] = await sql`
    SELECT id, name, date, organization, firearm_type, match_level, is_current
    FROM matches
    WHERE is_current = true
    LIMIT 1
  `;
  if (!match) return c.json(null);
  return c.json(match);
});

// Set a match as current (unsets any previous current match)
matchRoutes.put('/:id/set-current', async (c) => {
  const id = c.req.param('id');

  // Verify match exists
  const [existing] = await sql`SELECT id FROM matches WHERE id = ${id}`;
  if (!existing) return c.json({ error: 'Match not found' }, 404);

  // Unset any current match, then set the new one
  await sql`UPDATE matches SET is_current = false WHERE is_current = true`;
  await sql`UPDATE matches SET is_current = true, updated_at = NOW() WHERE id = ${id}`;

  const [match] = await sql`
    SELECT id, name, date, organization, firearm_type, match_level, is_current
    FROM matches WHERE id = ${id}
  `;
  return c.json(match);
});

// Unset the current match
matchRoutes.put('/unset-current', async (c) => {
  await sql`UPDATE matches SET is_current = false WHERE is_current = true`;
  return c.json({ success: true });
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
    }),
    { total_shots: 0, total_points: 0, total_paper: 0, total_steel: 0 }
  );

  return c.json({ ...match, stages, shooter_count: Number(regCount.count), summary });
});

// Update match
matchRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, date, organization, firearm_type, match_level } = body;

  // Validate match_level if provided (must be null or 1-5)
  let levelValue: number | null = null;
  let levelProvided = match_level !== undefined;
  if (levelProvided) {
    if (match_level === null || match_level === '') {
      levelValue = null;
    } else {
      const n = Number(match_level);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return c.json({ error: 'match_level must be null or an integer between 1 and 5' }, 400);
      }
      levelValue = n;
    }
  }

  const [updated] = await sql`
    UPDATE matches
    SET name = COALESCE(${name}, name),
        date = COALESCE(${date}, date),
        organization = COALESCE(${organization}, organization),
        firearm_type = COALESCE(${firearm_type}, firearm_type),
        match_level = ${levelProvided ? levelValue : sql`match_level`},
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