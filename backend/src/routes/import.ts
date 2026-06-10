import { Hono } from 'hono';
import { sql } from '../db/client.js';
import { parse } from 'csv-parse/sync';
import { isUnaccentAvailable } from '../utils/unaccent.js';

export const importRoutes = new Hono();

interface ColumnMapping {
  [csvColumn: string]: string; // maps CSV column name -> expected field key
}

function parseCSVOptions(body: any) {
  const hasHeader = body['hasHeader'] !== 'false'; // default true
  let columnMapping: ColumnMapping | null = null;
  if (body['columnMapping']) {
    try {
      columnMapping = typeof body['columnMapping'] === 'string'
        ? JSON.parse(body['columnMapping'])
        : body['columnMapping'];
    } catch { /* ignore invalid JSON */ }
  }
  return { hasHeader, columnMapping };
}

/**
 * Detect whether a CSV uses semicolons or commas as delimiter.
 * Checks the first few non-empty lines for semicolons vs commas.
 */
function detectDelimiter(text: string): string {
  const lines = text.split('\n').slice(0, 5).filter(l => l.trim());
  let semicolons = 0;
  let commas = 0;
  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
  }
  return semicolons > commas ? ';' : ',';
}

/**
 * Parse CSV with column mapping support.
 * If columnMapping is provided, renames CSV columns to expected field keys.
 * If hasHeader is false, assigns generic column names (col1, col2, ...).
 * Auto-detects semicolon vs comma delimiter.
 */
function parseCSV(text: string, hasHeader: boolean, columnMapping: ColumnMapping | null) {
  const delimiter = detectDelimiter(text);

  if (hasHeader) {
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, delimiter });
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      // Remap: columnMapping maps expectedField -> csvColumn
      // Create a new object with expected keys from mapped CSV columns
      return records.map((row: any) => {
        const mapped: any = {};
        for (const [expectedKey, csvColumn] of Object.entries(columnMapping)) {
          if (csvColumn && row[csvColumn] !== undefined) {
            mapped[expectedKey] = row[csvColumn];
          }
        }
        // Also keep unmapped columns as-is for backward compat
        for (const [key, value] of Object.entries(row)) {
          if (!(key in mapped) && !Object.values(columnMapping).includes(key)) {
            mapped[key] = value;
          }
        }
        return mapped;
      });
    }
    return records;
  } else {
    // No header — treat first row as data, assign column names from mapping or generic
    const records = parse(text, { skip_empty_lines: true, trim: true, delimiter });
    if (columnMapping && Object.keys(columnMapping).length > 0) {
      // columnMapping maps expectedField -> csvColumn, but without headers, csvColumn is the position-based key
      // Use the order of columnMapping values as the expected column order
      const expectedFields = Object.keys(columnMapping);
      return records.map((row: any[]) => {
        const mapped: any = {};
        expectedFields.forEach((field, idx) => {
          mapped[field] = row[idx] || '';
        });
        return mapped;
      });
    }
    // No mapping — assign generic names
    return records.map((row: any[]) => {
      const mapped: any = {};
      row.forEach((val: any, idx: number) => { mapped[`col${idx + 1}`] = val; });
      return mapped;
    });
  }
}

// Import shooters from CSV
importRoutes.post('/shooters', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file provided' }, 400);
  }

  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const first_name = row.first_name || row.firstName || row.FirstName || '';
    const last_name = row.last_name || row.lastName || row.LastName || '';
    const category = row.category || row.Category || 'regular';
    const tag = row.tag || row.Tag || null;
    const division = row.division || row.Division || 'standard';
    const power_factor = row.power_factor || row.powerFactor || row.PowerFactor || row.pf || 'minor';
    const region = row.region || row.Region || row.country || row.Country || '';
    const email = row.email || row.Email || null;

    if (!first_name || !last_name || !region) {
      errors.push(`Row ${i + 2}: missing required fields (first_name, last_name, region)`);
      continue;
    }

    // Check for duplicate by name + email (exclude soft-deleted shooters)
    const existing = await sql`
      SELECT id FROM shooters
      WHERE first_name = ${first_name} AND last_name = ${last_name}
      AND (email = ${email || null} OR (email IS NULL AND ${email || null} IS NULL))
      AND deleted_at IS NULL
    `;
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      await sql`
        INSERT INTO shooters (first_name, last_name, category, tag, division, power_factor, region, email)
        VALUES (${first_name}, ${last_name}, ${category}, ${tag || null}, ${division}, ${power_factor}, ${region}, ${email || null})
      `;
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  return c.json({ imported, skipped, errors });
});

