import { Hono } from 'hono';
import { sql } from '../db/client.js';
import bcrypt from 'bcryptjs';
import { STAGE_PASSWORD_MIN_LENGTH } from '../utils/passwords.js';

export const stageRoutes = new Hono();

function parseStageJsonb(stage: any): any {
  if (!stage) return stage;
  const result = { ...stage };
  if (typeof result.config === 'string') {
    try { result.config = JSON.parse(result.config); } catch { result.config = {}; }
  }
  return result;
}

const PUBLIC_STAGE_COLUMNS = `
  s.id, s.match_id, s.stage_number, s.name, s.scoring_type,
  s.paper_targets, s.steel_targets, s.no_shoot_targets, s.npm_targets, s.hits_per_paper,
  s.min_rounds, s.max_points, s.par_time, s.image_path, s.briefing, s.config,
  s.password_hash IS NOT NULL AS has_password,
  s.created_at, s.updated_at
`;

const ADMIN_STAGE_COLUMNS = `
  s.id, s.match_id, s.stage_number, s.name, s.scoring_type,
  s.paper_targets, s.steel_targets, s.no_shoot_targets, s.npm_targets, s.hits_per_paper,
  s.min_rounds, s.max_points, s.par_time, s.image_path, s.briefing, s.config,
  s.password_hash, s.password_hash IS NOT NULL AS has_password,
  s.created_at, s.updated_at
`;

const RETURNING_STAGE_COLUMNS = `
  id, match_id, stage_number, name, scoring_type,
  paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper,
  min_rounds, max_points, par_time, image_path, briefing, config,
  password_hash, password_hash IS NOT NULL AS has_password,
  created_at, updated_at
`;

function calcStageParams(scoring_type: string, paper_targets: number, steel_targets: number, no_shoot_targets: number, npm_targets: number, hits_per_paper: number, config: any): { min_rounds: number; max_points: number } {
  switch (scoring_type) {
    case 'comstock':
    case 'virginia':
    case 'fixed_time':
    case 'hit_factor':
    case 'idpa': {
      const min_rounds = (paper_targets * hits_per_paper) + steel_targets;
      const max_points = (paper_targets * hits_per_paper * 5) + (steel_targets * 5) + (npm_targets * 5);
      return { min_rounds, max_points };
    }
    case 'action_steel': {
      const strings = config?.number_of_strings || 5;
      const targets = config?.targets_per_string || 5;
      const min_rounds = strings * targets;
      const max_points = strings * targets * 5;
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
      const max_points = (paper_targets * hits_per_paper * 5) + (steel_targets * 5) + (npm_targets * 5);
      return { min_rounds, max_points };
    }
  }
}

// List stages for a match (public — no password_hash)
stageRoutes.get('/matches/:matchId/stages', async (c) => {
  const matchId = c.req.param('matchId');
  const stages = await sql`
    SELECT ${sql.unsafe(PUBLIC_STAGE_COLUMNS)}
    FROM stages s
    WHERE s.match_id = ${matchId}
    ORDER BY s.stage_number
  `;
  return c.json(stages.map(parseStageJsonb));
});

// Create stage — auth enforced in app.ts
stageRoutes.post('/matches/:matchId/stages', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json();
  const { name, scoring_type, paper_targets = 0, steel_targets = 0, no_shoot_targets = 0, npm_targets = 0, hits_per_paper = 2, par_time, config, password, briefing } = body;

  if (!name || !scoring_type) {
    return c.json({ error: 'name and scoring_type are required' }, 400);
  }

  if (password && password.length < STAGE_PASSWORD_MIN_LENGTH) {
    return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
  }

  const [maxNum] = await sql`
    SELECT COALESCE(MAX(stage_number), 0) as max_num FROM stages WHERE match_id = ${matchId}
  `;
  const stage_number = Number(maxNum.max_num) + 1;

  const stageConfig = config || {};
  const { min_rounds, max_points } = calcStageParams(scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, stageConfig);

  const password_hash = password ? await bcrypt.hash(password, 12) : null;

  const [stage] = await sql`
    INSERT INTO stages (match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
                        no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config, password_hash)
    VALUES (${matchId}, ${stage_number}, ${name}, ${scoring_type}, ${paper_targets}, ${steel_targets},
            ${no_shoot_targets}, ${npm_targets}, ${hits_per_paper}, ${min_rounds}, ${max_points}, ${par_time || null}, ${briefing || null}, ${JSON.stringify(stageConfig)}, ${password_hash})
    RETURNING ${sql.unsafe(RETURNING_STAGE_COLUMNS)}
  `;
  return c.json(parseStageJsonb(stage), 201);
});

// Get stage detail (public — no password_hash)
stageRoutes.get('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const [stage] = await sql`
    SELECT ${sql.unsafe(PUBLIC_STAGE_COLUMNS)}
    FROM stages s
    WHERE s.id = ${id}
  `;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);
  return c.json(parseStageJsonb(stage));
});

// Update stage — auth enforced in app.ts
stageRoutes.put('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, par_time, config, password, briefing } = body;

  const [existing] = await sql`SELECT * FROM stages WHERE id = ${id}`;
  if (!existing) return c.json({ error: 'Stage not found' }, 404);

  const st = scoring_type || existing.scoring_type;
  const pt = paper_targets ?? Number(existing.paper_targets);
  const stl = steel_targets ?? Number(existing.steel_targets);
  const nst = no_shoot_targets ?? Number(existing.no_shoot_targets);
  const npmt = npm_targets ?? Number(existing.npm_targets);
  const hpp = hits_per_paper ?? Number(existing.hits_per_paper);
  const stageConfig = config ?? (typeof existing.config === 'string' ? JSON.parse(existing.config) : existing.config || {});
  const { min_rounds, max_points } = calcStageParams(st, pt, stl, nst, npmt, hpp, stageConfig);

  let password_hash: string | null;
  if (password === '') {
    password_hash = null;
  } else if (password) {
    if (password.length < STAGE_PASSWORD_MIN_LENGTH) {
      return c.json({ error: `Stage password must be at least ${STAGE_PASSWORD_MIN_LENGTH} characters.` }, 400);
    }
    password_hash = await bcrypt.hash(password, 12);
  } else {
    password_hash = existing.password_hash;
  }

  const [updated] = await sql`
    UPDATE stages
    SET name = COALESCE(${name}, name),
        scoring_type = COALESCE(${scoring_type}, scoring_type),
        paper_targets = ${pt},
        steel_targets = ${stl},
        no_shoot_targets = ${nst},
        npm_targets = ${npmt},
        hits_per_paper = ${hpp},
        min_rounds = ${min_rounds},
        max_points = ${max_points},
        par_time = ${par_time !== undefined ? par_time : existing.par_time},
        briefing = COALESCE(${briefing}, briefing),
        config = ${JSON.stringify(stageConfig)},
        password_hash = ${password_hash},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${sql.unsafe(RETURNING_STAGE_COLUMNS)}
  `;
  return c.json(parseStageJsonb(updated));
});

// Delete stage — auth enforced in app.ts
stageRoutes.delete('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const result = await sql`DELETE FROM stages WHERE id = ${id} RETURNING id`;
  if (result.length === 0) return c.json({ error: 'Stage not found' }, 404);
  return c.json({ deleted: true });
});

// Upload stage image — auth enforced in app.ts
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

// Delete stage image — auth enforced in app.ts
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
