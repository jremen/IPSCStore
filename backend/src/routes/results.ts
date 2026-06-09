import { Hono } from 'hono';
import { sql } from '../db/client.js';

export const resultsRoutes = new Hono();

/** Format an ISO date string or Date object to a human-readable date */
function formatDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Human-readable labels for divisions and categories
const DIVISION_LABELS: Record<string, string> = {
  standard: 'Standard', open: 'Open', production: 'Production',
  production_optics: 'Production Optics', optics: 'Optics', classic: 'Classic', revolver: 'Revolver',
  pcc_optics: 'PCC Optics', pcc_iron: 'PCC Iron',
  limited: 'Limited', limited_optics: 'Limited Optics', carry_optics: 'Carry Optics', single_stack: 'Single Stack',
  ssp: 'SSP', esp: 'ESP', cdp: 'CDP', ccp: 'CCP', bug: 'BUG', revolver_idpa: 'Revolver',
  tactical: 'Tactical', open_3gun: 'Open', heavy: 'Heavy',
  open_prs: 'Open', production_prs: 'Production',
  any: 'Any', irons: 'Irons', open_22: 'Open',
  conventional: 'Conventional', international: 'International',
};

const CATEGORY_LABELS: Record<string, string> = {
  regular: 'Regular', junior: 'Junior', senior: 'Senior',
  super_senior: 'Super Senior', lady: 'Lady',
};

