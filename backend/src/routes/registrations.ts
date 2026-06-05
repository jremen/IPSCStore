import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const registrationRoutes = new Hono();

// List registrations for a match
registrationRoutes.get('/matches/:matchId/registrations', async (c) => {
  const matchId = c.req.param('matchId');
  const registrations = await sql`
    SELECT mr.id, mr.squad, mr.division as reg_division, mr.category as reg_category,
           mr.power_factor as reg_power_factor, mr.is_dq, mr.dq_reason,
           s.id as shooter_id, s.first_name, s.last_name, s.category, s.tag,
           s.division, s.power_factor, s.region, s.email
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
    ORDER BY mr.squad NULLS LAST, s.last_name, s.first_name
  `;

  // Resolve overrides: use registration override if set, else shooter default
  const resolved = registrations.map((r: any) => ({
    ...r,
    effective_division: r.reg_division || r.division,
    effective_category: r.reg_category || r.category,
    effective_power_factor: r.reg_power_factor || r.power_factor,
  }));

  return c.json(resolved);
});

// Register shooter(s) to a match
registrationRoutes.post('/matches/:matchId/registrations', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();

  // Support single or bulk registration
  const shooterIds: string[] = body.shooterIds || [body.shooterId];
  if (!shooterIds.length) {
    return c.json({ error: 'shooterId or shooterIds required' }, 400);
  }

  const results = [];
  for (const shooterId of shooterIds) {
    try {
      const [reg] = await sql`
        INSERT INTO match_registrations (match_id, shooter_id, squad)
        VALUES (${matchId}, ${shooterId}, ${body.squad || null})
        RETURNING *
      `;
      results.push(reg);
    } catch (err: any) {
      if (err.code === '23505') {
        // Duplicate — skip
        results.push({ shooter_id: shooterId, skipped: true });
      } else {
        throw err;
      }
    }
  }
  return c.json(results, 201);
});

// Inline create shooter and register to match
registrationRoutes.post('/matches/:matchId/registrations/create-and-add', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email, squad } = body;

  if (!first_name || !last_name || !category || !division || !power_factor || !region) {
    return c.json({ error: 'Required shooter fields missing' }, 400);
  }

  // Create shooter
  const [shooter] = await sql`
    INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
    VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
    RETURNING *
  `;

  // Register to match
  const [reg] = await sql`
    INSERT INTO match_registrations (match_id, shooter_id, squad)
    VALUES (${matchId}, ${shooter.id}, ${squad || null})
    RETURNING *
  `;

  return c.json({ shooter, registration: reg }, 201);
});

// Bulk update registrations (division, category, power_factor, squad overrides)
registrationRoutes.put('/matches/:matchId/registrations/bulk', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { registrationIds, updates } = body;

  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: 'registrationIds must be a non-empty array' }, 400);
  }
  if (!updates || typeof updates !== 'object') {
    return c.json({ error: 'updates object is required' }, 400);
  }

  const allowedFields = ['division', 'category', 'power_factor', 'squad'];
  const updateFields: Record<string, any> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateFields[field] = updates[field];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  let updated = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  for (const regId of registrationIds) {
    try {
      // Verify registration belongs to this match
      const [reg] = await sql`
        SELECT mr.id, s.first_name, s.last_name
        FROM match_registrations mr
        JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId} AND mr.match_id = ${matchId}
      `;
      if (!reg) {
        failed.push({ id: regId, name: regId, reason: 'Not found in this match' });
        continue;
      }

      await sql`
        UPDATE match_registrations
        SET division = ${updateFields.division !== undefined ? updateFields.division : sql`division`},
            category = ${updateFields.category !== undefined ? updateFields.category : sql`category`},
            power_factor = ${updateFields.power_factor !== undefined ? updateFields.power_factor : sql`power_factor`},
            squad = ${updateFields.squad !== undefined ? updateFields.squad : sql`squad`}
        WHERE id = ${regId}
      `;
      updated++;
    } catch {
      const [reg] = await sql`
        SELECT s.first_name, s.last_name
        FROM match_registrations mr JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId}
      `;
      failed.push({ id: regId, name: reg ? `${reg.first_name} ${reg.last_name}` : regId, reason: 'Update failed' });
    }
  }

  return c.json({ updated, failed });
});

// Bulk remove registrations from a match
registrationRoutes.delete('/matches/:matchId/registrations/bulk', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { registrationIds } = body;

  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: 'registrationIds must be a non-empty array' }, 400);
  }

  let removed = 0;
  const failed: Array<{ id: string; name: string; reason: string }> = [];

  for (const regId of registrationIds) {
    try {
      // Get shooter name for reporting before delete
      const [reg] = await sql`
        SELECT mr.id, s.first_name, s.last_name
        FROM match_registrations mr
        JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId} AND mr.match_id = ${matchId}
      `;
      if (!reg) {
        failed.push({ id: regId, name: regId, reason: 'Not found in this match' });
        continue;
      }

      // Cascade deletes stage_scores, target_scores, chrono_results via FK
      const result = await sql`DELETE FROM match_registrations WHERE id = ${regId} AND match_id = ${matchId} RETURNING id`;
      if (result.length > 0) {
        removed++;
      } else {
        failed.push({ id: regId, name: `${reg.first_name} ${reg.last_name}`, reason: 'Not found' });
      }
    } catch {
      const [reg] = await sql`
        SELECT s.first_name, s.last_name
        FROM match_registrations mr JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId}
      `;
      failed.push({ id: regId, name: reg ? `${reg.first_name} ${reg.last_name}` : regId, reason: 'Remove failed' });
    }
  }

  return c.json({ removed, failed });
});