// Import registrations from CSV
importRoutes.post('/matches/:matchId/registrations', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file provided' }, 400);
  }

  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const shooter_first_name = row.shooter_first_name || row.firstName || row.first_name || '';
    const shooter_last_name = row.shooter_last_name || row.lastName || row.last_name || '';
    const squad = row.squad || row.Squad || null;
    const division = row.division || row.Division || null;
    const category = row.category || row.Category || null;
    const power_factor = row.power_factor || row.powerFactor || row.PowerFactor || row.pf || null;

    if (!shooter_first_name || !shooter_last_name) {
      errors.push(`Row ${i + 2}: shooter name required`);
      continue;
    }

    // Find shooter by name (diacritic-insensitive if unaccent extension is available)
    const useUnaccent = await isUnaccentAvailable();
    const [shooter] = useUnaccent
      ? await sql`
          SELECT id FROM shooters
          WHERE unaccent(first_name) ILIKE unaccent(${shooter_first_name})
            AND unaccent(last_name) ILIKE unaccent(${shooter_last_name})
            AND deleted_at IS NULL
          LIMIT 1
        `
      : await sql`
          SELECT id FROM shooters
          WHERE first_name ILIKE ${shooter_first_name}
            AND last_name ILIKE ${shooter_last_name}
            AND deleted_at IS NULL
          LIMIT 1
        `;
    if (!shooter) {
      errors.push(`Row ${i + 2}: shooter "${shooter_first_name} ${shooter_last_name}" not found in database`);
      continue;
    }

    try {
      await sql`
        INSERT INTO match_registrations (match_id, shooter_id, squad, division, category, power_factor)
        VALUES (${matchId}, ${shooter.id}, ${squad ? parseInt(squad) : null},
                ${division || null}, ${category || null}, ${power_factor || null})
      `;
      imported++;
    } catch (err: any) {
      if (err.code === '23505') {
        skipped++;
      } else {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }
  }

  return c.json({ imported, skipped, errors });
});

