import { Hono } from 'hono';
import MDBReader from 'mdb-reader';
import { sql } from '../db/client.js';
import {
  findTable, findColumn, mapDivision, mapCategory, mapPowerFactor, mapFirearmType,
  mapRegion, inferScoringType, inferHitsPerPaper, extractTag, dumpRow,
  buildDivisionLookup, buildCategoryLookup, buildPowerFactorLookup,
  buildTagLookup, buildRegionLookup,
} from '../utils/winmssMapper.js';
import { calculateAggregatedScore } from '../utils/scoringCalc.js';

export const winmssImportRoutes = new Hono();

interface StageResult {
  id: string;
  name: string;
  stage_number: number;
  updated?: boolean;
}

interface ImportResult {
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: StageResult[];
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; errors: string[] };
  warnings: string[];
}

/**
 * GET /api/import/winmss/inspect
 * Upload a .mdb file and inspect its tables/columns without importing.
 */
winmssImportRoutes.post('/winmss/inspect', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No .mdb file provided' }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const reader = new MDBReader(buffer);
    const tableNames = reader.getTableNames();

    const result: Record<string, any> = { tables: {} };

    for (const tableName of tableNames) {
      try {
        const table = reader.getTable(tableName);
        const columns = table.getColumnNames();
        const data = table.getData() as Record<string, any>[];
        result.tables[tableName] = {
          columns,
          rowCount: data.length,
          sampleRows: data.slice(0, 3),
        };
      } catch (err: any) {
        result.tables[tableName] = { error: err.message };
      }
    }

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: `Inspect failed: ${err.message}` }, 500);
  }
});

/**
 * POST /api/import/winmss
 * Import matches from a WinMSS .mdb file.
 *
 * Architecture: shooters are processed ONCE globally (not per-match),
 * then matches/stages/registrations/scores are processed per-match.
 */
