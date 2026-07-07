import { Hono } from 'hono';
import JSZip from 'jszip';
import { sql } from '../db/client.js';
import { audit } from '../services/audit.js';
import { buildPscExport } from '../utils/pscMapper.js';

export const pscExportRoutes = new Hono();

/**
 * GET /api/matches/:id/export-psc
 * Export a match as a Practiscore .psc file (ZIP with match_def.json + match_scores.json).
 */
pscExportRoutes.get('/matches/:id/export-psc', async (c) => {
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

  const stageScores = await sql`
    SELECT id, match_id, stage_id, registration_id, time, extra_shot_count, extra_hit_count,
           stacking_count, overtime_shot_count, procedural_count, ftsa_count, is_dnf,
           raw_points, penalty_points, net_points, hit_factor, stage_percent, stage_points,
           total_time, x_count, score_data
    FROM stage_scores WHERE match_id = ${matchId}
  `;

  const stageScoreIds = stageScores.map((s: any) => s.id);

  let targetScores: any[] = [];
  if (stageScoreIds.length > 0) {
    targetScores = await sql`
      SELECT id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss,
             no_shoot_hits, steel_hit, target_data
      FROM target_scores WHERE stage_score_id = ANY(${stageScoreIds})
    `;
  }

  const { match_def, match_scores } = buildPscExport(
    match,
    stages,
    registrations.map((r: any) => ({
      ...r,
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
    })),
    stageScores,
    targetScores,
  );

  const fixJson = (json: string) => json
    .replace(/"match_pointsdownvalue":1(?=[,}])/, '"match_pointsdownvalue":1.0')
    .replace(/"str":\[(\d+)\]/g, '"str":[$1.0]');

  const zip = new JSZip();
  zip.file('match_def.json', fixJson(JSON.stringify(match_def)));
  zip.file('match_scores.json', fixJson(JSON.stringify(match_scores)));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  // Patch version-needed-to-extract from 1.0 to 2.0 in both local file headers and
  // central directory entries. Practiscore's iOS export sets 2.0 for DEFLATE; JSZip
  // sets 1.0 by default. Practiscore's parser may reject the lower version.
  const buf = Buffer.from(zipBuffer);
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      if (buf[i + 4] === 0x0a && buf[i + 5] === 0x00) {
        buf[i + 4] = 0x14;
      }
    } else if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      if (buf[i + 6] === 0x0a && buf[i + 7] === 0x00) {
        buf[i + 6] = 0x14;
      }
    }
  }

  const safeName = (match.name || 'match').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const date = new Date().toISOString().slice(0, 10);

  await audit(c, 'match.export', `matches:${matchId}`, {
    format: 'practiscore',
  });

  c.header('Content-Disposition', `attachment; filename="${safeName}-${date}.psc"`);
  c.header('Content-Type', 'application/zip');
  return c.newResponse(buf as any, 200, {
    'Content-Disposition': `attachment; filename="${safeName}-${date}.psc"`,
    'Content-Type': 'application/zip',
  });
});