// Import scores from CSV
importRoutes.post('/matches/:matchId/scores', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file provided' }, 400);
  }

  const { hasHeader, columnMapping } = parseCSVOptions(body);
  const text = await file.text();
  const records = parseCSV(text, hasHeader, columnMapping);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const shooter_first_name = row.shooter_first_name || row.firstName || row.first_name || '';
    const shooter_last_name = row.shooter_last_name || row.lastName || row.last_name || '';
    const stage_number = row.stage_number || row.stage || row.Stage || '';
    const time = row.time || row.Time || '';
    const alpha = row.alpha || row.A || row.Alpha || '0';
    const charlie = row.charlie || row.C || row.Charlie || '0';
    const delta = row.delta || row.D || row.Delta || '0';
    const miss = row.miss || row.M || row.Miss || '0';
    const no_shoot_hits = row.no_shoot_hits || row.ns || row.NS || row.no_shoot || '0';
    const steel_hits = row.steel_hits || row.steel || row.Steel || '0';
    const procedural = row.procedural || row.proc || row.Procedural || '0';
    const ftsa = row.ftsa || row.FTSA || '0';

    if (!shooter_first_name || !shooter_last_name || !stage_number) {
      errors.push(`Row ${i + 2}: shooter name and stage_number required`);
      continue;
    }

    // Find registration (diacritic-insensitive if unaccent extension is available)
    const useUnaccent = await isUnaccentAvailable();
    const [reg] = useUnaccent
      ? await sql`
          SELECT mr.id FROM match_registrations mr
          JOIN shooters s ON s.id = mr.shooter_id
          WHERE mr.match_id = ${matchId}
          AND unaccent(s.first_name) ILIKE unaccent(${shooter_first_name})
          AND unaccent(s.last_name) ILIKE unaccent(${shooter_last_name})
          LIMIT 1
        `
      : await sql`
          SELECT mr.id FROM match_registrations mr
          JOIN shooters s ON s.id = mr.shooter_id
          WHERE mr.match_id = ${matchId}
          AND s.first_name ILIKE ${shooter_first_name}
          AND s.last_name ILIKE ${shooter_last_name}
          LIMIT 1
        `;
    if (!reg) {
      errors.push(`Row ${i + 2}: shooter not registered for this match`);
      skipped++;
      continue;
    }

    // Find stage
    const [stage] = await sql`
      SELECT id, scoring_type FROM stages
      WHERE match_id = ${matchId} AND stage_number = ${parseInt(stage_number)}
    `;
    if (!stage) {
      errors.push(`Row ${i + 2}: stage ${stage_number} not found`);
      skipped++;
      continue;
    }

    // Build target scores
    const alphaVal = parseInt(alpha) || 0;
    const charlieVal = parseInt(charlie) || 0;
    const deltaVal = parseInt(delta) || 0;
    const missVal = parseInt(miss) || 0;
    const nsHits = parseInt(no_shoot_hits) || 0;
    const steelHits = parseInt(steel_hits) || 0;

    // Submit score via scoring route logic (simplified for CSV import)
    const { calculateScore } = await import('../utils/scoringCalc.js');

    // Get PF
    const [pfRow] = await sql`
      SELECT COALESCE(mr.power_factor, s.power_factor) as pf
      FROM match_registrations mr
      JOIN shooters s ON s.id = mr.shooter_id
      WHERE mr.id = ${reg.id}
    `;
    const pf = pfRow?.pf || 'minor';

    // Build targets — simplified: one aggregate paper target + one steel target
    const targets: Array<{
      target_type: 'paper' | 'steel' | 'no_shoot';
      alpha: number; charlie: number; delta: number;
      miss: number; no_shoot_hits: number;
      steel_hit: boolean | null; hits_per_paper: number;
    }> = [];
    if (alphaVal + charlieVal + deltaVal + missVal > 0) {
      targets.push({
        target_type: 'paper',
        alpha: alphaVal, charlie: charlieVal, delta: deltaVal,
        miss: missVal, no_shoot_hits: nsHits, steel_hit: null,
        hits_per_paper: 2,
      });
    }
    if (steelHits > 0) {
      targets.push({
        target_type: 'steel',
        alpha: 0, charlie: 0, delta: 0,
        miss: 0, no_shoot_hits: 0, steel_hit: true,
        hits_per_paper: 1,
      });
    }

    const calcResult = calculateScore({
      targets,
      time: parseFloat(time) || null,
      procedural_count: parseInt(procedural) || 0,
      ftsa_count: parseInt(ftsa) || 0,
      extra_shot_count: 0, extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0,
      scoring_type: stage.scoring_type as any,
      power_factor: pf as any,
    });

    try {
      await sql`
        INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
          raw_points, penalty_points, net_points, hit_factor)
        VALUES (${matchId}, ${stage.id}, ${reg.id}, ${parseFloat(time) || null},
          ${calcResult.raw_points}, ${calcResult.penalty_points}, ${calcResult.net_points}, ${calcResult.hit_factor})
        ON CONFLICT (stage_id, registration_id) DO UPDATE SET
          time = ${parseFloat(time) || null},
          raw_points = ${calcResult.raw_points},
          penalty_points = ${calcResult.penalty_points},
          net_points = ${calcResult.net_points},
          hit_factor = ${calcResult.hit_factor},
          updated_at = NOW()
      `;
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  return c.json({ imported, skipped, errors });
});