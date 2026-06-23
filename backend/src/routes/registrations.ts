import { Hono } from 'hono';
import { sql } from '../db/client.js';
import { env } from '../env.js';
import { audit } from '../services/audit.js';

export const registrationRoutes = new Hono();

/**
 * Scrub PII fields from registration data for public/anonymous access.
 * Removes email, region, winmss_member_id when the caller is not admin.
 */
function scrubPII(row: any, isPublic: boolean): any {
  if (!isPublic) return row;
  const { email, region, winmss_member_id, ...rest } = row;
  return rest;
}

// List registrations for a match — public read (PII scrubbed for anonymous)
registrationRoutes.get('/matches/:matchId/registrations', async (c) => {
  const matchId = c.req.param('matchId');
  const role = ((c as any).get('authRole') as string) || 'anonymous';
  const isPublic = role === 'anonymous';

  const registrations = await sql`
    SELECT mr.id, mr.squad, mr.group_id, mr.division as reg_division, mr.category as reg_category,
           mr.power_factor as reg_power_factor, mr.is_dq, mr.dq_reason,
           s.id as shooter_id, s.first_name, s.last_name, s.category, s.tag,
           s.division, s.power_factor, s.region, s.email
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
    ORDER BY mr.squad NULLS LAST, s.last_name, s.first_name
  `;

  const resolved = registrations.map((r: any) => ({
    ...scrubPII(r, isPublic),
    effective_division: r.reg_division || r.division,
    effective_category: r.reg_category || r.category,
    effective_power_factor: r.reg_power_factor || r.power_factor,
  }));

  return c.json(resolved);
});

// Create a new group from selected registrations — admin only
registrationRoutes.post('/matches/:matchId/registrations/group', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { registrationIds } = body;

  if (!Array.isArray(registrationIds) || registrationIds.length < 2) {
    return c.json({ error: 'registrationIds must be a non-empty array with at least 2 entries' }, 400);
  }

  const groupId = crypto.randomUUID();

  for (const regId of registrationIds) {
    await sql`
      UPDATE match_registrations
      SET group_id = ${groupId}
      WHERE id = ${regId} AND match_id = ${matchId}
    `;
  }

  await audit(c, 'registration.group.create', `registrations:${matchId}`, { groupId, registrationIds });
  return c.json({ group_id: groupId }, 201);
});

// Add registrations to an existing group — admin only
registrationRoutes.put('/matches/:matchId/registrations/group/:groupId/add', async (c) => {
  const { matchId, groupId } = c.req.param();
  const body = await c.req.json();
  const { registrationIds } = body;

  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return c.json({ error: 'registrationIds must be a non-empty array' }, 400);
  }

  for (const regId of registrationIds) {
    await sql`
      UPDATE match_registrations
      SET group_id = ${groupId}
      WHERE id = ${regId} AND match_id = ${matchId}
    `;
  }

  await audit(c, 'registration.group.add', `registrations:${matchId}`, { groupId, registrationIds });
  return c.body(null, 204);
});

// Dissolve a group (set group_id to NULL for all members) — admin only
registrationRoutes.delete('/matches/:matchId/registrations/group/:groupId', async (c) => {
  const { matchId, groupId } = c.req.param();

  await sql`
    UPDATE match_registrations
    SET group_id = NULL
    WHERE match_id = ${matchId} AND group_id = ${groupId}
  `;

  await audit(c, 'registration.group.delete', `registrations:${matchId}`, { groupId });
  return c.body(null, 204);
});

// Remove a single registration from its group — admin only
registrationRoutes.delete('/matches/:matchId/registrations/:id/group', async (c) => {
  const { matchId, id } = c.req.param();

  await sql`
    UPDATE match_registrations
    SET group_id = NULL
    WHERE id = ${id} AND match_id = ${matchId}
  `;

  await audit(c, 'registration.group.remove', `registrations:${id}`);
  return c.body(null, 204);
});

// Register shooter(s) to a match — admin only
registrationRoutes.post('/matches/:matchId/registrations', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();

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
        results.push({ shooter_id: shooterId, skipped: true });
      } else {
        throw err;
      }
    }
  }
  await audit(c, 'registration.create', `registrations:${matchId}`, { shooterIds });
  return c.json(results, 201);
});