// Update registration (overrides, squad)
registrationRoutes.put('/matches/:matchId/registrations/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { division, category, power_factor, squad } = body;

  const [updated] = await sql`
    UPDATE match_registrations
    SET division = ${division !== undefined ? division : sql`division`},
        category = ${category !== undefined ? category : sql`category`},
        power_factor = ${power_factor !== undefined ? power_factor : sql`power_factor`},
        squad = ${squad !== undefined ? squad : sql`squad`}
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Registration not found' }, 404);
  return c.json(updated);
});

// Remove shooter from match
registrationRoutes.delete('/matches/:matchId/registrations/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`DELETE FROM match_registrations WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: 'Registration not found' }, 404);
  return c.json({ deleted: true });
});

// Get squad summary
registrationRoutes.get('/matches/:matchId/squads', async (c) => {
  const matchId = c.req.param('matchId');
  const squads = await sql`
    SELECT mr.squad, COUNT(*) as shooter_count
    FROM match_registrations mr
    WHERE mr.match_id = ${matchId} AND mr.squad IS NOT NULL
    GROUP BY mr.squad
    ORDER BY mr.squad
  `;

  const unassigned = await sql`
    SELECT COUNT(*) as count FROM match_registrations
    WHERE match_id = ${matchId} AND squad IS NULL
  `;

  return c.json({
    squads: squads.map((s: any) => ({ squad: s.squad, shooter_count: Number(s.shooter_count) })),
    unassigned_count: Number(unassigned[0].count),
  });
});

// DQ shooter
registrationRoutes.put('/matches/:matchId/registrations/:id/dq', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { dq_reason } = body;

  const [updated] = await sql`
    UPDATE match_registrations SET is_dq = TRUE, dq_reason = ${dq_reason || null}
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Registration not found' }, 404);

  // Zero out all stage_points for this shooter
  await sql`
    UPDATE stage_scores SET stage_points = 0, stage_percent = 0
    WHERE registration_id = ${id}
  `;

  return c.json(updated);
});

// Remove DQ
registrationRoutes.put('/matches/:matchId/registrations/:id/undq', async (c) => {
  const { matchId, id } = c.req.param();
  const [updated] = await sql`
    UPDATE match_registrations SET is_dq = FALSE, dq_reason = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Registration not found' }, 404);

  // Recalculate all stages in the match to restore the shooter's stage_percent/stage_points
  const stages = await sql`SELECT id FROM stages WHERE match_id = ${matchId}`;
  for (const stage of stages) {
    // Import recalculateStage inline to avoid circular dependency
    const [stageRow] = await sql`SELECT * FROM stages WHERE id = ${stage.id}`;
    if (!stageRow) continue;
    const stageConfig = typeof stageRow.config === 'string' ? JSON.parse(stageRow.config) : (stageRow.config || {});

    const scores = await sql`
      SELECT ss.id, ss.hit_factor, ss.net_points, ss.total_time, ss.x_count, ss.registration_id,
             COALESCE(mr.division, s.division) as division
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE AND ss.is_dnf = FALSE
    `;

    const scoringType = stageRow.scoring_type;
    const maxPoints = Number(stageRow.max_points);

    const divisionGroups = new Map<string, any[]>();
    for (const score of scores) {
      const div = (score as any).division || 'unknown';
      if (!divisionGroups.has(div)) divisionGroups.set(div, []);
      divisionGroups.get(div)!.push(score);
    }

    for (const [, divScores] of divisionGroups) {
      if (['comstock', 'virginia', 'hit_factor'].includes(scoringType)) {
        const highestHF = Math.max(0, ...divScores.map((s: any) => Number(s.hit_factor)));
        for (const score of divScores) {
          const stagePercent = highestHF > 0 ? Math.round((Number(score.hit_factor) / highestHF) * 1000000) / 10000 : 0;
          const stagePoints = Math.round((stagePercent / 100) * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else if (scoringType === 'fixed_time') {
        const highestNP = Math.max(0, ...divScores.map((s: any) => Number(s.net_points)));
        for (const score of divScores) {
          const stagePercent = highestNP > 0 ? Math.round((Number(score.net_points) / highestNP) * 1000000) / 10000 : 0;
          const stagePoints = Math.round((stagePercent / 100) * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else if (['idpa', 'action_steel', 'multi_gun'].includes(scoringType)) {
        const validTimes = divScores.map((s: any) => Number(s.total_time)).filter((t: number) => t > 0);
        const lowestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
        for (const score of divScores) {
          const stagePercent = lowestTime > 0 ? Math.round((lowestTime / Number(score.total_time)) * 1000000) / 10000 : 0;
          const stagePoints = Math.round((stagePercent / 100) * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      } else {
        // Bullseye, archery, NRL22, long_range — rank by net_points within division
        const highestNP = Math.max(0, ...divScores.map((s: any) => Number(s.net_points)));
        for (const score of divScores) {
          const stagePercent = highestNP > 0 ? Math.round((Number(score.net_points) / highestNP) * 1000000) / 10000 : 0;
          const stagePoints = Math.round((stagePercent / 100) * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      }
    }

    // DQ shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
    `;
    // DNF shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stage.id} AND is_dnf = TRUE
    `;
  }

  return c.json(updated);
});