winmssImportRoutes.post('/winmss', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No .mdb file provided' }, 400);
  }

  if (!file.name.endsWith('.mdb') && !file.name.endsWith('.accdb')) {
    return c.json({ error: 'File must be a .mdb or .accdb file' }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const reader = new MDBReader(buffer);

    const tableNames = reader.getTableNames();
    console.log('[WinMSS Import] Discovered tables:', tableNames.join(', '));

    const result: ImportResult = {
      matches: [],
      stages: [],
      shooters: { created: 0, skipped: 0, errors: [] },
      registrations: { created: 0, skipped: 0 },
      scores: { created: 0, errors: [] },
      warnings: [],
    };

    // ── 1. Discover tables ───────────────────────────────────────────
    const matchTableName = findTable(tableNames, 'match');
    const stageTableName = findTable(tableNames, 'stage');
    const memberTableName = findTable(tableNames, 'member');
    const competitorTableName = findTable(tableNames, 'competitor');
    const scoreTableName = findTable(tableNames, 'score');
    const divisionTableName = findTable(tableNames, 'division');
    const categoryTableName = findTable(tableNames, 'category');
    const powerFactorTableName = findTable(tableNames, 'powerFactor');
    const tagTableName = findTable(tableNames, 'tag');
    const regionTableName = findTable(tableNames, 'region');

    if (!matchTableName) {
      return c.json({ error: 'Could not find match table in .mdb file. Tables found: ' + tableNames.join(', ') }, 400);
    }

    // ── 2. Build lookup maps from type tables ──────────────────────────
    let divisionLookup = new Map<number, string>();
    let categoryLookup = new Map<number, string>();
    let powerFactorLookup = new Map<number, string>();

    if (divisionTableName) {
      try {
        const divRows = reader.getTable(divisionTableName).getData() as Record<string, any>[];
        divisionLookup = buildDivisionLookup(divRows);
        console.log('[WinMSS Import] Division lookup:', Object.fromEntries(divisionLookup));
      } catch { /* ignore */ }
    }
    if (categoryTableName) {
      try {
        const catRows = reader.getTable(categoryTableName).getData() as Record<string, any>[];
        categoryLookup = buildCategoryLookup(catRows);
        console.log('[WinMSS Import] Category lookup:', Object.fromEntries(categoryLookup));
      } catch { /* ignore */ }
    }
    if (powerFactorTableName) {
      try {
        const pfRows = reader.getTable(powerFactorTableName).getData() as Record<string, any>[];
        powerFactorLookup = buildPowerFactorLookup(pfRows);
        console.log('[WinMSS Import] Power factor lookup:', Object.fromEntries(powerFactorLookup));
      } catch { /* ignore */ }
    }

    let tagLookup = new Map<number, string>();
    let regionLookup = new Map<number, string>();

    if (tagTableName) {
      try {
        const tagRows = reader.getTable(tagTableName).getData() as Record<string, any>[];
        tagLookup = buildTagLookup(tagRows);
        console.log('[WinMSS Import] Tag lookup:', Object.fromEntries(tagLookup));
      } catch { /* ignore */ }
    }
    if (regionTableName) {
      try {
        const regionRows = reader.getTable(regionTableName).getData() as Record<string, any>[];
        regionLookup = buildRegionLookup(regionRows);
        console.log('[WinMSS Import] Region lookup:', Object.fromEntries(regionLookup));
      } catch { /* ignore */ }
    }

    // ── 3. Log column names for debugging ─────────────────────────────
    if (memberTableName) {
      const memberTable = reader.getTable(memberTableName);
      console.log('[WinMSS Import] Member columns:', memberTable.getColumnNames().join(', '));
    }
    if (competitorTableName) {
      const compTable = reader.getTable(competitorTableName);
      console.log('[WinMSS Import] Competitor columns:', compTable.getColumnNames().join(', '));
    }
    if (stageTableName) {
      const stageTable = reader.getTable(stageTableName);
      console.log('[WinMSS Import] Stage columns:', stageTable.getColumnNames().join(', '));
    }
    if (scoreTableName) {
      const scoreTable = reader.getTable(scoreTableName);
      console.log('[WinMSS Import] Score columns:', scoreTable.getColumnNames().join(', '));
      const sampleData = scoreTable.getData() as Record<string, any>[];
      if (sampleData.length > 0) {
        console.log('[WinMSS Import] Score sample row keys:', Object.keys(sampleData[0]).join(', '));
        console.log('[WinMSS Import] Score sample row (first):', JSON.stringify(sampleData[0]));
      }
    }

    // ── 4. Import Shooters ONCE (global, not per-match) ────────────────
    // Shooters are global in WinMSS (tblMember is shared across all matches).
    // Process them once and build a memberIdMap used by all matches.
    const memberIdMap = new Map<number | string, string>(); // WinMSS MemberId → IPSCScore shooter.id

    if (memberTableName) {
      const memberTable = reader.getTable(memberTableName);
      const memberRows = memberTable.getData() as Record<string, any>[];
      console.log(`[WinMSS Import] Processing ${memberRows.length} member rows globally`);

      if (memberRows.length > 0) {
        console.log('[WinMSS Import] First member row:', JSON.stringify(memberRows[0]));
      }

      for (let i = 0; i < memberRows.length; i++) {
        const memberRow = memberRows[i];
        try {
          const wmsMemberId = findColumn(memberRow, 'memberId');
          const memberIdNum = wmsMemberId !== undefined ? Number(wmsMemberId) : i + 1;
          const firstName = (findColumn(memberRow, 'firstName')?.toString() || '').trim();
          const lastName = (findColumn(memberRow, 'lastName')?.toString() || '').trim();

          if (!firstName && !lastName) {
            result.shooters.skipped++;
            result.shooters.errors.push(`Member row ${i + 1} (MemberId=${memberIdNum}): both names empty`);
            continue;
          }

          if (!firstName || !lastName) {
            result.shooters.skipped++;
            result.shooters.errors.push(`Member row ${i + 1} (MemberId=${memberIdNum}): missing name (first="${firstName}", last="${lastName}")`);
            continue;
          }

          // Resolve tag from DfltTagId lookup (explicit IPSC tag table)
          let tag: string | null = null;
          const dfltTagId = findColumn(memberRow, 'memberDfltTagId');
          if (dfltTagId !== undefined && tagLookup.size > 0) {
            const tagId = Number(dfltTagId);
            if (tagLookup.has(tagId)) {
              tag = tagLookup.get(tagId)!;
            }
          }

          // Look up by WinMSS MemberId ONLY — this is the unique key
          const existing = await sql`
            SELECT id FROM shooters WHERE winmss_member_id = ${memberIdNum} LIMIT 1
          `;

          if (existing.length > 0) {
            memberIdMap.set(memberIdNum, existing[0].id);
            // Update tag/region if available
            const regionRaw = findColumn(memberRow, 'region');
            const region = mapRegion(regionRaw, regionLookup);
            if (tag || region) {
              await sql`
                UPDATE shooters
                SET tag = COALESCE(${tag || null}, tag),
                    region = CASE WHEN region = '' OR region IS NULL THEN ${region} ELSE region END,
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
              `;
            }
            result.shooters.skipped++;
          } else {
            const division = mapDivision(findColumn(memberRow, 'shooterDivision'), divisionLookup);
            const category = mapCategory(findColumn(memberRow, 'shooterCategory'), categoryLookup);
            const regionRaw = findColumn(memberRow, 'region');
            const region = mapRegion(regionRaw, regionLookup);
            const email = findColumn(memberRow, 'shooterEmail')?.toString() || null;
            const pfRaw = findColumn(memberRow, 'shooterPowerFactor');
            const shooterPf = mapPowerFactor(pfRaw, powerFactorLookup);

            const [shooter] = await sql`
              INSERT INTO shooters (first_name, last_name, category, division, power_factor, region, email, tag, winmss_member_id)
              VALUES (${firstName}, ${lastName}, ${category}, ${division}, ${shooterPf}, ${region}, ${email}, ${tag || null}, ${memberIdNum})
              RETURNING id
            `;
            memberIdMap.set(memberIdNum, shooter.id);
            result.shooters.created++;
          }
        } catch (err: any) {
          result.shooters.errors.push(`Member row ${i + 1}: ${err.message}`);
          console.error(`[WinMSS Import] Error importing member row ${i + 1}:`, err.message);
        }
      }

      console.log(`[WinMSS Import] Shooters: ${result.shooters.created} created, ${result.shooters.skipped} skipped, ${result.shooters.errors.length} errors`);
    } else {
      result.warnings.push('No member/shooter table found in .mdb file');
    }

    // ── 5. Import ALL matches ──────────────────────────────────────────
    const matchTable = reader.getTable(matchTableName);
    const matchRows = matchTable.getData() as Record<string, any>[];

    if (matchRows.length === 0) {
      return c.json({ error: 'No match records found in .mdb file' }, 400);
    }

    console.log('[WinMSS Import] Match columns:', matchTable.getColumnNames().join(', '));
    console.log('[WinMSS Import] Found', matchRows.length, 'match(es)');
    console.log('[WinMSS Import] First match row:', JSON.stringify(matchRows[0]));

    // Pre-load all competitor and score data once (they're global tables in WinMSS)
    let allCompetitorRows: Record<string, any>[] = [];
    if (competitorTableName) {
      const competitorTable = reader.getTable(competitorTableName);
      allCompetitorRows = competitorTable.getData() as Record<string, any>[];
      if (allCompetitorRows.length > 0) {
        console.log('[WinMSS Import] First competitor row:', JSON.stringify(allCompetitorRows[0]));
      }
    }

    let allScoreRows: Record<string, any>[] = [];
    if (scoreTableName) {
      const scoreTable = reader.getTable(scoreTableName);
      allScoreRows = scoreTable.getData() as Record<string, any>[];
      if (allScoreRows.length > 0) {
        console.log('[WinMSS Import] Score sample row keys:', Object.keys(allScoreRows[0]).join(', '));
        console.log('[WinMSS Import] Score sample row (first):', JSON.stringify(allScoreRows[0]));
      }
    }

    // Process each match
    for (const matchRow of matchRows) {
      const matchName = findColumn(matchRow, 'matchName')?.toString() || file.name.replace(/\.mdb$/i, '');
      const matchDateRaw = findColumn(matchRow, 'matchDate');
      let matchDate: Date;
      if (matchDateRaw instanceof Date) {
        matchDate = matchDateRaw;
      } else if (matchDateRaw) {
        matchDate = new Date(String(matchDateRaw));
      } else {
        matchDate = new Date();
      }
      // Handle invalid dates gracefully
      if (isNaN(matchDate.getTime())) {
        console.warn('[WinMSS Import] Invalid match date for match:', matchName, 'raw:', matchDateRaw);
        matchDate = new Date();
        result.warnings.push(`Match "${matchName}" has invalid date, using current date`);
      }
      const matchDateStr = matchDate.toISOString().split('T')[0];
      const firearmType = mapFirearmType(findColumn(matchRow, 'matchFirearmType'));

      // Check if match already exists (by name + date)
      const existingMatch = await sql`
        SELECT id FROM matches WHERE name = ${matchName} AND date = ${matchDateStr}
      `;

      let matchId: string;
      if (existingMatch.length > 0) {
        matchId = existingMatch[0].id;
        result.warnings.push(`Match "${matchName}" already exists, updating with new data`);
        result.matches.push({ id: matchId, name: matchName, date: matchDateStr, imported: true, updated: true });
      } else {
        const [match] = await sql`
          INSERT INTO matches (name, date, organization, firearm_type)
          VALUES (${matchName}, ${matchDateStr}, 'IPSC', ${firearmType})
          RETURNING id, name, date
        `;
        matchId = match.id;
        result.matches.push({ id: match.id, name: match.name, date: matchDateStr, imported: true });
      }

      // ── 6. Import Stages for this match ──────────────────────────────
      if (!stageTableName) {
        result.warnings.push('No stage table found in .mdb file');
      } else {
        const stageTable = reader.getTable(stageTableName);
        const allStageRows = stageTable.getData() as Record<string, any>[];

        if (allStageRows.length > 0) {
          console.log('[WinMSS Import] First stage row:', JSON.stringify(allStageRows[0]));
        }

        // Filter stages belonging to this match
        let stageRows = allStageRows;
        if (matchRows.length > 1) {
          const currentMatchId = findColumn(matchRow, 'matchId');
          if (currentMatchId !== undefined) {
            const filtered = allStageRows.filter(r => {
              const sid = findColumn(r, 'stageMatchId') ?? findColumn(r, 'matchId');
              return sid == currentMatchId;
            });
            if (filtered.length > 0) stageRows = filtered;
          }
        }

        for (const stageRow of stageRows) {
          const stageNum = findColumn(stageRow, 'stageId') ?? stageRows.indexOf(stageRow) + 1;
          const stageName = findColumn(stageRow, 'stageName')?.toString() || `Stage ${stageNum}`;
          const paperTargets = Number(findColumn(stageRow, 'stagePaperTargets')) || 0;
          const popperTargets = Number(findColumn(stageRow, 'stageSteelTargets')) || 0;
          const plateTargets = Number(findColumn(stageRow, 'stagePlateTargets')) || 0;
          const steelTargets = popperTargets + plateTargets;
          const noShootTargets = Number(findColumn(stageRow, 'stageNoShootTargets')) || 0;
          const minRounds = Number(findColumn(stageRow, 'stageMinRounds')) || (paperTargets * 2 + steelTargets);
          const scoringTypeId = findColumn(stageRow, 'stageScoringType');
          const scoringType = inferScoringType({ paperTargets, steelTargets, minRounds, scoringTypeId });
          const hpp = inferHitsPerPaper();
          const maxPoints = paperTargets * hpp * 5 + steelTargets * 5;

          try {
            const existingStage = await sql`
              SELECT id FROM stages WHERE match_id = ${matchId} AND stage_number = ${Number(stageNum)}
            `;

            if (existingStage.length > 0) {
              await sql`
                UPDATE stages SET
                  name = ${stageName},
                  scoring_type = ${scoringType},
                  paper_targets = ${paperTargets},
                  steel_targets = ${steelTargets},
                  no_shoot_targets = ${noShootTargets},
                  hits_per_paper = ${hpp},
                  min_rounds = ${minRounds},
                  max_points = ${maxPoints}
                WHERE id = ${existingStage[0].id}
              `;
              result.stages.push({ id: existingStage[0].id, name: stageName, stage_number: Number(stageNum), updated: true });
            } else {
              const [stage] = await sql`
                INSERT INTO stages (match_id, stage_number, name, scoring_type, paper_targets, steel_targets,
                  no_shoot_targets, hits_per_paper, min_rounds, max_points)
                VALUES (${matchId}, ${Number(stageNum)}, ${stageName}, ${scoringType}, ${paperTargets},
                  ${steelTargets}, ${noShootTargets}, ${hpp}, ${minRounds}, ${maxPoints})
                RETURNING id, name, stage_number
              `;
              result.stages.push({ id: stage.id, name: stage.name, stage_number: stage.stage_number });
            }
          } catch (err: any) {
            result.warnings.push(`Failed to import stage ${stageNum} "${stageName}": ${err.message}`);
          }
        }
      }

      // ── 7. Import Registrations for this match ────────────────────────
      if (!competitorTableName) {
        result.warnings.push('No competitor/registration table found in .mdb file');
      } else {
        // Map: memberId → registrationId (per match)
        const competitorIdMap = new Map<string, string>();

        // Filter competitors for this match
        let competitorRows = allCompetitorRows;
        if (matchRows.length > 1) {
          const currentMatchId = findColumn(matchRow, 'matchId');
          if (currentMatchId !== undefined) {
            const filtered = allCompetitorRows.filter(r => {
              const cid = findColumn(r, 'competitorMatchId') ?? findColumn(r, 'matchId');
              return cid == currentMatchId;
            });
            if (filtered.length > 0) competitorRows = filtered;
          }
        }

        for (const compRow of competitorRows) {
          try {
            const wmsMemberIdRaw = findColumn(compRow, 'competitorMemberId') ?? findColumn(compRow, 'memberId');
            const wmsMemberId = wmsMemberIdRaw !== undefined ? Number(wmsMemberIdRaw) : 0;
            const shooterId = memberIdMap.get(wmsMemberId);
            if (!shooterId) {
              result.warnings.push(`Competitor member ID ${wmsMemberId} not found in member table, skipping`);
              continue;
            }

            const divisionOverride = findColumn(compRow, 'competitorDivision') ?? findColumn(compRow, 'shooterDivision') ?? findColumn(compRow, 'division');
            const categoryOverride = findColumn(compRow, 'competitorCategory') ?? findColumn(compRow, 'shooterCategory') ?? findColumn(compRow, 'category');
            const pfOverride = findColumn(compRow, 'competitorPowerFactor') ?? findColumn(compRow, 'shooterPowerFactor') ?? findColumn(compRow, 'powerFactor');

            const division = divisionOverride ? mapDivision(divisionOverride, divisionLookup) : null;
            const category = categoryOverride ? mapCategory(categoryOverride, categoryLookup) : null;
            const powerFactor = pfOverride ? mapPowerFactor(pfOverride, powerFactorLookup) : null;
            const isDq = Boolean(findColumn(compRow, 'competitorDq'));
            const squad = findColumn(compRow, 'competitorSquad') ? Number(findColumn(compRow, 'competitorSquad')) : null;

            const existingReg = await sql`
              SELECT id FROM match_registrations
              WHERE match_id = ${matchId} AND shooter_id = ${shooterId}
            `;

            if (existingReg.length > 0) {
              const regId = existingReg[0].id;
              competitorIdMap.set(`${wmsMemberId}`, regId);
              result.registrations.skipped++;
              if (division || category || powerFactor || isDq) {
                await sql`
                  UPDATE match_registrations SET
                    division = COALESCE(${division}, division),
                    category = COALESCE(${category}, category),
                    power_factor = COALESCE(${powerFactor}, power_factor),
                    is_dq = ${isDq},
                    dq_reason = ${isDq ? 'DQ (imported from WinMSS)' : null}
                  WHERE id = ${regId}
                `;
              }
            } else {
              const [reg] = await sql`
                INSERT INTO match_registrations (match_id, shooter_id, squad, division, category, power_factor, is_dq, dq_reason)
                VALUES (${matchId}, ${shooterId}, ${squad},
                  ${division}, ${category}, ${powerFactor},
                  ${isDq}, ${isDq ? 'DQ (imported from WinMSS)' : null})
                RETURNING id
              `;
              competitorIdMap.set(`${wmsMemberId}`, reg.id);
              result.registrations.created++;
            }
          } catch (err: any) {
            result.warnings.push(`Registration import error: ${err.message}`);
          }
        }

        // ── 8. Import Scores for this match ──────────────────────────────
        if (!scoreTableName) {
          result.warnings.push('No score table found in .mdb file');
        } else {
          // Get all stages for this match
          const dbStages = await sql`
            SELECT id, stage_number, scoring_type, paper_targets, steel_targets,
              no_shoot_targets, hits_per_paper, min_rounds, max_points
            FROM stages WHERE match_id = ${matchId}
          `;
          const stageByNumber = new Map(dbStages.map((s: any) => [s.stage_number, s]));

          console.log('[WinMSS Import] DB stages for match:', dbStages.map((s: any) => `#${s.stage_number} ${s.name}`).join(', '));
          console.log('[WinMSS Import] Competitor map entries:', competitorIdMap.size);

          // Filter scores for this match
          let matchScoreRows = allScoreRows;
          const wmsMatchId = findColumn(matchRow, 'matchId');
          if (wmsMatchId !== undefined) {
            const filtered = allScoreRows.filter(r => {
              const rowMatchId = findColumn(r, 'scoreMatchId') ?? findColumn(r, 'matchId');
              return rowMatchId == wmsMatchId;
            });
            if (filtered.length > 0) {
              matchScoreRows = filtered;
              console.log('[WinMSS Import] Filtered scores for match', wmsMatchId, ':', filtered.length, 'of', allScoreRows.length);
            }
          }

          console.log('[WinMSS Import] Processing', matchScoreRows.length, 'score rows');
          if (matchScoreRows.length > 0) {
            console.log('[WinMSS Import] First score row columns:', Object.keys(matchScoreRows[0]).join(', '));
            console.log('[WinMSS Import] First score row values:', dumpRow(matchScoreRows[0]));
          }

          let scoreSkippedNoReg = 0;
          let scoreSkippedNoStage = 0;

          // Get DQ registration IDs for this match (used for scoring)
          const dqRegIds = new Set(
            (await sql`
              SELECT id FROM match_registrations WHERE match_id = ${matchId} AND is_dq = true
            `).map((r: any) => r.id)
          );

          for (const scoreRow of matchScoreRows) {
            try {
              const wmsMemberIdRaw = findColumn(scoreRow, 'scoreMemberId') ?? findColumn(scoreRow, 'memberId') ?? findColumn(scoreRow, 'competitorId');
              const wmsMemberId = wmsMemberIdRaw !== undefined ? Number(wmsMemberIdRaw) : 0;
              const wmsStageId = Number(findColumn(scoreRow, 'stageId') ?? findColumn(scoreRow, 'stageNumber') ?? 0);

              const registrationId = competitorIdMap.get(`${wmsMemberId}`);
              const stage = stageByNumber.get(wmsStageId);

              if (!registrationId) {
                scoreSkippedNoReg++;
                if (scoreSkippedNoReg <= 5) {
                  const allKeys = Object.keys(scoreRow);
                  result.scores.errors.push(
                    `Score row: member ${wmsMemberId} not in competitor map. Row keys: ${allKeys.join(',')}. Stage=${wmsStageId}`
                  );
                }
                continue;
              }
              if (!stage) {
                scoreSkippedNoStage++;
                if (scoreSkippedNoStage <= 5) {
                  result.scores.errors.push(
                    `Score row: stage ${wmsStageId} not found in DB stages (available: ${[...stageByNumber.keys()].join(',')})`
                  );
                }
                continue;
              }

              const alpha = Number(findColumn(scoreRow, 'scoreAlpha')) || 0;
              const charlie = Number(findColumn(scoreRow, 'scoreCharlie')) || 0;
              const delta = Number(findColumn(scoreRow, 'scoreDelta')) || 0;
              const miss = Number(findColumn(scoreRow, 'scoreMiss')) || 0;
              const noShootHits = Number(findColumn(scoreRow, 'scoreNoShoot')) || 0;
              const procedural = Number(findColumn(scoreRow, 'scoreProcedural')) || 0;
              const ftsaCount = Number(findColumn(scoreRow, 'scoreFTSA')) || 0;
              const time = Number(findColumn(scoreRow, 'scoreTime')) || 0;
              const isDnf = Boolean(findColumn(scoreRow, 'scoreDnf'));
              const isDq = Boolean(findColumn(scoreRow, 'scoreDq'));

              if (result.scores.created === 0) {
                console.log('[WinMSS Import] First score extracted: alpha=' + alpha + ' charlie=' + charlie + ' delta=' + delta + ' miss=' + miss + ' ns=' + noShootHits + ' proc=' + procedural + ' time=' + time + ' member=' + wmsMemberId + ' stage=' + wmsStageId);
              }

              if (alpha === 0 && charlie === 0 && delta === 0 && miss === 0 && time === 0 && result.scores.created < 3) {
                console.log('[WinMSS Import] WARNING: Score has all-zero hits/time. Full row:', dumpRow(scoreRow));
                result.warnings.push(`Score for member ${wmsMemberId} stage ${wmsStageId} has zero hits — column names may not match`);
              }

              const reg = await sql`SELECT power_factor FROM match_registrations WHERE id = ${registrationId}`;
              const pf = reg.length > 0 ? (reg[0].power_factor || 'minor') : 'minor';

              const steelCount = stage.steel_targets || 0;

              const calcResult = calculateAggregatedScore({
                total_alpha: alpha,
                total_charlie: charlie,
                total_delta: delta,
                total_miss: miss,
                total_no_shoot: noShootHits,
                total_steel: steelCount,
                steel_hit_count: steelCount,
                procedural_count: procedural,
                ftsa_count: ftsaCount,
                extra_shot_count: 0,
                extra_hit_count: 0,
                stacking_count: 0,
                overtime_shot_count: 0,
                time,
                scoring_type: stage.scoring_type,
                power_factor: pf,
              });

              const hpp = stage.hits_per_paper || 2;
              const paperCount = Math.max(stage.paper_targets || 0, 1);
              const paperAlpha = Math.max(0, alpha - steelCount);
              const paperCharlie = charlie;
              const paperDelta = delta;
              const paperMiss = miss;

              function distributeHits(
                totalA: number, totalC: number, totalD: number, totalM: number,
                count: number, maxPerTarget: number
              ): Array<{ alpha: number; charlie: number; delta: number; miss: number }> {
                const targets: Array<{ alpha: number; charlie: number; delta: number; miss: number }> =
                  Array.from({ length: count }, () => ({ alpha: 0, charlie: 0, delta: 0, miss: 0 }));

                let remaining = totalA;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space = maxPerTarget - targets[i].alpha;
                  const fill = Math.min(space, remaining);
                  targets[i].alpha = fill;
                  remaining -= fill;
                }
                remaining = totalC;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space = maxPerTarget - (targets[i].alpha + targets[i].charlie);
                  const fill = Math.min(space, remaining);
                  targets[i].charlie = fill;
                  remaining -= fill;
                }
                remaining = totalD;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space = maxPerTarget - (targets[i].alpha + targets[i].charlie + targets[i].delta);
                  const fill = Math.min(space, remaining);
                  targets[i].delta = fill;
                  remaining -= fill;
                }
                remaining = totalM;
                for (let i = 0; i < count && remaining > 0; i++) {
                  const space = maxPerTarget - (targets[i].alpha + targets[i].charlie + targets[i].delta + targets[i].miss);
                  const fill = Math.min(space, remaining);
                  targets[i].miss = fill;
                  remaining -= fill;
                }
                return targets;
              }

              const paperTargets = distributeHits(paperAlpha, paperCharlie, paperDelta, paperMiss, paperCount, hpp);

              const nsOnPaper = stage.no_shoot_targets === 0 ? noShootHits : 0;
              if (nsOnPaper > 0) {
                let remaining = nsOnPaper;
                for (let i = 0; i < paperCount && remaining > 0; i++) {
                  const space = hpp - (paperTargets[i].alpha + paperTargets[i].charlie + paperTargets[i].delta + paperTargets[i].miss);
                  const fill = Math.min(Math.max(space, 0), remaining);
                  paperTargets[i].miss += fill;
                  remaining -= fill;
                }
              }

              const targets: Array<{
                target_type: 'paper' | 'steel' | 'no_shoot';
                alpha: number; charlie: number; delta: number; miss: number;
                no_shoot_hits: number; steel_hit: boolean | null;
              }> = [];

              for (let i = 0; i < paperCount; i++) {
                targets.push({
                  target_type: 'paper',
                  alpha: paperTargets[i].alpha,
                  charlie: paperTargets[i].charlie,
                  delta: paperTargets[i].delta,
                  miss: paperTargets[i].miss,
                  no_shoot_hits: 0,
                  steel_hit: null,
                });
              }

              if (stage.no_shoot_targets > 0) {
                const nsPerTarget = Math.floor(noShootHits / stage.no_shoot_targets);
                let nsRemaining = noShootHits % stage.no_shoot_targets;
                for (let i = 0; i < stage.no_shoot_targets; i++) {
                  targets.push({
                    target_type: 'no_shoot',
                    alpha: 0, charlie: 0, delta: 0, miss: 0,
                    no_shoot_hits: nsPerTarget + (nsRemaining > 0 ? 1 : 0),
                    steel_hit: null,
                  });
                  if (nsRemaining > 0) nsRemaining--;
                }
              }

              for (let i = 0; i < steelCount; i++) {
                targets.push({
                  target_type: 'steel',
                  alpha: 0, charlie: 0, delta: 0, miss: 0,
                  no_shoot_hits: 0,
                  steel_hit: true,
                });
              }

              const scoreData = {
                source: 'winmss',
                aggregated: {
                  alpha, charlie, delta, miss,
                  no_shoot: noShootHits,
                  procedural,
                  steel_count: steelCount,
                },
              };

              const existingScore = await sql`
                SELECT id FROM stage_scores
                WHERE stage_id = ${stage.id} AND registration_id = ${registrationId}
              `;

              if (existingScore.length > 0) {
                await sql`
                  UPDATE stage_scores SET
                    time = ${time},
                    procedural_count = ${procedural},
                    raw_points = ${calcResult.raw_points},
                    penalty_points = ${calcResult.penalty_points},
                    net_points = ${calcResult.net_points},
                    hit_factor = ${calcResult.hit_factor},
                    is_dnf = ${isDnf},
                    score_data = ${JSON.stringify(scoreData)}::jsonb
                  WHERE id = ${existingScore[0].id}
                `;
                await sql`DELETE FROM target_scores WHERE stage_score_id = ${existingScore[0].id}`;

                for (let i = 0; i < targets.length; i++) {
                  const t = targets[i];
                  await sql`
                    INSERT INTO target_scores (stage_score_id, target_index, target_type,
                      alpha, charlie, delta, miss, no_shoot_hits, steel_hit)
                    VALUES (${existingScore[0].id}, ${i + 1}, ${t.target_type},
                      ${t.alpha}, ${t.charlie}, ${t.delta}, ${t.miss},
                      ${t.no_shoot_hits}, ${t.steel_hit})
                  `;
                }
              } else {
                const [score] = await sql`
                  INSERT INTO stage_scores (match_id, stage_id, registration_id, time,
                    procedural_count, raw_points, penalty_points, net_points, hit_factor, is_dnf, score_data)
                  VALUES (${matchId}, ${stage.id}, ${registrationId}, ${time},
                    ${procedural}, ${calcResult.raw_points}, ${calcResult.penalty_points},
                    ${calcResult.net_points}, ${calcResult.hit_factor}, ${isDnf}, ${JSON.stringify(scoreData)}::jsonb)
                  RETURNING id
                `;

                for (let i = 0; i < targets.length; i++) {
                  const t = targets[i];
                  await sql`
                    INSERT INTO target_scores (stage_score_id, target_index, target_type,
                      alpha, charlie, delta, miss, no_shoot_hits, steel_hit)
                    VALUES (${score.id}, ${i + 1}, ${t.target_type},
                      ${t.alpha}, ${t.charlie}, ${t.delta}, ${t.miss},
                      ${t.no_shoot_hits}, ${t.steel_hit})
                  `;
                }
              }

              result.scores.created++;
            } catch (err: any) {
              result.scores.errors.push(`Score import error: ${err.message}`);
            }
          }

          if (scoreSkippedNoReg > 0) {
            result.warnings.push(`${scoreSkippedNoReg} scores skipped — could not match member ID to registration`);
          }
          if (scoreSkippedNoStage > 0) {
            result.warnings.push(`${scoreSkippedNoStage} scores skipped — could not match stage number`);
          }

          // ── 9. Recalculate stage rankings ────────────────────────────
          for (const stage of dbStages) {
            try {
              const stageScores = await sql`
                SELECT ss.id, ss.time, ss.net_points, ss.registration_id, ss.is_dnf,
                  COALESCE(mr.division, s.division) as division,
                  mr.power_factor as reg_pf, s.power_factor as shooter_pf
                FROM stage_scores ss
                JOIN match_registrations mr ON mr.id = ss.registration_id
                JOIN shooters s ON s.id = mr.shooter_id
                WHERE ss.stage_id = ${stage.id}
              `;

              if (stageScores.length === 0) continue;

              const maxPoints = Number(stage.max_points) || stage.paper_targets * stage.hits_per_paper * 5 + stage.steel_targets * 5;

              const divisionGroups = new Map<string, any[]>();
              for (const s of stageScores) {
                if (s.is_dnf || dqRegIds.has(s.registration_id)) continue;
                const div = (s as any).division || 'unknown';
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

                  await sql`
                    UPDATE stage_scores SET
                      stage_percent = ${Math.round(stagePercent * 10000) / 10000},
                      stage_points = ${Math.round(stagePoints * 100) / 100}
                    WHERE id = ${s.id}
                  `;
                }
              }

              for (const s of stageScores) {
                if (dqRegIds.has(s.registration_id) || s.is_dnf) {
                  await sql`
                    UPDATE stage_scores SET stage_percent = 0, stage_points = 0 WHERE id = ${s.id}
                  `;
                }
              }
            } catch (err: any) {
              result.warnings.push(`Failed to recalculate stage ${stage.stage_number}: ${err.message}`);
            }
          }
        } // end if scoreTableName
      } // end if competitorTableName
    } // End of match loop

    // ── 10. Update shooter defaults from most recent registration ──────
    try {
      const updatedShooters = await sql`
        UPDATE shooters s
        SET division = mr.division,
            category = mr.category,
            power_factor = mr.power_factor,
            updated_at = NOW()
        FROM match_registrations mr
        JOIN (
          SELECT shooter_id, MAX(created_at) as max_created
          FROM match_registrations
          WHERE division IS NOT NULL
          GROUP BY shooter_id
        ) latest ON mr.shooter_id = latest.shooter_id AND mr.created_at = latest.max_created
        WHERE s.id = mr.shooter_id
          AND mr.division IS NOT NULL
      `;
      console.log(`[WinMSS Import] Updated ${updatedShooters.count} shooter defaults from registrations`);
    } catch (err: any) {
      result.warnings.push(`Could not update shooter defaults from registrations: ${err.message}`);
    }

    // Add summary counts to errors for skipped scores
    console.log(`[WinMSS Import] Complete: ${result.matches.length} matches, ${result.stages.length} stages, ${result.shooters.created}/${result.shooters.skipped} shooters, ${result.registrations.created}/${result.registrations.skipped} regs, ${result.scores.created} scores`);
    console.log(`[WinMSS Import] Warnings: ${result.warnings.length}, Errors: ${result.scores.errors.length}, Shooter errors: ${result.shooters.errors.length}`);

    return c.json(result);
  } catch (err: any) {
    console.error('[WinMSS Import] Error:', err);
    return c.json({ error: `Import failed: ${err.message}` }, 500);
  }
});