import { Hono } from 'hono';
import { sql } from '../db/client.js';
import { audit } from '../services/audit.js';

export const matchExportRoutes = new Hono();

/**
 * GET /api/matches/:id/export
 * Export a full match as a self-contained JSON document.
 * Read-only — returns match + stages + registrations + scores + targets + chrono.
 */
matchExportRoutes.get('/matches/:id/export', async (c) => {
  const matchId = c.req.param('id');

  const [match] = await sql`SELECT id, name, date, organization, firearm_type, match_level, is_current FROM matches WHERE id = ${matchId}`;
  if (!match) {
    return c.json({ error: 'Match not found' }, 404);
  }

  const stages = await sql`SELECT id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config FROM stages WHERE match_id = ${matchId} ORDER BY stage_number`;

  const registrations = await sql`
    SELECT mr.id, mr.squad, mr.division AS division_override, mr.category AS category_override,
           mr.power_factor AS power_factor_override, mr.is_dq, mr.dq_reason,
           s.id AS shooter_id, s.first_name, s.last_name, s.category, s.division,
           s.power_factor, s.region, s.email, s.winmss_member_id
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId}
  `;

  const stageScores = await sql`SELECT id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points, total_time, x_count, score_data FROM stage_scores WHERE match_id = ${matchId}`;

  const stageScoreIds = stageScores.map((s: any) => s.id);

  let targetScores: any[] = [];
  let chronoResults: any[] = [];
  if (stageScoreIds.length > 0) {
    targetScores = await sql`SELECT id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data FROM target_scores WHERE stage_score_id = ANY(${stageScoreIds})`;
    chronoResults = await sql`SELECT id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3, avg_velocity, calculated_pf, pf_passed FROM chrono_results WHERE stage_score_id = ANY(${stageScoreIds})`;
  }

  const result = {
    format_version: 1,
    exported_at: new Date().toISOString(),
    match: {
      id: match.id,
      name: match.name,
      date: match.date,
      organization: match.organization,
      firearm_type: match.firearm_type,
      match_level: match.match_level,
    },
    stages: stages.map(({ id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config }: any) => ({
      id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config,
    })),
    registrations: registrations.map((r: any) => ({
      id: r.id,
      shooter: {
        id: r.shooter_id,
        first_name: r.first_name,
        last_name: r.last_name,
        category: r.category,
        division: r.division,
        power_factor: r.power_factor,
        region: r.region,
        email: r.email,
        winmss_member_id: r.winmss_member_id,
      },
      squad: r.squad,
      division_override: r.division_override,
      category_override: r.category_override,
      power_factor_override: r.power_factor_override,
      is_dq: r.is_dq,
      dq_reason: r.dq_reason,
    })),
    stage_scores: stageScores.map((s: any) => ({
      id: s.id,
      stage_id: s.stage_id,
      registration_id: s.registration_id,
      time: s.time,
      extra_shot_count: s.extra_shot_count,
      extra_hit_count: s.extra_hit_count,
      stacking_count: s.stacking_count,
      overtime_shot_count: s.overtime_shot_count,
      procedural_count: s.procedural_count,
      ftsa_count: s.ftsa_count,
      is_dnf: s.is_dnf,
      raw_points: s.raw_points,
      penalty_points: s.penalty_points,
      net_points: s.net_points,
      hit_factor: s.hit_factor,
      stage_percent: s.stage_percent,
      stage_points: s.stage_points,
      total_time: s.total_time,
      x_count: s.x_count,
      score_data: s.score_data,
    })),
    target_scores: targetScores.map((t: any) => ({
      id: t.id,
      stage_score_id: t.stage_score_id,
      target_index: t.target_index,
      target_type: t.target_type,
      alpha: t.alpha,
      charlie: t.charlie,
      delta: t.delta,
      miss: t.miss,
      no_shoot_hits: t.no_shoot_hits,
      steel_hit: t.steel_hit,
      target_data: t.target_data,
    })),
    chrono_results: chronoResults.map((c: any) => ({
      id: c.id,
      stage_score_id: c.stage_score_id,
      bullet_weight: c.bullet_weight,
      velocity_1: c.velocity_1,
      velocity_2: c.velocity_2,
      velocity_3: c.velocity_3,
      avg_velocity: c.avg_velocity,
      calculated_pf: c.calculated_pf,
      pf_passed: c.pf_passed,
    })),
  };

  const safeName = (match.name || 'match').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const date = new Date().toISOString().slice(0, 10);

  await audit(c, 'match.export', `matches:${matchId}`);

  c.header('Content-Disposition', `attachment; filename="${safeName}-${date}.match.json"`);
  c.header('Content-Type', 'application/json; charset=utf-8');
  return c.json(result);
});

/**
 * POST /api/matches/import
 * Import a match from a JSON file.
 * Checks for match ID collision upfront, then inserts everything in one transaction.
 */
