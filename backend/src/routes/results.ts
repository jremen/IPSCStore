import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const resultsRoutes = new Hono();

// ── Helper: build match-level CTE query (avoids JOIN fan-out) ───────
// CTE pre-aggregates stage_scores (per-registration) separately from
// target_scores (per-registration) so SUM(stage_points) isn't multiplied
// by the number of target rows.
function matchCte(isDq: boolean) {
  const dqFilter = isDq ? 'AND mr.is_dq = TRUE' : 'AND mr.is_dq = FALSE';
  return `
    WITH stage_totals AS (
      SELECT
        ss.registration_id,
        SUM(ss.stage_points) as match_points,
        SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
      FROM stage_scores ss
      JOIN stages st ON st.id = ss.stage_id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    ),
    target_totals AS (
      SELECT
        ss.registration_id,
        SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
        SUM(ts.charlie) as charlie,
        SUM(ts.delta) as delta,
        SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
        SUM(ts.no_shoot_hits) as no_shoot
      FROM stage_scores ss
      JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.match_id = $1
      GROUP BY ss.registration_id
    )
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      ${isDq ? 'mr.dq_reason,' : ''}
      COALESCE(st.match_points, 0) as match_points,
      COALESCE(st.total_time, 0) as time,
      COALESCE(tt.alpha, 0) as alpha,
      COALESCE(tt.charlie, 0) as charlie,
      COALESCE(tt.delta, 0) as delta,
      COALESCE(tt.miss, 0) as miss,
      COALESCE(tt.no_shoot, 0) as no_shoot
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_totals st ON st.registration_id = mr.id
    LEFT JOIN target_totals tt ON tt.registration_id = mr.id
    WHERE mr.match_id = $1 ${dqFilter}
  `;
}

// ── Helper: run CTE query via sql.raw ────────────────────────────────
async function runMatchQuery(matchId: string, isDq: boolean) {
  const query = matchCte(isDq);
  const order = isDq ? 'ORDER BY s.last_name, s.first_name' : 'ORDER BY match_points DESC';
  return sql.unsafe(query.replace(/\$1/g, `'${matchId}'`) + '\n' + order);
}

// Overall results (cross-division)
resultsRoutes.get('/matches/:matchId/results/overall', async (c) => {
  const matchId = c.req.param('matchId');

  const results = await runMatchQuery(matchId, false);
  const highestPoints = results.length > 0 ? Number(results[0].match_points) : 0;

  const ranked = results.map((r: any, i: number) => ({
    ...r,
    position: i + 1,
    match_points: Number(r.match_points),
    match_percent: highestPoints > 0 ? Math.round((Number(r.match_points) / highestPoints) * 10000) / 100 : 0,
  }));

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r: any) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0,
  }));

  return c.json({ results: ranked, dq: dqRanked });
});

// Results by division — per-division rankings with positions and match_percent
resultsRoutes.get('/matches/:matchId/results/divisions', async (c) => {
  const matchId = c.req.param('matchId');

  const results = await runMatchQuery(matchId, false);

  const divisionResults: Record<string, any[]> = {};
  const divisionGroups: Record<string, any[]> = {};

  for (const r of results) {
    const div = r.division || 'unknown';
    if (!divisionGroups[div]) divisionGroups[div] = [];
    divisionGroups[div].push(r);
  }

  for (const [division, shooters] of Object.entries(divisionGroups)) {
    const highestPoints = shooters.length > 0 ? Number(shooters[0].match_points) : 0;

    divisionResults[division] = shooters.map((r: any, i: number) => ({
      ...r,
      position: i + 1,
      match_points: Number(r.match_points),
      match_percent: highestPoints > 0 ? Math.round((Number(r.match_points) / highestPoints) * 10000) / 100 : 0,
    }));
  }

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r: any) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0,
  }));

  return c.json({ ...divisionResults, dq: dqRanked });
});