// Inline create shooter and register to match — admin only
registrationRoutes.post('/matches/:matchId/registrations/create-and-add', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { first_name, last_name, category, tag, division, power_factor, region, email, squad } = body;

  if (!first_name || !last_name || !category || !division || !power_factor || !region) {
    return c.json({ error: 'Required shooter fields missing' }, 400);
  }

  const [shooter] = await sql`
    INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
    VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
    RETURNING *
  `;

  const [reg] = await sql`
    INSERT INTO match_registrations (match_id, shooter_id, squad)
    VALUES (${matchId}, ${shooter.id}, ${squad || null})
    RETURNING *
  `;

  await audit(c, 'registration.create-and-add', `registrations:${matchId}`, { shooterId: shooter.id });
  return c.json({ shooter, registration: reg }, 201);
});

// Bulk update registrations — admin only
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

  const allowedFields = ['division', 'category', 'power_factor', 'squad', 'tag'];
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
      const [reg] = await sql`
        SELECT mr.id, mr.shooter_id, mr.division, mr.category, mr.power_factor,
               s.first_name, s.last_name
        FROM match_registrations mr
        JOIN shooters s ON s.id = mr.shooter_id
        WHERE mr.id = ${regId} AND mr.match_id = ${matchId}
      `;
      if (!reg) {
        failed.push({ id: regId, name: regId, reason: 'Not found in this match' });
        continue;
      }

      // When squad is being updated on a grouped registration, widen to all group members
      let squadTargetIds: string[] = [regId];
      if (updateFields.squad !== undefined && reg.group_id) {
        const siblings = await sql`
          SELECT id FROM match_registrations
          WHERE match_id = ${matchId} AND group_id = ${reg.group_id} AND id != ${regId}
        `;
        squadTargetIds = [regId, ...siblings.map((s: any) => s.id)];
      }

      for (const targetId of squadTargetIds) {
        await sql`
          UPDATE match_registrations
          SET division = ${updateFields.division !== undefined ? updateFields.division : sql`division`},
              category = ${updateFields.category !== undefined ? updateFields.category : sql`category`},
              power_factor = ${updateFields.power_factor !== undefined ? updateFields.power_factor : sql`power_factor`},
              squad = ${updateFields.squad !== undefined ? updateFields.squad : sql`squad`}
          WHERE id = ${targetId}
        `;
      }

      const shooterUpdates: string[] = [];
      const shooterValues: any[] = [];

      if (updateFields.division !== undefined && reg.division === null
          && updateFields.division !== null && updateFields.division !== '') {
        shooterUpdates.push('division');
        shooterValues.push(updateFields.division);
      }
      if (updateFields.category !== undefined && reg.category === null
          && updateFields.category !== null && updateFields.category !== '') {
        shooterUpdates.push('category');
        shooterValues.push(updateFields.category);
      }
      if (updateFields.power_factor !== undefined && reg.power_factor === null
          && updateFields.power_factor !== null && updateFields.power_factor !== '') {
        shooterUpdates.push('power_factor');
        shooterValues.push(updateFields.power_factor);
      }
      if (updateFields.tag !== undefined) {
        shooterUpdates.push('tag');
        shooterValues.push(updateFields.tag);
      }

      if (shooterUpdates.length > 0 && reg.shooter_id) {
        const setClauses = shooterUpdates.map((f, i) => `${f} = $${i + 1}`).join(', ');
        shooterValues.push(reg.shooter_id, new Date().toISOString());
        const query = `UPDATE shooters SET ${setClauses}, updated_at = $${shooterValues.length} WHERE id = $${shooterValues.length - 1}`;
        await sql.unsafe(query, shooterValues);
      }

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

// Bulk remove registrations — admin only
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

