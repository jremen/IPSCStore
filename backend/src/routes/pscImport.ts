import crypto from 'crypto';
import { Hono } from 'hono';
import JSZip from 'jszip';
import { sql } from '../db/client.js';
import { audit } from '../services/audit.js';
import { parsePscFiles } from '../utils/pscMapper.js';

export const pscImportRoutes = new Hono();

/**
 * POST /api/matches/import-psc
 * Import a match from a Practiscore .psc file (ZIP with match_def.json + match_scores.json).
 */
pscImportRoutes.post('/matches/import-psc', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No .psc file uploaded' }, 400);
  }

  if (!file.name.endsWith('.psc')) {
    return c.json({ error: 'File must have a .psc extension' }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    const matchDefFile = zip.file('match_def.json');
    const matchScoresFile = zip.file('match_scores.json');

    if (!matchDefFile || !matchScoresFile) {
      return c.json({
        error: 'Invalid .psc file: missing match_def.json and/or match_scores.json',
      }, 400);
    }

    const matchDefText = await matchDefFile.async('text');
    const matchScoresText = await matchScoresFile.async('text');

    let matchDef: any;
    let matchScores: any;
    try {
      matchDef = JSON.parse(matchDefText);
      matchScores = JSON.parse(matchScoresText);
    } catch {
      return c.json({ error: 'Invalid JSON in .psc file' }, 400);
    }

    const parsed = parsePscFiles(matchDef, matchScores);

    const matchId = crypto.randomUUID();

    await sql.begin(async (tx) => {
      for (const shooter of parsed.shooters) {
        await tx`
          INSERT INTO shooters (id, first_name, last_name, category, division, power_factor, region)
          VALUES (${shooter.id}, ${shooter.first_name}, ${shooter.last_name}, ${shooter.category || 'regular'}, ${shooter.division || null}, ${shooter.power_factor || 'minor'}, ${shooter.region || ''})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      await tx`
        INSERT INTO matches (id, name, date, organization, firearm_type, is_current)
        VALUES (${matchId}, ${parsed.match.name}, ${parsed.match.date}, ${parsed.match.organization}, ${parsed.match.firearm_type}, false)
      `;

      for (const stage of parsed.stages) {
        await tx`
          INSERT INTO stages (id, match_id, stage_number, name, scoring_type, paper_targets, steel_targets, no_shoot_targets, npm_targets, hits_per_paper, min_rounds, max_points)
          VALUES (${stage.id}, ${matchId}, ${stage.stage_number}, ${stage.name}, ${stage.scoring_type}, ${stage.paper_targets}, ${stage.steel_targets}, ${stage.no_shoot_targets}, 0, ${stage.hits_per_paper}, ${stage.min_rounds}, ${stage.max_points})
        `;
      }

      for (const reg of parsed.registrations) {
        await tx`
          INSERT INTO match_registrations (id, match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
          VALUES (${reg.id}, ${matchId}, ${reg.shooter_id}, ${reg.squad}, ${reg.division || null}, ${reg.category || 'regular'}, ${reg.power_factor || null}, ${reg.is_dq}, ${reg.dq_reason})
        `;
      }

      for (const score of parsed.stage_scores) {
        await tx`
          INSERT INTO stage_scores (id, match_id, stage_id, registration_id, time, procedural_count, is_dnf, raw_points, penalty_points, net_points, hit_factor, total_time, score_data)
          VALUES (${score.id}, ${matchId}, ${score.stage_id}, ${score.registration_id}, ${score.time}, ${score.procedural_count}, ${score.is_dnf}, ${score.raw_points}, ${score.penalty_points}, ${score.net_points}, ${score.hit_factor}, ${score.total_time}, ${JSON.stringify(score.score_data)}::jsonb)
        `;
      }

      for (const target of parsed.target_scores) {
        await tx`
          INSERT INTO target_scores (id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit)
          VALUES (${target.id}, ${target.stage_score_id}, ${target.target_index}, ${target.target_type}, ${target.alpha}, ${target.charlie}, ${target.delta}, ${target.miss}, ${target.no_shoot_hits}, ${target.steel_hit})
        `;
      }

      // ── Recalculate stage rankings (stage_percent, stage_points) ──
      for (const stage of parsed.stages) {
        const stageScores = await tx`
          SELECT ss.id, ss.time, ss.net_points, ss.registration_id, ss.is_dnf,
            COALESCE(mr.division, s.division) as division
          FROM stage_scores ss
          JOIN match_registrations mr ON mr.id = ss.registration_id
          JOIN shooters s ON s.id = mr.shooter_id
          WHERE ss.stage_id = ${stage.id}
        `;

        if (stageScores.length === 0) continue;

        const maxPoints = Number(stage.max_points) || (stage.paper_targets * stage.hits_per_paper * 5 + stage.steel_targets * 5);

        const divisionGroups = new Map<string, any[]>();
        for (const s of stageScores) {
          if (s.is_dnf) continue;
          const div = s.division || 'unknown';
          if (!divisionGroups.has(div)) divisionGroups.set(div, []);
          divisionGroups.get(div)!.push(s);
        }

        for (const [division, divScores] of divisionGroups) {
          let bestHF = 0;
          for (const s of divScores) {
            const hf = Number(s.time) > 0 ? Number(s.net_points) / Number(s.time) : 0;
            if (hf > bestHF) bestHF = hf;
          }

          for (const s of divScores) {
            const hf = Number(s.time) > 0 ? Number(s.net_points) / Number(s.time) : 0;
            const stagePercent = bestHF > 0 ? (hf / bestHF) * 100 : 0;
            const stagePoints = (stagePercent / 100) * maxPoints;

            await tx`
              UPDATE stage_scores SET
                stage_percent = ${Math.round(stagePercent * 10000) / 10000},
                stage_points = ${Math.round(stagePoints * 100) / 100}
              WHERE id = ${s.id}
            `;
          }
        }

        for (const s of stageScores) {
          if (s.is_dnf) {
            await tx`
              UPDATE stage_scores SET stage_percent = 0, stage_points = 0 WHERE id = ${s.id}
            `;
          }
        }
      }
    });

    await audit(c, 'match.import', `matches:${matchId}`, {
      source: 'practiscore',
      stages: parsed.stages.length,
      registrations: parsed.registrations.length,
      scores: parsed.stage_scores.length,
      warnings: parsed.warnings.length,
    });

    return c.json({
      success: true,
      match_id: matchId,
      synced_shooters: parsed.synced_shooters,
      warnings: parsed.warnings,
      counts: {
        stages: parsed.stages.length,
        registrations: parsed.registrations.length,
        scores: parsed.stage_scores.length,
        targets: parsed.target_scores.length,
      },
    });
  } catch (err: any) {
    console.error('[PSC Import] Error:', err);
    return c.json({ error: `PSC import failed: ${err.message}` }, 500);
  }
});