function divisionLabel(value: string): string {
  return DIVISION_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Overall results (cross-division)
resultsRoutes.get('/matches/:matchId/results/overall', async (c) => {
  const matchId = c.req.param('matchId');

  // Non-DQ results
  const results = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = FALSE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.is_dq
    ORDER BY match_points DESC
  `;

  const highestPoints = results.length > 0 ? Number(results[0].match_points) : 0;

  const ranked = results.map((r: any, i: number) => ({
    ...r,
    position: i + 1,
    match_points: Number(r.match_points),
    match_percent: highestPoints > 0 ? Math.round((Number(r.match_points) / highestPoints) * 10000) / 100 : 0,
  }));

  // DQ shooters — preserve their original scores but show separately
  const dq = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      mr.dq_reason,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.is_dq, mr.dq_reason
    ORDER BY s.last_name, s.first_name
  `;

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

  // Non-DQ results grouped by division
  const results = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = FALSE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.is_dq
    ORDER BY division, match_points DESC
  `;

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
      registration_id: r.registration_id,
      first_name: r.first_name,
      last_name: r.last_name,
      division: r.division,
      category: r.category,
      power_factor: r.power_factor,
      tag: r.tag,
      is_dq: r.is_dq,
      position: i + 1,
      match_points: Number(r.match_points),
      match_percent: highestPoints > 0 ? Math.round((Number(r.match_points) / highestPoints) * 10000) / 100 : 0,
    }));
  }

  // DQ shooters
  const dq = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      mr.dq_reason,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.is_dq, mr.dq_reason
    ORDER BY s.last_name, s.first_name
  `;

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
    // Non-DQ scores
    const scores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = FALSE
      ORDER BY division, ss.stage_points DESC
    `;

    // Group by division, assign per-division positions
    const divisionGroups: Record<string, any[]> = {};
    for (const s of scores) {
      const div = s.division || 'unknown';
      if (!divisionGroups[div]) divisionGroups[div] = [];
      divisionGroups[div].push(s);
    }

    // Build scores array with per-division positions
    const groupedScores: any[] = [];
    for (const [division, divScores] of Object.entries(divisionGroups)) {
      divScores.forEach((s: any, i: number) => {
        groupedScores.push({
          registration_id: s.registration_id,
          first_name: s.first_name,
          last_name: s.last_name,
          division: s.division,
          hit_factor: Number(s.hit_factor),
          net_points: Number(s.net_points),
          stage_percent: Number(s.stage_percent),
          stage_points: Number(s.stage_points),
          position: i + 1,
          division_position: i + 1,
        });
      });
    }

    // Sort overall by stage_points DESC for backward compat
    groupedScores.sort((a, b) => b.stage_points - a.stage_points);
    // Reassign overall position
    groupedScores.forEach((s, i) => { s.position = i + 1; });

    // DQ scores for this stage — preserve original hit data
    const dqScores = await sql`
      SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.time,
             s.first_name, s.last_name,
             COALESCE(mr.division, s.division) as division,
             mr.is_dq, mr.dq_reason
      FROM stage_scores ss
      JOIN match_registrations mr ON mr.id = ss.registration_id
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE ss.stage_id = ${stage.id} AND mr.is_dq = TRUE
      ORDER BY s.last_name, s.first_name
    `;

    stageResults.push({
      stage_id: stage.id,
      stage_number: stage.stage_number,
      stage_name: stage.name,
      scores: groupedScores,
      dq_scores: dqScores.map((s: any) => ({
        registration_id: s.registration_id,
        first_name: s.first_name,
        last_name: s.last_name,
        division: s.division,
        hit_factor: Number(s.hit_factor),
        net_points: Number(s.net_points),
        time: Number(s.time),
        dq_reason: s.dq_reason,
      })),
      divisions: Object.fromEntries(
        Object.entries(divisionGroups).map(([div, divScores]) => [
          div,
          divScores.map((s: any, i: number) => ({
            registration_id: s.registration_id,
            first_name: s.first_name,
            last_name: s.last_name,
            division: s.division,
            hit_factor: Number(s.hit_factor),
            net_points: Number(s.net_points),
            stage_percent: Number(s.stage_percent),
            stage_points: Number(s.stage_points),
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
    SELECT ss.registration_id, ss.hit_factor, ss.net_points, ss.stage_percent, ss.stage_points,
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

  // DQ scores
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
    const results = await sql`
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(SUM(ss.stage_points), 0) as match_points
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
      WHERE mr.match_id = ${matchId} AND COALESCE(mr.category, s.category) = ${cat} AND mr.is_dq = FALSE
      GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor
      ORDER BY division, match_points DESC
    `;

    if (results.length > 0) {
      // Group by division and rank within each division
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

  // DQ shooters (all categories combined)
  const dq = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      mr.dq_reason,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.is_dq, mr.dq_reason
    ORDER BY s.last_name, s.first_name
  `;

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
    const results = await sql`
      SELECT
        mr.id as registration_id,
        s.first_name, s.last_name,
        COALESCE(mr.division, s.division) as division,
        COALESCE(mr.power_factor, s.power_factor) as power_factor,
        COALESCE(SUM(ss.stage_points), 0) as match_points
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
      WHERE mr.match_id = ${matchId} AND s.tag = ${tag} AND mr.is_dq = FALSE
      GROUP BY mr.id, s.id, mr.division, mr.power_factor
      ORDER BY division, match_points DESC
    `;

    if (results.length > 0) {
      // Group by division and rank within each division
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

  // DQ shooters (all tags combined)
  const dq = await sql`
    SELECT
      mr.id as registration_id,
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      s.tag,
      mr.is_dq,
      mr.dq_reason,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    GROUP BY mr.id, s.id, mr.division, mr.power_factor, mr.is_dq, mr.dq_reason
    ORDER BY s.last_name, s.first_name
  `;

  const dqRanked = dq.map((r: any) => ({
    ...r,
    match_points: Number(r.match_points),
    match_percent: 0,
  }));

  return c.json({ ...tagResults, dq: dqRanked });
});

// Export CSV — per-division sections
resultsRoutes.get('/matches/:matchId/results/export/csv', async (c) => {
  const matchId = c.req.param('matchId');
  const [match] = await sql`SELECT name, date, organization FROM matches WHERE id = ${matchId}`;
  if (!match) return c.json({ error: 'Match not found' }, 404);

  // Non-DQ results grouped by division
  const results = await sql`
    SELECT
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = FALSE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor
    ORDER BY division, match_points DESC
  `;

  const divisionGroups: Record<string, any[]> = {};
  for (const r of results) {
    const div = r.division || 'unknown';
    if (!divisionGroups[div]) divisionGroups[div] = [];
    divisionGroups[div].push(r);
  }

  // DQ shooters
  const dq = await sql`
    SELECT
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(mr.power_factor, s.power_factor) as power_factor,
      mr.dq_reason,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    GROUP BY mr.id, s.id, mr.division, mr.category, mr.power_factor, mr.dq_reason
    ORDER BY s.last_name, s.first_name
  `;

  // Build CSV (semicolon-delimited for European locale compatibility)
  let csv = '﻿'; // BOM for Excel
  csv += `Match: ${match.name} (${match.organization})\nDate: ${formatDate(match.date)}\n\n`;

  for (const [division, shooters] of Object.entries(divisionGroups)) {
    csv += `--- ${divisionLabel(division)} ---\n`;
    csv += 'Position;First Name;Last Name;Division;Category;Power Factor;Match Points\n';
    shooters.forEach((r: any, i: number) => {
      csv += `${i + 1};${r.first_name};${r.last_name};${divisionLabel(r.division)};${categoryLabel(r.category)};${r.power_factor};${Number(r.match_points).toFixed(2)}\n`;
    });
    csv += '\n';
  }

  // DQ section
  if (dq.length > 0) {
    csv += '--- Disqualified ---\n';
    csv += 'First Name;Last Name;Division;Category;Power Factor;DQ Reason\n';
    dq.forEach((r: any) => {
      csv += `${r.first_name};${r.last_name};${divisionLabel(r.division)};${categoryLabel(r.category)};${r.power_factor};${r.dq_reason || 'DQ'}\n`;
    });
  }

  return c.text(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${match.name.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv"`,
  });
});

// Export HTML — per-division sections with page breaks
resultsRoutes.get('/matches/:matchId/results/export/html', async (c) => {
  const matchId = c.req.param('matchId');
  const [match] = await sql`SELECT name, date, organization FROM matches WHERE id = ${matchId}`;
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const results = await sql`
    SELECT
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      COALESCE(SUM(ss.stage_points), 0) as match_points
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    LEFT JOIN stage_scores ss ON ss.registration_id = mr.id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = FALSE
    GROUP BY mr.id, s.id, mr.division, mr.category
    ORDER BY division, match_points DESC
  `;

  const divisionGroups: Record<string, any[]> = {};
  for (const r of results) {
    const div = r.division || 'unknown';
    if (!divisionGroups[div]) divisionGroups[div] = [];
    divisionGroups[div].push(r);
  }

  // DQ shooters
  const dq = await sql`
    SELECT
      s.first_name, s.last_name,
      COALESCE(mr.division, s.division) as division,
      COALESCE(mr.category, s.category) as category,
      mr.dq_reason
    FROM match_registrations mr
    JOIN shooters s ON s.id = mr.shooter_id
    WHERE mr.match_id = ${matchId} AND mr.is_dq = TRUE
    ORDER BY s.last_name, s.first_name
  `;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${match.name} Results</title>
    <style>
      body{font-family:Arial,sans-serif;margin:20px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}
      th{background:#f4f4f4}
      tr:nth-child(even){background:#f9f9f9}
      .division-section{page-break-after:always}
      .division-section:last-child{page-break-after:auto}
      .dq-section{background:#fff0f0}
      .dq-section th{background:#ffcccc}
    </style>
    </head><body><h1>${match.name} (${match.organization})</h1><p>Date: ${formatDate(match.date)}</p>`;

  for (const [division, shooters] of Object.entries(divisionGroups)) {
    html += `<div class="division-section"><h2>${divisionLabel(division)}</h2>
      <table><tr><th>Pos</th><th>Name</th><th>Category</th><th>Match Points</th></tr>`;
    shooters.forEach((r: any, i: number) => {
      html += `<tr><td>${i + 1}</td><td>${r.first_name} ${r.last_name}</td><td>${categoryLabel(r.category)}</td><td>${Number(r.match_points).toFixed(2)}</td></tr>`;
    });
    html += '</table></div>';
  }

  // DQ section
  if (dq.length > 0) {
    html += `<div class="dq-section division-section"><h2>Disqualified</h2>
      <table><tr><th>Name</th><th>Division</th><th>Category</th><th>DQ Reason</th></tr>`;
    dq.forEach((r: any) => {
      html += `<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division)}</td><td>${categoryLabel(r.category)}</td><td>${r.dq_reason || 'DQ'}</td></tr>`;
    });
    html += '</table></div>';
  }

  html += '</body></html>';

  return c.html(html);
});