// Update registration — admin only
registrationRoutes.put('/matches/:matchId/registrations/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { division, category, power_factor, squad, tag } = body;

  const [prior] = await sql`
    SELECT division, category, power_factor, shooter_id, group_id
    FROM match_registrations WHERE id = ${id}
  `;
  if (!prior) return c.json({ error: 'Registration not found' }, 404);

  const [updated] = await sql`
    UPDATE match_registrations
    SET division = ${division !== undefined ? division : sql`division`},
        category = ${category !== undefined ? category : sql`category`},
        power_factor = ${power_factor !== undefined ? power_factor : sql`power_factor`},
        squad = ${squad !== undefined ? squad : sql`squad`}
    WHERE id = ${id}
    RETURNING *
  `;

  // When squad is updated on a grouped registration, widen to all group members
  if (squad !== undefined && prior.group_id) {
    const [reg] = await sql`SELECT match_id FROM match_registrations WHERE id = ${id}`;
    if (reg) {
      await sql`
        UPDATE match_registrations
        SET squad = ${squad}
        WHERE match_id = ${reg.match_id} AND group_id = ${prior.group_id} AND id != ${id}
      `;
    }
  }

  const shooterUpdates: string[] = [];
  const shooterValues: any[] = [];

  if (division !== undefined && prior.division === null && division !== null && division !== '') {
    shooterUpdates.push('division');
    shooterValues.push(division);
  }
  if (category !== undefined && prior.category === null && category !== null && category !== '') {
    shooterUpdates.push('category');
    shooterValues.push(category);
  }
  if (power_factor !== undefined && prior.power_factor === null && power_factor !== null && power_factor !== '') {
    shooterUpdates.push('power_factor');
    shooterValues.push(power_factor);
  }
  if (tag !== undefined) {
    shooterUpdates.push('tag');
    shooterValues.push(tag);
  }

  if (shooterUpdates.length > 0 && prior.shooter_id) {
    const setClauses = shooterUpdates.map((field, i) => `${field} = $${i + 1}`).join(', ');
    shooterValues.push(prior.shooter_id, new Date().toISOString());
    const query = `UPDATE shooters SET ${setClauses}, updated_at = $${shooterValues.length} WHERE id = $${shooterValues.length - 1}`;
    await sql.unsafe(query, shooterValues);
  }

  return c.json(updated);
});

// Remove shooter from match — admin only
registrationRoutes.delete('/matches/:matchId/registrations/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`DELETE FROM match_registrations WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: 'Registration not found' }, 404);
  await audit(c, 'registration.delete', `registrations:${id}`);
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

// Export registrations as CSV — admin only
registrationRoutes.get('/matches/:matchId/registrations/export/csv', async (c) => {
  const matchId = c.req.param('matchId');

  const [match] = await sql`SELECT id, name FROM matches WHERE id = ${matchId}`;
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const registrations = await sql`
    SELECT mr.squad,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           COALESCE(mr.power_factor, s.power_factor) as power_factor,
           s.first_name, s.last_name
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
    ORDER BY mr.squad NULLS LAST, s.last_name, s.first_name
  `;

  let csv = '﻿';
  csv += 'first_name;last_name;squad;division;category;power_factor\n';
  for (const r of registrations) {
    const squad = r.squad ?? '';
    const division = r.division ?? '';
    const category = r.category ?? '';
    const powerFactor = r.power_factor ?? '';
    csv += `${r.first_name};${r.last_name};${squad};${division};${category};${powerFactor}\n`;
  }

  const sanitized = (match.name as string).replace(/[^a-zA-Z0-9_-]/g, '_');
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${sanitized}_registrations.csv"`);
  return c.body(csv);
});

// DQ shooter — admin only
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

  await sql`
    UPDATE stage_scores SET stage_points = 0, stage_percent = 0
    WHERE registration_id = ${id}
  `;

  await audit(c, 'registration.dq', `registrations:${id}`, { dq_reason });
  return c.json(updated);
});

// Remove DQ — admin only
registrationRoutes.put('/matches/:matchId/registrations/:id/undq', async (c) => {
  const { matchId, id } = c.req.param();
  const [updated] = await sql`
    UPDATE match_registrations SET is_dq = FALSE, dq_reason = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  if (!updated) return c.json({ error: 'Registration not found' }, 404);

  const stages = await sql`SELECT id FROM stages WHERE match_id = ${matchId}`;
  for (const stage of stages) {
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
        const highestNP = Math.max(0, ...divScores.map((s: any) => Number(s.net_points)));
        for (const score of divScores) {
          const stagePercent = highestNP > 0 ? Math.round((Number(score.net_points) / highestNP) * 1000000) / 10000 : 0;
          const stagePoints = Math.round((stagePercent / 100) * maxPoints * 100) / 100;
          await sql`UPDATE stage_scores SET stage_percent = ${stagePercent}, stage_points = ${stagePoints} WHERE id = ${score.id}`;
        }
      }
    }

    await sql`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
    `;
    await sql`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stage.id} AND is_dnf = TRUE
    `;
  }

  await audit(c, 'registration.undq', `registrations:${id}`);
  return c.json(updated);
});
