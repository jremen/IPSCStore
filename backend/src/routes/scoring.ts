import { Hono } from 'hono';
import { sql } from '../db/client.js';
import {
  calculateScore, calculateHitFactorScore, calculateIDPAScore,
  calculateActionSteelScore, calculateMultiGunScore, calculateRingScore,
  calculateHitCountScore, calculateAggregatedScore
} from '../utils/scoringCalc.js';

export const scoringRoutes = new Hono();

// Get scoring progress for a match — which shooters have been scored on which stages
scoringRoutes.get('/matches/:matchId/scoring-progress', async (c) => {
  const matchId = c.req.param('matchId');

  const scored = await sql`
    SELECT ss.stage_id, ss.registration_id, mr.squad
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    WHERE ss.match_id = ${matchId}
  `;

  return c.json({
    scored: scored.map(s => ({
      stage_id: s.stage_id,
      registration_id: s.registration_id,
      squad: s.squad,
    })),
  });
});

// Get all scores for a stage
scoringRoutes.get('/matches/:matchId/stages/:stageId/scores', async (c) => {
  const { matchId, stageId } = c.req.param();
  const scores = await sql`
    SELECT ss.*, s.first_name, s.last_name, mr.squad,
           COALESCE(mr.power_factor, s.power_factor) as effective_pf,
           COALESCE(mr.division, s.division) as effective_division
    FROM stage_scores ss
    JOIN match_registrations mr ON mr.id = ss.registration_id
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE ss.stage_id = ${stageId} AND ss.match_id = ${matchId}
    ORDER BY s.last_name, s.first_name
  `;
  return c.json(scores);
});

// Get single shooter's score for a stage
scoringRoutes.get('/matches/:matchId/stages/:stageId/scores/:registrationId', async (c) => {
  const { matchId, stageId, registrationId } = c.req.param();

  const [score] = await sql`
    SELECT ss.* FROM stage_scores ss
    WHERE ss.stage_id = ${stageId} AND ss.registration_id = ${registrationId} AND ss.match_id = ${matchId}
  `;
  if (!score) return c.json({ error: 'Score not found' }, 404);

  const targetScores = await sql`
    SELECT * FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
  `;

  const [chrono] = await sql`
    SELECT * FROM chrono_results WHERE stage_score_id = ${score.id}
  `;

  return c.json({ ...score, targets: targetScores, chrono: chrono || null });
});

