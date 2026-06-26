import { gzipSync, gunzipSync } from 'node:zlib';
import { writeFile, readFile, unlink, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { sql } from '../db/client.js';

export interface DeltaPayload {
  type: 'score';
  ts: string;
  matchId: string;
  stageId: string;
  registrationId: string;
  score: Record<string, unknown>;
  targets: Record<string, unknown>[];
  chrono: Record<string, unknown> | null;
}

let deltaTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDeltas: Array<{ matchId: string; stageId: string; registrationId: string }> = [];
let deltaRunning = false;

function compressJson(json: string): Buffer {
  return gzipSync(Buffer.from(json, 'utf-8'));
}

function decompressGzip(buf: Buffer): string {
  return gunzipSync(buf).toString('utf-8');
}

export async function getBackupFolder(): Promise<string> {
  const [row] = await sql`SELECT value FROM app_settings WHERE key = 'local_backup_folder'`;
  return row?.value || '';
}

export async function getBackupEnabled(): Promise<boolean> {
  const [row] = await sql`SELECT value FROM app_settings WHERE key = 'local_backup_enabled'`;
  return row?.value === 'true';
}

async function isFolderAccessible(folder: string): Promise<boolean> {
  try {
    await stat(folder);
    return true;
  } catch {
    return false;
  }
}

async function writeFileToFolder(folder: string, relativePath: string, data: Buffer): Promise<void> {
  const fullPath = path.join(folder, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

export async function exportFullDbAsJson(): Promise<string> {
  const matches = await sql`SELECT * FROM matches`;
  const stages = await sql`SELECT * FROM stages`;
  const shooters = await sql`SELECT * FROM shooters`;
  const registrations = await sql`SELECT * FROM match_registrations`;
  const scores = await sql`SELECT * FROM stage_scores`;
  const targets = await sql`SELECT * FROM target_scores`;
  const chrono = await sql`SELECT * FROM chrono_results`;
  const settings = await sql`SELECT * FROM app_settings`;
  const adminSessions = await sql`SELECT * FROM admin_sessions`;
  const scorerSessions = await sql`SELECT * FROM scorer_sessions`;

  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    matches,
    stages,
    shooters,
    registrations,
    scores,
    targets,
    chrono,
    settings,
    adminSessions,
    scorerSessions,
  });
}

async function importJsonToDb(json: string): Promise<void> {
  const data = JSON.parse(json);

  const cols = (row: Record<string, unknown>) => Object.keys(row);

  await sql.begin(async (sql) => {
    await sql`DELETE FROM target_scores`;
    await sql`DELETE FROM chrono_results`;
    await sql`DELETE FROM stage_scores`;
    await sql`DELETE FROM match_registrations`;
    await sql`DELETE FROM stages`;
    await sql`DELETE FROM matches`;
    await sql`DELETE FROM shooters`;
    await sql`DELETE FROM app_settings`;
    await sql`DELETE FROM admin_sessions`;
    await sql`DELETE FROM scorer_sessions`;

    for (const r of data.matches || []) {
      const c = cols(r);
      await sql`INSERT INTO matches ${sql(r as any, ...c)}`;
    }
    for (const r of data.stages || []) {
      const c = cols(r);
      await sql`INSERT INTO stages ${sql(r as any, ...c)}`;
    }
    for (const r of data.shooters || []) {
      const c = cols(r);
      await sql`INSERT INTO shooters ${sql(r as any, ...c)}`;
    }
    for (const r of data.registrations || []) {
      const c = cols(r);
      await sql`INSERT INTO match_registrations ${sql(r as any, ...c)}`;
    }
    for (const r of data.scores || []) {
      const c = cols(r);
      await sql`INSERT INTO stage_scores ${sql(r as any, ...c)}`;
    }
    for (const r of data.targets || []) {
      const c = cols(r);
      await sql`INSERT INTO target_scores ${sql(r as any, ...c)}`;
    }
    for (const r of data.chrono || []) {
      const c = cols(r);
      await sql`INSERT INTO chrono_results ${sql(r as any, ...c)}`;
    }
    for (const r of data.settings || []) {
      await sql`INSERT INTO app_settings (key, value) VALUES (${r.key}, ${r.value}) ON CONFLICT (key) DO NOTHING`;
    }
    for (const r of data.adminSessions || []) {
      const c = cols(r);
      await sql`INSERT INTO admin_sessions ${sql(r as any, ...c)}`;
    }
    for (const r of data.scorerSessions || []) {
      const c = cols(r);
      await sql`INSERT INTO scorer_sessions ${sql(r as any, ...c)}`;
    }
  });
}

export async function buildDeltaPayload(matchId: string, stageId: string, registrationId: string): Promise<DeltaPayload> {
  const [score] = await sql`
    SELECT * FROM stage_scores WHERE match_id = ${matchId} AND stage_id = ${stageId} AND registration_id = ${registrationId}
  `;
  if (!score) throw new Error(`Score not found: ${matchId}/${stageId}/${registrationId}`);

  const targets = await sql`
    SELECT * FROM target_scores WHERE stage_score_id = ${score.id} ORDER BY target_index
  `;
  const [chrono] = await sql`
    SELECT * FROM chrono_results WHERE stage_score_id = ${score.id}
  `;

  return {
    type: 'score',
    ts: new Date().toISOString(),
    matchId,
    stageId,
    registrationId,
    score,
    targets,
    chrono: chrono || null,
  };
}

// --- Full backup ---

export async function triggerFullBackup(): Promise<{ success: boolean; key: string; size: number }> {
  const folder = await getBackupFolder();
  if (!folder) throw new Error('No backup folder configured');
  if (!await isFolderAccessible(folder)) throw new Error('Backup folder is not accessible — is the drive mounted?');

  const json = await exportFullDbAsJson();
  const compressed = compressJson(json);
  const ts = new Date().toISOString();

  await writeFileToFolder(folder, `ipscscore-full-${ts}.json.gz`, compressed);
  await writeFileToFolder(folder, `ipscscore-latest.json.gz`, compressed);

  const tsForDb = ts.replace(/\.\d+Z$/, 'Z');
  await sql`INSERT INTO app_settings (key, value) VALUES ('last_full_backup_at', ${tsForDb})
            ON CONFLICT (key) DO UPDATE SET value = ${tsForDb}`;

  await rotateBackups(folder);
  await clearDeltas(folder);

  return { success: true, key: `ipscscore-full-${ts}.json.gz`, size: compressed.length };
}

async function rotateBackups(folder: string): Promise<void> {
  try {
    const files = await readdir(folder);
    const fullBackups = files
      .filter(f => f.startsWith('ipscscore-full-') && f.endsWith('.json.gz'))
      .sort();
    while (fullBackups.length > 3) {
      const oldest = fullBackups.shift();
      if (oldest) await unlink(path.join(folder, oldest)).catch(() => {});
    }
  } catch { /* folder may not exist yet */ }
}

async function clearDeltas(folder: string): Promise<void> {
  try {
    const dir = path.join(folder, 'deltas');
    const files = await readdir(dir);
    for (const f of files) {
      await unlink(path.join(dir, f)).catch(() => {});
    }
  } catch { /* dir may not exist */ }
}

// --- Delta backup ---

export function scheduleDeltaBackup(matchId: string, stageId: string, registrationId: string): void {
  pendingDeltas.push({ matchId, stageId, registrationId });
  if (deltaTimer) clearTimeout(deltaTimer);
  deltaTimer = setTimeout(flushDeltas, 5000);
}

async function flushDeltas(): Promise<void> {
  if (deltaRunning) return;
  deltaRunning = true;
  try {
    const folder = await getBackupFolder();
    if (!folder) return;
    const enabled = await getBackupEnabled();
    if (!enabled) return;

    if (!await isFolderAccessible(folder)) {
      pendingDeltas = [];
      console.log('[LocalBackup] Backup folder not accessible, dropping pending deltas');
      return;
    }

    const deltas = [...pendingDeltas];
    pendingDeltas = [];

    for (const d of deltas) {
      try {
        const payload = await buildDeltaPayload(d.matchId, d.stageId, d.registrationId);
        const ts = new Date().toISOString();
        const fileName = `${ts}-${d.registrationId}.json`;
        await writeFileToFolder(folder, `deltas/${fileName}`, Buffer.from(JSON.stringify(payload)));
      } catch (err) {
        console.error('[LocalBackup] Delta write failed:', err);
      }
    }
  } finally {
    deltaRunning = false;
  }
}

// --- Restore ---

export async function applyBackup(buf: Buffer): Promise<void> {
  const str = decompressGzip(buf);
  const parsed = JSON.parse(str);

  if (parsed.version) {
    await importJsonToDb(str);
  } else if (parsed.type === 'score') {
    await importDelta(str);
  } else {
    throw new Error('Unknown backup format');
  }
}

export interface FolderRestorePreview {
  fullFile: string;
  fullSize: number;
  fullDate: string;
  deltasCount: number;
  deltaDates: { earliest: string | null; latest: string | null };
}

export interface FolderRestoreResult {
  fullFile: string;
  deltasApplied: number;
  errors: string[];
}

export async function previewFolderBackup(folder: string): Promise<FolderRestorePreview> {
  if (!await isFolderAccessible(folder)) throw new Error('Backup folder is not accessible — is the drive mounted?');
  const files = await readdir(folder);

  let fullFile: string | null = null;
  if (files.includes('ipscscore-latest.json.gz')) {
    fullFile = 'ipscscore-latest.json.gz';
  } else {
    const fulls = files.filter(f => f.startsWith('ipscscore-full-') && f.endsWith('.json.gz')).sort();
    if (fulls.length > 0) fullFile = fulls[fulls.length - 1];
  }
  if (!fullFile) throw new Error('No full backup file found in folder');

  const s = await stat(path.join(folder, fullFile));

  let deltasCount = 0;
  let earliest: string | null = null;
  let latest: string | null = null;
  try {
    const deltaFiles = await readdir(path.join(folder, 'deltas'));
    deltaFiles.sort();
    deltasCount = deltaFiles.length;
    if (deltasCount > 0) {
      earliest = deltaFiles[0];
      latest = deltaFiles[deltasCount - 1];
    }
  } catch { /* no deltas folder */ }

  return {
    fullFile,
    fullSize: s.size,
    fullDate: s.mtime.toISOString(),
    deltasCount,
    deltaDates: { earliest, latest },
  };
}

export async function applyFolderBackup(folder: string): Promise<FolderRestoreResult> {
  if (!await isFolderAccessible(folder)) throw new Error('Backup folder is not accessible — is the drive mounted?');
  const files = await readdir(folder);

  let fullFile: string | null = null;
  if (files.includes('ipscscore-latest.json.gz')) {
    fullFile = 'ipscscore-latest.json.gz';
  } else {
    const fulls = files.filter(f => f.startsWith('ipscscore-full-') && f.endsWith('.json.gz')).sort();
    if (fulls.length > 0) fullFile = fulls[fulls.length - 1];
  }
  if (!fullFile) throw new Error('No full backup file found in folder');

  const fullData = await readFile(path.join(folder, fullFile));
  const fullJson = decompressGzip(fullData);
  await importJsonToDb(fullJson);

  let deltasApplied = 0;
  const errors: string[] = [];
  try {
    const deltaDir = path.join(folder, 'deltas');
    const deltaFiles = await readdir(deltaDir);
    deltaFiles.sort();
    for (const df of deltaFiles) {
      if (!df.endsWith('.json')) continue;
      try {
        const deltaData = await readFile(path.join(deltaDir, df), 'utf-8');
        await importDelta(deltaData);
        deltasApplied++;
      } catch (err: any) {
        errors.push(`Delta ${df}: ${err.message}`);
      }
    }
  } catch { /* no deltas folder */ }

  return { fullFile, deltasApplied, errors };
}

async function importDelta(json: string): Promise<void> {
  const d: DeltaPayload = JSON.parse(json);
  const s = d.score as any;

  await sql`
    INSERT INTO stage_scores (id, match_id, stage_id, registration_id, time,
      extra_shot_count, extra_hit_count, stacking_count, overtime_shot_count,
      procedural_count, ftsa_count, is_dnf,
      raw_points, penalty_points, net_points, hit_factor,
      total_time, x_count, score_data)
    VALUES (${s.id}, ${s.match_id}, ${s.stage_id}, ${s.registration_id}, ${s.time},
      ${s.extra_shot_count}, ${s.extra_hit_count}, ${s.stacking_count}, ${s.overtime_shot_count},
      ${s.procedural_count}, ${s.ftsa_count}, ${s.is_dnf},
      ${s.raw_points}, ${s.penalty_points}, ${s.net_points}, ${s.hit_factor},
      ${s.total_time}, ${s.x_count}, ${s.score_data})
    ON CONFLICT (stage_id, registration_id) DO UPDATE SET
      time = ${s.time},
      raw_points = ${s.raw_points}, penalty_points = ${s.penalty_points},
      net_points = ${s.net_points}, hit_factor = ${s.hit_factor},
      updated_at = NOW()
  `;

  for (const t of d.targets as any[]) {
    await sql`
      INSERT INTO target_scores (id, stage_score_id, target_index, target_type, alpha, charlie, delta, miss, no_shoot_hits, steel_hit, target_data)
      VALUES (${t.id}, ${t.stage_score_id}, ${t.target_index}, ${t.target_type},
        ${t.alpha}, ${t.charlie}, ${t.delta}, ${t.miss}, ${t.no_shoot_hits}, ${t.steel_hit}, ${t.target_data})
      ON CONFLICT (stage_score_id, target_index) DO UPDATE SET
        alpha = ${t.alpha}, charlie = ${t.charlie}, delta = ${t.delta},
        miss = ${t.miss}, no_shoot_hits = ${t.no_shoot_hits},
        steel_hit = ${t.steel_hit}
    `;
  }

  if (d.chrono) {
    const ch = d.chrono as any;
    await sql`
      INSERT INTO chrono_results (id, stage_score_id, bullet_weight, velocity_1, velocity_2, velocity_3,
                                   avg_velocity, calculated_pf, pf_passed)
      VALUES (${ch.id}, ${ch.stage_score_id}, ${ch.bullet_weight}, ${ch.velocity_1}, ${ch.velocity_2}, ${ch.velocity_3},
              ${ch.avg_velocity}, ${ch.calculated_pf}, ${ch.pf_passed})
      ON CONFLICT (stage_score_id) DO UPDATE SET
        bullet_weight = ${ch.bullet_weight},
        avg_velocity = ${ch.avg_velocity},
        calculated_pf = ${ch.calculated_pf},
        pf_passed = ${ch.pf_passed}
    `;
  }
}

// --- Status ---

export async function getStatus(): Promise<{
  folder: string;
  enabled: boolean;
  lastFullBackupAt: string | null;
  deltasSinceFull: number;
  diskUsage: number;
  folderAccessible: boolean;
}> {
  const folder = await getBackupFolder();
  const enabled = await getBackupEnabled();
  const [row] = await sql`SELECT value FROM app_settings WHERE key = 'last_full_backup_at'`;

  let deltasSinceFull = 0;
  let diskUsage = 0;
  let folderAccessible = false;
  if (folder) {
    folderAccessible = await isFolderAccessible(folder);
    if (folderAccessible) {
      try {
        const files = await readdir(folder);
        for (const f of files) {
          if (f.startsWith('ipscscore-') || f === 'ipscscore-latest.json.gz') {
            try {
              const s = await stat(path.join(folder, f));
              diskUsage += s.size;
            } catch { /* skip */ }
          }
        }
        try {
          const deltaDir = path.join(folder, 'deltas');
          const deltaFiles = await readdir(deltaDir);
          deltasSinceFull = deltaFiles.length;
          for (const f of deltaFiles) {
            try {
              const s2 = await stat(path.join(deltaDir, f));
              diskUsage += s2.size;
            } catch { /* skip */ }
          }
        } catch { /* no deltas folder */ }
      } catch { /* folder may not exist */ }
    }
  }

  return {
    folder,
    enabled,
    lastFullBackupAt: row?.value || null,
    deltasSinceFull,
    diskUsage,
    folderAccessible,
  };
}

// --- Config ---

export async function saveConfig(config: { folder?: string; enabled?: boolean }): Promise<void> {
  if (config.folder !== undefined) {
    const existing = await sql`SELECT value FROM app_settings WHERE key = 'local_backup_folder'`;
    if (existing.length > 0) {
      await sql`UPDATE app_settings SET value = ${config.folder} WHERE key = 'local_backup_folder'`;
    } else {
      await sql`INSERT INTO app_settings (key, value) VALUES ('local_backup_folder', ${config.folder})`;
    }
  }
  if (config.enabled !== undefined) {
    const val = config.enabled ? 'true' : 'false';
    const existing = await sql`SELECT value FROM app_settings WHERE key = 'local_backup_enabled'`;
    if (existing.length > 0) {
      await sql`UPDATE app_settings SET value = ${val} WHERE key = 'local_backup_enabled'`;
    } else {
      await sql`INSERT INTO app_settings (key, value) VALUES ('local_backup_enabled', ${val})`;
    }
  }
}

// --- Full backup timer ---

let fullBackupTimer: ReturnType<typeof setInterval> | null = null;

export function startFullBackupTimer(): void {
  if (fullBackupTimer) return;
  fullBackupTimer = setInterval(async () => {
    try {
      const folder = await getBackupFolder();
      if (!folder) return;
      const enabled = await getBackupEnabled();
      if (!enabled) return;
      if (!await isFolderAccessible(folder)) {
        console.log('[LocalBackup] Backup folder not accessible, skipping');
        return;
      }
      await triggerFullBackup();
    } catch (err) {
      console.error('[LocalBackup] Timer error:', err);
    }
  }, 30 * 60 * 1000);
  if (typeof fullBackupTimer === 'object' && 'unref' in fullBackupTimer) {
    fullBackupTimer.unref();
  }
  console.log('[LocalBackup] Full backup timer started (30 min interval)');
}

export function stopFullBackupTimer(): void {
  if (fullBackupTimer) {
    clearInterval(fullBackupTimer);
    fullBackupTimer = null;
  }
}