// Per-stage results (grouped by division within each stage)
resultsRoutes.get('/matches/:matchId/results/stages', async (c) => {
  const matchId = c.req.param('matchId');

  const stages = await sql`SELECT id, stage_number, name FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;
  const stageResults = [];

  for (const stage of stages) {
    const scores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq
      ORDER BY division, ss.stage_points DESC
    `;

    const normalizedScores = scores.map((s: any) => ({
      ...s,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      stage_percent: Number(s.stage_percent),
      stage_points: Number(s.stage_points),
      time: s.time != null ? Number(s.time) : null,
    }));

    const divisionGroups: Record<string, any[]> = {};
    for (const s of normalizedScores) {
      const div = s.division || 'unknown';
      if (!divisionGroups[div]) divisionGroups[div] = [];
      divisionGroups[div].push(s);
    }

    const groupedScores: any[] = [];
    for (const [division, divScores] of Object.entries(divisionGroups)) {
      divScores.forEach((s: any, i: number) => {
        groupedScores.push({
          ...s,
          position: i + 1,
          division_position: i + 1,
        });
      });
    }

    groupedScores.sort((a, b) => b.stage_points - a.stage_points);
    groupedScores.forEach((s, i) => { s.position = i + 1; });

    const dqScores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq, mr.dq_reason,
             COALESCE(SUM(ts.alpha), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
             COALESCE(SUM(ts.charlie), 0) as charlie,
             COALESCE(SUM(ts.delta), 0) as delta,
             COALESCE(SUM(ts.miss), 0) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
             COALESCE(SUM(ts.no_shoot_hits), 0) as no_shoot
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN target_scores ts ON ts.stage_score_id = ss.id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
      GROUP BY ss.id, ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
               s.first_name, s.last_name, s.division, mr.division, mr.is_dq, mr.dq_reason
      ORDER BY s.last_name, s.first_name
    `;

    stageResults.push({
      stage_id: stage.id,
      stage_number: stage.stage_number,
      stage_name: stage.name,
      scores: groupedScores,
      dq_scores: dqScores.map((s: any) => ({
        ...s,
        hit_factor: Number(s.hit_factor),
        net_points: Number(s.net_points),
        time: Number(s.time),
      })),
      divisions: Object.fromEntries(
        Object.entries(divisionGroups).map(([div, divScores]) => [
          div,
          divScores.map((s: any, i: number) => ({
            ...s,
            position: i + 1,
          })),
        ])
      ),
    });
  }

  return c.json(stageResults);
});

// Single stage results
resultsRoutes.get('/matches/:matchId/results/stages/:stageId', async (c) => {
  const { matchId, stageId } = c.req.param();

  const scores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = FALSE
    ORDER BY ss.stage_points DESC
  `;

  const dqScores = await sql`
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
           s.first_name, s.last_name,
           COALESCE(mr.division, s.division) as division,
           COALESCE(mr.category, s.category) as category,
           mr.is_dq, mr.dq_reason
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    ORDER BY s.last_name, s.first_name
  `;

  return c.json({
    results: scores.map((s: any, i: number) => ({
      ...s,
      position: i + 1,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      stage_percent: Number(s.stage_percent),
      stage_points: Number(s.stage_points),
      time: s.time !== null && s.time !== undefined ? Number(s.time) : null,
    })),
    dq: dqScores.map((s: any) => ({
      ...s,
      hit_factor: Number(s.hit_factor),
      net_points: Number(s.net_points),
      time: Number(s.time),
    })),
  });
});

// Results by category (grouped by division within each category)
resultsRoutes.get('/matches/:matchId/results/categories', async (c) => {
  const matchId = c.req.param('matchId');

  const categories = ['regular', 'junior', 'senior', 'super_senior', 'lady'];
  const categoryResults: Record<string, Record<string, any[]>> = {};

  for (const cat of categories) {
    const query = `
      WITH stage_totals AS (
        SELECT
          ss.registration_id,
          SUM(ss.stage_points) as match_points,
          SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
        FROM stage_scores ss
        JOIN stages st ON st.id = ss.stage_id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      ),
      target_totals AS (
        SELECT
          ss.registration_id,
          SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
          SUM(ts.charlie) as charlie,
          SUM(ts.delta) as delta,
          SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
          SUM(ts.no_shoot_hits) as no_shoot
        FROM stage_scores ss
        JOIN target_scores ts ON ts.stage_score_id = ss.id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      )
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND COALESCE(mr.category, s.category) = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${cat}'`));

    if (results.length > 0) {
      const byDivision: Record<string, any[]> = {};
      for (const r of results) {
        const div = r.division || 'unknown';
        if (!byDivision[div]) byDivision[div] = [];
        byDivision[div].push(r);
      }

      categoryResults[cat] = {};
      for (const [div, divResults] of Object.entries(byDivision)) {
        const highest = Number(divResults[0].match_points);
        categoryResults[cat][div] = divResults.map((r: any, i: number) => ({
          ...r,
          position: i + 1,
          match_points: Number(r.match_points),
          match_percent: highest > 0 ? Math.round((Number(r.match_points) / highest) * 10000) / 100 : 0,
        }));
      }
    }
  }

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r: any) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0,
  }));

  return c.json({ ...categoryResults, dq: dqRanked });
});