matchExportRoutes.post('/matches/import', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  let data: any;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return c.json({ error: 'Invalid JSON file' }, 400);
  }

  if (!data.format_version || !data.match || !data.stages || !data.registrations) {
    return c.json({ error: 'Invalid match export file: missing required fields' }, 400);
  }

  const matchId = data.match.id;

  // Check for ID collision upfront
  const [existing] = await sql`SELECT id FROM matches WHERE id = ${matchId}`;
  if (existing) {
    return c.json({ error: 'A match with this ID already exists', code: 'MATCH_ID_CONFLICT' }, 409);
  }

  // Insert everything in a transaction
  await sql.begin(async (tx) => {
    // 1. Insert shooters (skip if they already exist)
    const shooters = new Map<string, any>();
    for (const reg of data.registrations) {
      if (reg.shooter && !shooters.has(reg.shooter.id)) {
        shooters.set(reg.shooter.id, reg.shooter);
      }
    }
    for (const [, shooter] of shooters) {
      await tx`INSERT INTO shooters (id, first_name, last_name, category, division, power_factor, region, email, winmss_member_id)
        VALUES (${shooter.id}, ${shooter.first_name}, ${shooter.last_name}, ${shooter.category}, ${shooter.division}, ${shooter.power_factor}, ${shooter.region || ''}, ${shooter.email || null}, ${shooter.winmss_member_id || null})
        ON CONFLICT (id) DO NOTHING`;
    }

    // 2. Insert match
    await tx`INSERT INTO matches (id, name, date, organization, firearm_type, match_level, is_current)
      VALUES (${data.match.id}, ${data.match.name}, ${data.match.date}, ${data.match.organization}, ${data.match.firearm_type}, ${data.match.match_level || null}, false)`;

    // 3. Insert stages
    for (const stage of data.stages) {
      await tx`INSERT INTO stages (id, match_id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points, par_time, briefing, config)
        VALUES (${stage.id}, ${matchId}, ${stage.stage_number}, ${stage.name}, ${stage.scoring_type}, ${stage.paper_targets || 0}, ${stage.steel_targets || 0}, ${stage.no_shoot_targets || 0}, ${stage.npm_targets || 0}, ${stage.hits_per_paper || 2}, ${stage.min_rounds || 0}, ${stage.max_points || 0}, ${stage.par_time || null}, ${stage.briefing || null}, ${JSON.stringify(stage.config || {})})`;
    }

    // 4. Insert match_registrations
    for (const reg of data.registrations) {
      await tx`INSERT INTO match_registrations (id, match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
        VALUES (${reg.id}, ${matchId}, ${reg.shooter.id}, ${reg.squad || null}, ${reg.division_override || null}, ${reg.category_override || null}, ${reg.power_factor_override || null}, ${reg.is_dq || false}, ${reg.dq_reason || null})`;
    }

    // 5. Insert stage_scores
    for (const score of data.stage_scores) {
      await tx`INSERT INTO stage_scores (id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points, total_time, x_count, score_data)
        VALUES (${score.id}, ${matchId}, ${score.stage_id}, ${score.registration_id}, ${score.time || null}, ${score.extra_shot_count || 0}, ${score.extra_hit_count || 0}, ${score.stacking_count || 0}, ${score.overtime_shot_count || 0}, ${score.procedural_count || 0}, ${score.ftsa_count || 0}, ${score.is_dnf || false}, ${score.raw_points || 0}, ${score.penalty_points || 0}, ${score.net_points || 0}, ${score.hit_factor || 0}, ${score.stage_percent || 0}, ${score.stage_points || 0}, ${score.total_time || null}, ${score.x_count || 0}, ${JSON.stringify(score.score_data || {})})`;
    }

    // 6. Insert target_scores
    for (const target of data.target_scores) {
      await tx`INSERT INTO target_scores (id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data)
        VALUES (${target.id}, ${target.stage_score_id}, ${target.target_index}, ${target.target_type}, ${target.alpha || 0}, ${target.charlie || 0}, ${target.delta || 0}, ${target.miss || 0}, ${target.no_shoot_hits || 0}, ${target.steel_hit || null}, ${JSON.stringify(target.target_data || {})})`;
    }

    // 7. Insert chrono_results
    for (const chrono of data.chrono_results) {
      await tx`INSERT INTO chrono_results (id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3, avg_velocity, calculated_pf, pf_passed)
        VALUES (${chrono.id}, ${chrono.stage_score_id}, ${chrono.bullet_weight}, ${chrono.velocity_1 || null}, ${chrono.velocity_2 || null}, ${chrono.velocity_3 || null}, ${chrono.avg_velocity}, ${chrono.calculated_pf}, ${chrono.pf_passed})`;
    }
  });

  await audit(c, 'match.import', `matches:${matchId}`, {
    stages: data.stages.length,
    registrations: data.registrations.length,
    scores: data.stage_scores.length,
  });

  return c.json({
    success: true,
    match_id: matchId,
    counts: {
      stages: data.stages.length,
      registrations: data.registrations.length,
      scores: data.stage_scores.length,
      targets: data.target_scores.length,
      chrono: data.chrono_results.length,
    },
  });
});
