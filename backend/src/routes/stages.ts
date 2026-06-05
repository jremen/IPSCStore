import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const stageRoutes = new Hono();

// List stages for a match
stageRoutes.get('/matches/:matchId/stages', async (c) => {
  const matchId = c.req.param('matchId');
  const stages = await sql`
    SELECT * FROM stages WHERE match_id = ${matchId} ORDER BY stage_number
  `;
  return c.json(stages);
});

// Calculate min_rounds and max_points based on scoring_type and config
function calcStageParams(scoring_type: string, paper_targets: number, steel_targets: number, no_shoot_targets: number, hits_per_paper: number, config: any): { min_rounds: number; max_points: number } {
  switch (scoring_type) {
    case 'comstock':
    case 'virginia':
    case 'fixed_time':
    case 'hit_factor':
    case 'idpa': {
      const min_rounds = (paper_targets * hits_per_paper) + steel_targets;
      const max_points = (paper_targets * hits_per_paper * 5) + (steel_targets * 5);
      return { min_rounds, max_points };
    }
    case 'action_steel': {
      const strings = config?.number_of_strings || 5;
      const targets = config?.targets_per_string || 5;
      const min_rounds = strings * targets;
      const max_points = strings * targets * 5; // each plate hit = 5 pts (conceptual)
      return { min_rounds, max_points };
    }
    case 'multi_gun': {
      const numTargets = config?.num_targets || paper_targets || 0;
      const min_rounds = numTargets;
      const max_points = numTargets * 5;
      return { min_rounds, max_points };
    }
    case 'bullseye': {
      const shots = config?.shots_per_string || 10;
      return { min_rounds: shots, max_points: shots * 10 };
    }
    case 'archery': {
      const arrows = config?.arrows_per_end || 6;
      return { min_rounds: arrows, max_points: arrows * 10 };
    }
    case 'long_range': {
      if (config?.variant === 'f_class') {
        const shots = config?.shots_per_string || 20;
        return { min_rounds: shots, max_points: shots * 10 };
      }
      // PRS: hit/miss per target
      const numTargets = config?.num_targets || paper_targets || 10;
      return { min_rounds: numTargets, max_points: numTargets };
    }
    case 'nrl22': {
      const numTargets = config?.num_targets || paper_targets || 10;
      const pointValue = config?.point_value || 10;
      return { min_rounds: numTargets, max_points: numTargets * pointValue };
    }
    default: {
      const min_rounds = (paper_targets * hits_per_paper) + steel_targets;
      const max_points = (paper_targets * hits_per_paper * 5) + (steel_targets * 5);
      return { min_rounds, max_points };
    }
  }
}

// Create stage
stageRoutes.post('/matches/:matchId/stages', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { name, scoring_type, paper_targets = 0, steel_targets = 0, no_shoot_targets = 0, hits_per_paper = 2, par_time, config, password } = body;

  if (!name || !scoring_type) {
    return c.json({ error: 'name and scoring_type are required' }, 400);
  }

  // Auto-assign next stage number
  const [maxNum] = await sql`
    SELECT COALESCE(MAX(stage_number), 0) as max_num FROM stages WHERE match_id = ${matchId}
  `;
  const stage_number = Number(maxNum.max_num) + 1;

  const stageConfig = config || {};
  const { min_rounds, max_points } = calcStageParams(scoring_type, paper_targets, steel_targets, no_shoot_targets, hits_per_paper, stageConfig);

  const [stage] = await sql`
    INSERT INTO stages (match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
                        no_shoot_targets, hits_per_paper, min_rounds, max_points, par_time, config, password)
    VALUES (${matchId}, ${stage_number}, ${name}, ${scoring_type}, ${paper_targets}, ${steel_targets},
            ${no_shoot_targets}, ${hits_per_paper}, ${min_rounds}, ${max_points}, ${par_time || null}, ${JSON.stringify(stageConfig)}, ${password || null})
    RETURNING *
  `;
  return c.json(stage, 201);
});

// Get stage detail
stageRoutes.get('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${id}`;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);
  return c.json(stage);
});

// Update stage
stageRoutes.put('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, scoring_type, paper_targets, steel_targets, no_shoot_targets, hits_per_paper, par_time, config, password } = body;

  // Recalculate min_rounds and max_points if targets changed
  const [existing] = await sql`SELECT * FROM stages WHERE id = ${id}`;
  if (!existing) return c.json({ error: 'Stage not found' }, 404);

  const st = scoring_type || existing.scoring_type;
  const pt = paper_targets ?? Number(existing.paper_targets);
  const stl = steel_targets ?? Number(existing.steel_targets);
  const nst = no_shoot_targets ?? Number(existing.no_shoot_targets);
  const hpp = hits_per_paper ?? Number(existing.hits_per_paper);
  const stageConfig = config ?? (typeof existing.config === 'string' ? JSON.parse(existing.config) : existing.config || {});
  const { min_rounds, max_points } = calcStageParams(st, pt, stl, nst, hpp, stageConfig);

  const [updated] = await sql`
    UPDATE stages
    SET name = COALESCE(${name}, name),
        scoring_type = COALESCE(${scoring_type}, scoring_type),
        paper_targets = ${pt},
        steel_targets = ${stl},
        no_shoot_targets = ${nst},
        hits_per_paper = ${hpp},
        min_rounds = ${min_rounds},
        max_points = ${max_points},
        par_time = ${par_time !== undefined ? par_time : existing.par_time},
        config = ${JSON.stringify(stageConfig)},
        password = ${password !== undefined ? password : existing.password},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return c.json(updated);
});

// Delete stage
stageRoutes.delete('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`DELETE FROM stages WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: 'Stage not found' }, 404);
  return c.json({ deleted: true });
});

// Upload stage image
stageRoutes.post('/stages/:id/image', async (c) => {
  const id = c.req.param('id');
  const [stage] = await sql`SELECT id, match_id FROM stages WHERE id = ${id}`;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  const body = await c.req.parseBody();
  const file = body['image'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const { validateImageFile, saveUploadedFile } = await import('../utils/fileStorage.js');
  const error = validateImageFile({ type: file.type, size: file.size });
  if (error) return c.json({ error }, 400);

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `stage_${id}.${ext}`;
  const data = await file.arrayBuffer();
  const filePath = await saveUploadedFile(filename, data);

  await sql`
    UPDATE stages SET image_path = ${filePath}, updated_at = NOW() WHERE id = ${id}
  `;
  return c.json({ image_path: filePath });
});

// Delete stage image
stageRoutes.delete('/stages/:id/image', async (c) => {
  const id = c.req.param('id');
  const [stage] = await sql`SELECT image_path FROM stages WHERE id = ${id}`;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);
  if (!stage.image_path) return c.json({ error: 'No image to delete' }, 400);

  const { deleteUploadedFile } = await import('../utils/fileStorage.js');
  await deleteUploadedFile(stage.image_path);
  await sql`UPDATE stages SET image_path = NULL, updated_at = NOW() WHERE id = ${id}`;
  return c.json({ deleted: true });
});