// Save/update score for a shooter on a stage
scoringRoutes.put('/matches/:matchId/stages/:stageId/scores/:registrationId', async (c) => {
  const { matchId, stageId, registrationId } = c.req.param();
  const body = await c.req.json();
  const { time, targets, procedural_count = 0, ftsa_count = 0, extra_shot_count = 0,
          extra_hit_count = 0, stacking_count = 0, overtime_shot_count = 0, is_dnf = false, chrono,
          score_data } = body;

  // Get stage config
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${stageId}`;
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  const scoringType = stage.scoring_type as string;
  const stageConfig = typeof stage.config === 'string' ? JSON.parse(stage.config) : (stage.config || {});

  // Get shooter's effective power factor
  const [reg] = await sql`
    SELECT mr.power_factor as reg_pf, s.power_factor as shooter_pf
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.id = ${registrationId}
  `;
  const powerFactor = (reg?.reg_pf || reg?.shooter_pf || 'minor') as 'minor' | 'major';

  // Check if this score was imported from WinMSS — use aggregated calculation to preserve totals
  const sd = score_data || {};
  const isWinMSSImport = sd.source === 'winmss' && sd.aggregated;

  // Calculate score based on scoring type
  let calcResult: any;
  let total_time: number | null = null;
  let x_count = 0;

  if (isWinMSSImport && (scoringType === 'comstock' || scoringType === 'virginia' || scoringType === 'fixed_time' || scoringType === 'hit_factor')) {
    const agg = sd.aggregated;
    calcResult = calculateAggregatedScore({
      total_alpha: agg.alpha || 0,
      total_charlie: agg.charlie || 0,
      total_delta: agg.delta || 0,
      total_miss: agg.miss || 0,
      total_no_shoot: agg.no_shoot || 0,
      total_steel: agg.steel_count || 0,
      steel_hit_count: agg.steel_count || 0,
      procedural_count: agg.procedural || procedural_count,
      ftsa_count: ftsa_count,
      extra_shot_count: extra_shot_count,
      extra_hit_count: extra_hit_count,
      stacking_count: stacking_count,
      overtime_shot_count: overtime_shot_count,
      time: time,
      scoring_type: scoringType as any,
      power_factor: powerFactor,
    });

  } else if (scoringType === 'comstock' || scoringType === 'virginia' || scoringType === 'fixed_time') {
    calcResult = calculateScore({
      targets: targets.map((t: any) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper),
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: scoringType as any,
      power_factor: powerFactor,
      par_time: stage.par_time,
    });

  } else if (scoringType === 'hit_factor') {
    calcResult = calculateHitFactorScore({
      targets: targets.map((t: any) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper),
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: 'comstock',
      power_factor: powerFactor,
      par_time: stage.par_time,
    });

  } else if (scoringType === 'idpa') {
    const sd = score_data || {};
    calcResult = calculateIDPAScore({
      targets: targets.map((t: any) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper),
      })),
      time: time || 0,
      penalty_pe: sd.penalty_pe || 0,
      penalty_hnt: sd.penalty_hnt || 0,
      penalty_ftn: sd.penalty_ftn || 0,
      penalty_fp: sd.penalty_fp || 0,
      penalty_ftdr: sd.penalty_ftdr || 0,
    });
    total_time = calcResult.total_time;

  } else if (scoringType === 'action_steel') {
    const sd = score_data || {};
    calcResult = calculateActionSteelScore({
      string_times: sd.string_times || [],
      string_plate_hits: sd.string_plate_hits || [],
      number_of_strings: stageConfig.number_of_strings || 5,
      drop_worst: stageConfig.drop_worst ?? 1,
      miss_penalty: 3,
      stop_plate_miss_cap: 30,
    });
    total_time = calcResult.total_time;

  } else if (scoringType === 'multi_gun') {
    const sd = score_data || {};
    calcResult = calculateMultiGunScore({
      time: time || 0,
      targets: targets.map((t: any) => ({
        neutralized: t.target_data?.neutralized ?? false,
      })),
      penalty_ftn_sec: sd.penalty_ftn_sec || 0,
      penalty_miss_sec: sd.penalty_miss_sec || 0,
      penalty_no_shoot_sec: sd.penalty_no_shoot_sec || 0,
      penalty_procedural_sec: sd.penalty_procedural_sec || 0,
    });
    total_time = calcResult.total_time;

  } else if (scoringType === 'bullseye' || scoringType === 'archery' || (scoringType === 'long_range' && stageConfig.variant === 'f_class')) {
    const sd = score_data || {};
    const ringValues = sd.ring_values || [];
    calcResult = calculateRingScore(ringValues);
    x_count = calcResult.x_count;

  } else if (scoringType === 'nrl22' || (scoringType === 'long_range' && stageConfig.variant !== 'f_class')) {
    const hits = targets.filter((t: any) => t.target_data?.hit === true).length;
    const pointValue = stageConfig.point_value || 10;
    calcResult = calculateHitCountScore(hits, pointValue);

  } else if (scoringType === 'chrono') {
    calcResult = { raw_points: 0, penalty_points: 0, net_points: 0, hit_factor: 0 };

  } else {
    calcResult = calculateScore({
      targets: targets.map((t: any) => ({
        target_type: t.target_type,
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
        steel_hit: t.steel_hit,
        hits_per_paper: Number(stage.hits_per_paper),
      })),
      time,
      procedural_count,
      ftsa_count,
      extra_shot_count,
      extra_hit_count,
      stacking_count,
      overtime_shot_count,
      scoring_type: 'comstock' as any,
      power_factor: powerFactor,
      par_time: stage.par_time,
    });
  }

  // Run the entire save + recalculate in a transaction to prevent concurrent write conflicts
  const scoreResult = await sql.begin(async (sql) => {
    // Upsert stage_score with type-specific fields
    const [score] = await sql`
      INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
        extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count,
        procedural_count, ftsa_count, is_dnf,
        raw_points, penalty_points, net_points, hit_factor,
        total_time, x_count, score_data)
      VALUES (${matchId}, ${stageId}, ${registrationId}, ${time ?? null},
        ${extra_shot_count}, ${extra_hit_count}, ${stacking_count}, ${overtime_shot_count},
        ${procedural_count}, ${ftsa_count}, ${is_dnf},
        ${calcResult.raw_points}, ${calcResult.penalty_points}, ${calcResult.net_points}, ${calcResult.hit_factor},
        ${total_time}, ${x_count}, ${JSON.stringify(score_data || {})})
      ON CONFLICT (stage_id, registration_id) DO UPDATE SET
        time = ${time ?? null},
        extra_shot_count = ${extra_shot_count},
        extra_hit_count = ${extra_hit_count},
        stacking_count = ${stacking_count},
        overtime_shot_count = ${overtime_shot_count},
        procedural_count = ${procedural_count},
        ftsa_count = ${ftsa_count},
        is_dnf = ${is_dnf},
        raw_points = ${calcResult.raw_points},
        penalty_points = ${calcResult.penalty_points},
        net_points = ${calcResult.net_points},
        hit_factor = ${calcResult.hit_factor},
        total_time = ${total_time},
        x_count = ${x_count},
        score_data = ${JSON.stringify(score_data || {})},
        updated_at = NOW()
      RETURNING *
    `;

    // Upsert target_scores
    for (const t of targets) {
      const targetData = t.target_data ? JSON.stringify(t.target_data) : '{}';
      await sql`
        INSERT INTO target_scores (stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data)
        VALUES (${score.id}, ${t.target_index}, ${t.target_type}, ${t.alpha || 0}, ${t.charlie || 0}, ${t.delta || 0}, ${t.miss || 0}, ${t.no_shoot_hits || 0}, ${t.steel_hit !== undefined ? t.steel_hit : null}, ${targetData}::jsonb)
        ON CONFLICT (stage_score_id, target_index) DO UPDATE SET
          alpha = ${t.alpha || 0}, charlie = ${t.charlie || 0}, delta = ${t.delta || 0},
          miss = ${t.miss || 0}, no_shoot_hits = ${t.no_shoot_hits || 0},
          steel_hit = ${t.steel_hit !== undefined ? t.steel_hit : null},
          target_data = ${targetData}::jsonb
      `;
    }

    // Handle chrono if provided
    if (chrono && scoringType === 'chrono') {
      const { calculateChronoPf, checkPfPassed } = await import('../utils/scoringCalc.js');
      const chronoResult = calculateChronoPf(chrono.bullet_weight, chrono.velocity_1, chrono.velocity_2, chrono.velocity_3);

      const [match] = await sql`SELECT organization FROM matches WHERE id = ${matchId}`;
      const pfCheck = checkPfPassed(chronoResult.calculatedPf, powerFactor, match.organization);

      await sql`
        INSERT INTO chrono_results (stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3,
                                     avg_velocity, calculated_pf, pf_passed)
        VALUES (${score.id}, ${chrono.bullet_weight}, ${chrono.velocity_1 || null}, ${chrono.velocity_2 || null},
                ${chrono.velocity_3 || null}, ${chronoResult.avgVelocity}, ${chronoResult.calculatedPf}, ${pfCheck.passed})
        ON CONFLICT (stage_score_id) DO UPDATE SET
          bullet_weight = ${chrono.bullet_weight},
          velocity_1 = ${chrono.velocity_1 || null},
          velocity_2 = ${chrono.velocity_2 || null},
          velocity_3 = ${chrono.velocity_3 || null},
          avg_velocity = ${chronoResult.avgVelocity},
          calculated_pf = ${chronoResult.calculatedPf},
          pf_passed = ${pfCheck.passed},
          updated_at = NOW()
      `;

      if (pfCheck.reclassifyTo) {
        await sql`
          UPDATE match_registrations SET power_factor = ${pfCheck.reclassifyTo}
          WHERE id = ${registrationId}
        `;
      }
    }

    return score;
  });

  // Recalculate stage rankings (outside transaction — reads committed data)
  await recalculateStage(matchId, stageId);

  return c.json({ ...scoreResult, targets, calcResult });
});

// Recalculate all scores for a stage
scoringRoutes.post('/matches/:matchId/stages/:stageId/recalculate', async (c) => {
  const { matchId, stageId } = c.req.param();
  await recalculateStage(matchId, stageId);
  return c.json({ recalculated: true });
});

// Recalculate all scores for a match
scoringRoutes.post('/matches/:matchId/recalculate', async (c) => {
  const matchId = c.req.param('matchId');
  const stages = await sql`SELECT id FROM stages WHERE match_id = ${matchId}`;
  for (const stage of stages) {
    await recalculateStage(matchId, stage.id);
  }
  return c.json({ recalculated: true, stage_count: stages.length });
});

/**
 * Recalculate stage_percent and stage_points for all shooters on a stage.
 * Uses atomic SQL window functions instead of per-row UPDATEs to prevent
 * race conditions when multiple range officers save simultaneously.
 */
async function recalculateStage(matchId: string, stageId: string) {
  const [stage] = await sql`SELECT * FROM stages WHERE id = ${stageId}`;
  const stageConfig = typeof stage.config === 'string' ? JSON.parse(stage.config) : (stage.config || {});
  const scoringType = stage.scoring_type;
  const maxPoints = Number(stage.max_points);

  // Use a transaction for atomicity — prevents concurrent recalculations from interleaving
  await sql.begin(async (sql) => {

    if (['comstock', 'virginia', 'hit_factor'].includes(scoringType)) {
      // Rank by hit_factor (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_hf <= 0 THEN 0
                 ELSE (ss.hit_factor / best.best_hf) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.hit_factor) as best_hf
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (scoringType === 'fixed_time') {
      // Rank by net_points (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (['idpa', 'action_steel', 'multi_gun'].includes(scoringType)) {
      // Rank by total_time (lowest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.lowest_time <= 0 OR ss.total_time <= 0 THEN 0
                 ELSE (best.lowest_time / ss.total_time) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MIN(ss2.total_time) as lowest_time
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND ss2.total_time > 0
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (['bullseye', 'archery'].includes(scoringType) || (scoringType === 'long_range' && stageConfig.variant === 'f_class')) {
      // Rank by net_points (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;

    } else if (['nrl22'].includes(scoringType) || (scoringType === 'long_range' && stageConfig.variant !== 'f_class')) {
      // Rank by net_points (highest wins) within each division
      await sql`
        WITH ranked AS (
          SELECT ss.id,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * 100 END, 4) as stage_percent,
            ROUND(CASE WHEN best.best_np <= 0 THEN 0
                 ELSE (ss.net_points / best.best_np) * ${maxPoints} END, 2) as stage_points
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          CROSS JOIN LATERAL (
            SELECT MAX(ss2.net_points) as best_np
            FROM stage_scores ss2
            JOIN match_registrations mr2 ON mr2.id = ss2.registration_id
            JOIN shooters s2 ON s2.id = mr2.shooter_id
            WHERE ss2.stage_id = ${stageId}
              AND mr2.is_dq = FALSE
              AND ss2.is_dnf = FALSE
              AND COALESCE(mr2.division, s2.division) = COALESCE(mr.division, s.division)
          ) best
          WHERE ss.stage_id = ${stageId}
            AND mr.is_dq = FALSE
            AND ss.is_dnf = FALSE
        )
        UPDATE stage_scores ss
        SET stage_percent = ranked.stage_percent, stage_points = ranked.stage_points
        FROM ranked
        WHERE ss.id = ranked.id
      `;
    }

    // DQ shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores ss
      SET stage_points = 0, stage_percent = 0
      FROM match_registrations mr
      WHERE ss.registration_id = mr.id AND ss.stage_id = ${stageId} AND mr.is_dq = TRUE
    `;

    // DNF shooters: zero stage_points and stage_percent
    await sql`
      UPDATE stage_scores
      SET stage_points = 0, stage_percent = 0
      WHERE stage_id = ${stageId} AND is_dnf = TRUE
    `;
  });
}