// Results by tag (grouped by division within each tag)
resultsRoutes.get('/matches/:matchId/results/tags', async (c) => {
  const matchId = c.req.param('matchId');

  const tags = await sql`
    SELECT DISTINCT s.tag FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId} AND s.tag IS NOT NULL AND s.tag != ''
    ORDER BY s.tag
  `;

  const tagResults: Record<string, Record<string, any[]>> = {};

  for (const { tag } of tags) {
    const query = `
      WITH stage_totals AS (
        SELECT
          ss.registration_id,
          SUM(ss.stage_points) as match_points,
          SUM(CASE WHEN st.scoring_type IN ('idpa','action_steel','multi_gun') THEN ss.total_time ELSE ss.time END) as total_time
        FROM stage_scores ss
        JOIN stages st ON st.id = ss.stage_id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      ),
      target_totals AS (
        SELECT
          ss.registration_id,
          SUM(ts.alpha) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = TRUE THEN 1 ELSE 0 END), 0) as alpha,
          SUM(ts.charlie) as charlie,
          SUM(ts.delta) as delta,
          SUM(ts.miss) + COALESCE(SUM(CASE WHEN ts.target_type = 'steel' AND ts.steel_hit = FALSE THEN 1 ELSE 0 END), 0) as miss,
          SUM(ts.no_shoot_hits) as no_shoot
        FROM stage_scores ss
        JOIN target_scores ts ON ts.stage_score_id = ss.id
        WHERE ss.match_id = $1
        GROUP BY ss.registration_id
      )
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(st.match_points, 0) as match_points,
        COALESCE(st.total_time, 0) as time,
        COALESCE(tt.alpha, 0) as alpha,
        COALESCE(tt.charlie, 0) as charlie,
        COALESCE(tt.delta, 0) as delta,
        COALESCE(tt.miss, 0) as miss,
        COALESCE(tt.no_shoot, 0) as no_shoot
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_totals st ON st.registration_id = mr.id
      LEFT JOIN target_totals tt ON tt.registration_id = mr.id
      WHERE mr.match_id = $1 AND s.tag = $2 AND mr.is_dq = FALSE
      ORDER BY division, match_points DESC
    `;
    const results = await sql.unsafe(query.replace(/\$1/g, `'${matchId}'`).replace(/\$2/g, `'${tag}'`));

    if (results.length > 0) {
      const byDivision: Record<string, any[]> = {};
      for (const r of results) {
        const div = r.division || 'unknown';
        if (!byDivision[div]) byDivision[div] = [];
        byDivision[div].push(r);
      }

      tagResults[tag] = {};
      for (const [div, divResults] of Object.entries(byDivision)) {
        const highest = Number(divResults[0].match_points);
        tagResults[tag][div] = divResults.map((r: any, i: number) => ({
          ...r,
          position: i + 1,
          match_points: Number(r.match_points),
          match_percent: highest > 0 ? Math.round((Number(r.match_points) / highest) * 10000) / 100 : 0,
        }));
      }
    }
  }

  const dq = await runMatchQuery(matchId, true);
  const dqRanked = dq.map((r: any) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0,
  }));

  return c.json({ ...tagResults, dq: dqRanked });
});

// Per-stage score details for a single shooter, including target-level data
resultsRoutes.get('/matches/:matchId/shooters/:registrationId/stage-summaries', async (c) => {
  const { matchId, registrationId } = c.req.param();

  const [reg] = await sql`
    SELECT mr.id, mr.division as reg_division, mr.category as reg_category, mr.power_factor as reg_power_factor,
           mr.is_dq,
           s.first_name, s.last_name, s.division as shooter_division, s.category as shooter_category, s.power_factor as shooter_power_factor
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.id = ${registrationId} AND mr.match_id = ${matchId}
  `;

  if (!reg) return c.json({ error: 'Registration not found' }, 404);

  const registration = {
    first_name: reg.first_name,
    last_name: reg.last_name,
    division: reg.reg_division || reg.shooter_division,
    category: reg.reg_category || reg.shooter_category,
    power_factor: reg.reg_power_factor || reg.shooter_power_factor,
    is_dq: reg.is_dq,
  };

  const stages = await sql`SELECT * FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;

  const stageSummaries = [];

  for (const stage of stages) {
    const [score] = await sql`
      SELECT * FROM stage_scores WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
    `;

    if (!score) continue;

    const targets = await sql`
      SELECT target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data
      FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
    `;

    stageSummaries.push({
      stage: {
        id: stage.id,
        stage_number: stage.stage_number,
        name: stage.name,
        scoring_type: stage.scoring_type,
        paper_targets: stage.paper_targets,
        steel_targets: stage.steel_targets,
        no_shoot_targets: stage.no_shoot_targets,
        npm_targets: stage.npm_targets,
        hits_per_paper: stage.hits_per_paper,
        min_rounds: stage.min_rounds,
        max_points: stage.max_points,
        par_time: stage.par_time,
        briefing: stage.briefing,
        config: stage.config,
      },
      score: {
        time: score.time,
        raw_points: Number(score.raw_points),
        penalty_points: Number(score.penalty_points),
        net_points: Number(score.net_points),
        hit_factor: Number(score.hit_factor),
        stage_percent: Number(score.stage_percent),
        stage_points: Number(score.stage_points),
        total_time: score.total_time != null ? Number(score.total_time) : null,
        x_count: score.x_count || 0,
        is_dnf: score.is_dnf,
        score_data: score.score_data || null,
        targets: targets.map((t: any) => ({
          target_index: t.target_index,
          target_type: t.target_type,
          alpha: t.alpha || 0,
          charlie: t.charlie || 0,
          delta: t.delta || 0,
          miss: t.miss || 0,
          no_shoot_hits: t.no_shoot_hits || 0,
          steel_hit: t.steel_hit,
          target_data: t.target_data || null,
        })),
      },
    });
  }

  return c.json({ registration, stages: stageSummaries });
});
