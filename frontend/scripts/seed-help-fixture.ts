/**
 * Seed a complete demo match used by the help-system screenshot capture.
 *
 * Idempotent: deletes any prior "Demo Help Match" before recreating.
 * Run with: npm run seed:help-fixture
 *
 * Requires the backend to be running on http://localhost:3001 and the
 * default admin password to be "admin" (the install default).
 */
const BASE = process.env.BACKEND_URL ?? 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin';

const MATCH_NAME = 'Demo Help Match';

interface AdminSession {
  token: string;
}

async function api<T = any>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function loginAdmin(): Promise<AdminSession> {
  return api<AdminSession>('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
}

async function deleteMatchIfExists(token: string) {
  const matches = await api<Array<{ id: string; name: string }>>('/api/matches', {}, token);
  const target = matches.find((m) => m.name === MATCH_NAME);
  if (!target) return;
  // Unset as current if needed
  try {
    await api(`/api/matches/unset-current`, { method: 'PUT' }, token);
  } catch { /* fine if it wasn't current */ }
  await api(`/api/matches/${target.id}`, { method: 'DELETE' }, token);
  console.log(`[seed] Removed existing "${MATCH_NAME}"`);
}

async function createMatch(token: string) {
  const match = await api<{ id: string; name: string }>(
    '/api/matches',
    {
      method: 'POST',
      body: JSON.stringify({
        name: MATCH_NAME,
        date: new Date().toISOString().slice(0, 10),
        organization: 'IPSC',
        firearm_type: 'handgun',
        match_level: 3,
      }),
    },
    token,
  );
  await api(`/api/matches/${match.id}/set-current`, { method: 'PUT' }, token);
  console.log(`[seed] Created match: ${match.name} (${match.id})`);
  return match;
}

async function createStage(token: string, matchId: string, body: any) {
  return api<{ id: string; stage_number: number; name: string }>(
    `/api/matches/${matchId}/stages`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}

async function createShooter(token: string, body: any) {
  return api<{ id: string }>('/api/shooters', { method: 'POST', body: JSON.stringify(body) }, token);
}

async function register(token: string, matchId: string, body: any) {
  return api<Array<{ id: string; shooter_id: string; skipped?: boolean }>>(
    `/api/matches/${matchId}/registrations`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
}

async function saveScore(token: string, matchId: string, stageId: string, registrationId: string, data: any) {
  return api(
    `/api/matches/${matchId}/stages/${stageId}/scores/${registrationId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

async function dq(token: string, matchId: string, registrationId: string, reason: string) {
  return api(
    `/api/matches/${matchId}/registrations/${registrationId}/dq`,
    { method: 'PUT', body: JSON.stringify({ dq_reason: reason }) },
    token,
  );
}

async function updateSquad(token: string, matchId: string, registrationId: string, squad: number) {
  return api(
    `/api/matches/${matchId}/registrations/${registrationId}`,
    { method: 'PUT', body: JSON.stringify({ squad }) },
    token,
  );
}

async function recalc(token: string, matchId: string) {
  return api(`/api/matches/${matchId}/recalculate`, { method: 'POST' }, token);
}

const STAGE_DEFS = [
  {
    name: 'Stage 1 — Speed Drill',
    scoring_type: 'comstock',
    paper_targets: 4,
    steel_targets: 2,
    no_shoot_targets: 0,
    npm_targets: 0,
    hits_per_paper: 2,
  },
  {
    name: 'Stage 2 — Virginia',
    scoring_type: 'virginia',
    paper_targets: 5,
    steel_targets: 0,
    no_shoot_targets: 1,
    npm_targets: 0,
    hits_per_paper: 2,
  },
  {
    name: 'Stage 3 — IDPA',
    scoring_type: 'idpa',
    paper_targets: 4,
    steel_targets: 0,
    no_shoot_targets: 1,
    npm_targets: 0,
    hits_per_paper: 2,
  },
  {
    name: 'Stage 4 — Action Steel',
    scoring_type: 'action_steel',
    paper_targets: 0,
    steel_targets: 5,
    no_shoot_targets: 0,
    npm_targets: 0,
    hits_per_paper: 1,
    config: { number_of_strings: 5, targets_per_string: 5, drop_worst: 1 },
  },
  {
    name: 'Stage 5 — Multi-Gun',
    scoring_type: 'multi_gun',
    paper_targets: 8,
    steel_targets: 0,
    no_shoot_targets: 1,
    npm_targets: 0,
    hits_per_paper: 1,
    config: { num_targets: 8, has_no_shoot: true },
  },
  {
    name: 'Stage 6 — Bullseye',
    scoring_type: 'bullseye',
    paper_targets: 0,
    steel_targets: 0,
    no_shoot_targets: 0,
    npm_targets: 0,
    hits_per_paper: 1,
    config: { fire_type: 'slow', shots_per_string: 10 },
  },
] as const;

const SHOOTER_DEFS = [
  { first_name: 'John',   last_name: 'Smith',     division: 'production',   category: 'regular',    power_factor: 'minor',     region: 'UK' },
  { first_name: 'Anna',   last_name: 'Kovac',     division: 'production',   category: 'lady',       power_factor: 'minor',     region: 'SK' },
  { first_name: 'Peter',  last_name: 'Novak',     division: 'standard',     category: 'regular',    power_factor: 'major',     region: 'CZ' },
  { first_name: 'Maria',  last_name: 'Horvath',   division: 'open',         category: 'senior',     power_factor: 'major',     region: 'HU' },
  { first_name: 'David',  last_name: 'Brown',     division: 'production',   category: 'junior',     power_factor: 'minor',     region: 'UK' },
  { first_name: 'Eva',    last_name: 'Molnar',    division: 'standard',     category: 'regular',    power_factor: 'minor',     region: 'HU' },
  { first_name: 'Tomas',  last_name: 'Cerny',     division: 'open',         category: 'regular',    power_factor: 'major',     region: 'CZ' },
  { first_name: 'Lucia',  last_name: 'Polakova',  division: 'production',   category: 'lady',       power_factor: 'minor',     region: 'SK' },
  { first_name: 'Marek',  last_name: 'Toth',      division: 'classic',      category: 'super_senior', power_factor: 'minor',   region: 'SK' },
  { first_name: 'Zuzana', last_name: 'Varga',     division: 'production',   category: 'regular',    power_factor: 'major',     region: 'SK' },
  { first_name: 'Ondrej', last_name: 'Sykorova',  division: 'open',         category: 'regular',    power_factor: 'major',     region: 'SK' },
  { first_name: 'Karol',  last_name: 'Janosik',   division: 'standard',     category: 'senior',     power_factor: 'minor',     region: 'SK' },
];

function buildComstockScore(paper: number, steel: number, time: number) {
  // Two hits per paper target; vary distribution across shooters (handled by caller)
  const targets: any[] = [];
  // 1 paper target with 2 A's, 1 with 1A+1C, 1 with 2C, 1 with 1C+1M
  const patterns = [
    { alpha: 2, charlie: 0, delta: 0, miss: 0 },
    { alpha: 1, charlie: 1, delta: 0, miss: 0 },
    { alpha: 0, charlie: 2, delta: 0, miss: 0 },
    { alpha: 0, charlie: 1, delta: 0, miss: 1 },
  ];
  for (let i = 0; i < paper; i++) {
    const p = patterns[i % patterns.length];
    targets.push({
      target_index: i + 1,
      target_type: 'paper',
      ...p,
      no_shoot_hits: 0,
      target_data: {},
    });
  }
  for (let i = 0; i < steel; i++) {
    targets.push({
      target_index: paper + i + 1,
      target_type: 'steel',
      alpha: 0,
      charlie: 0,
      delta: 0,
      miss: 0,
      no_shoot_hits: 0,
      steel_hit: true,
      target_data: {},
    });
  }
  return {
    time,
    targets,
    procedural_count: 0,
    ftsa_count: 0,
    extra_shot_count: 0,
    extra_hit_count: 0,
    stacking_count: 0,
    overtime_shot_count: 0,
    is_dnf: false,
    chrono: null,
    score_data: { string_times: [] },
  };
}

function buildVirginiaScore(paper: number, noShoot: number, time: number) {
  // 2 hits per paper target: 1A+1C each
  const targets: any[] = [];
  for (let i = 0; i < paper; i++) {
    targets.push({
      target_index: i + 1,
      target_type: 'paper',
      alpha: 1,
      charlie: 1,
      delta: 0,
      miss: 0,
      no_shoot_hits: 0,
      target_data: {},
    });
  }
  for (let i = 0; i < noShoot; i++) {
    targets.push({
      target_index: paper + i + 1,
      target_type: 'no_shoot',
      alpha: 0,
      charlie: 0,
      delta: 0,
      miss: 0,
      no_shoot_hits: 1,
      target_data: {},
    });
  }
  return {
    time,
    targets,
    procedural_count: 0,
    ftsa_count: 0,
    extra_shot_count: 1,
    extra_hit_count: 0,
    stacking_count: 0,
    overtime_shot_count: 0,
    is_dnf: false,
    chrono: null,
    score_data: { string_times: [] },
  };
}

function buildIdpaScore(paper: number, time: number) {
  // 1A, 1C, 1D, 1M per target (4 shots) — Vickers scoring
  const targets: any[] = [];
  for (let i = 0; i < paper; i++) {
    targets.push({
      target_index: i + 1,
      target_type: 'paper',
      alpha: 1,
      charlie: 1,
      delta: 1,
      miss: 1,
      no_shoot_hits: 0,
      target_data: {},
    });
  }
  return {
    time,
    targets,
    procedural_count: 0,
    ftsa_count: 0,
    extra_shot_count: 0,
    extra_hit_count: 0,
    stacking_count: 0,
    overtime_shot_count: 0,
    is_dnf: false,
    chrono: null,
    score_data: { string_times: [] },
  };
}

async function main() {
  console.log(`[seed] Logging in to ${BASE} as admin`);
  const { token } = await loginAdmin();
  console.log('[seed] OK, cleaning up prior demo match');
  await deleteMatchIfExists(token);
  const match = await createMatch(token);

  // Stages
  const stages: Array<{ id: string; name: string; def: any }> = [];
  for (const def of STAGE_DEFS) {
    const stage = await createStage(token, match.id, def);
    stages.push({ id: stage.id, name: stage.name, def });
    console.log(`[seed]   + stage ${stage.stage_number}: ${stage.name}`);
  }

  // Shooters
  const shooters: Array<{ id: string; def: any }> = [];
  for (const def of SHOOTER_DEFS) {
    const s = await createShooter(token, {
      first_name: def.first_name,
      last_name: def.last_name,
      division: def.division,
      category: def.category,
      power_factor: def.power_factor,
      region: def.region,
    });
    shooters.push({ id: s.id, def });
  }
  console.log(`[seed] Created ${shooters.length} shooters`);

  // Register all
  const registrations = await register(token, match.id, {
    shooterIds: shooters.map((s) => s.id),
  });
  // Map by shooter id
  const regByShooter = new Map<string, string>();
  for (const r of registrations) {
    if (r.shooter_id && r.id) regByShooter.set(r.shooter_id, r.id);
  }
  console.log(`[seed] Registered ${registrations.length} shooters (${regByShooter.size} new)`);

  // Score stages 1, 2, 3 for everyone
  const baseTime = 12.0;
  for (let i = 0; i < shooters.length; i++) {
    const s = shooters[i];
    const regId = regByShooter.get(s.id);
    if (!regId) continue;
    const variance = (i % 5) * 0.4;
    const t1 = +(baseTime + variance).toFixed(2);
    const t2 = +(baseTime + 1.2 + variance).toFixed(2);
    const t3 = +(baseTime + 0.5 + variance).toFixed(2);
    await saveScore(token, match.id, stages[0].id, regId, buildComstockScore(4, 2, t1));
    await saveScore(token, match.id, stages[1].id, regId, buildVirginiaScore(5, 1, t2));
    await saveScore(token, match.id, stages[2].id, regId, buildIdpaScore(4, t3));
  }
  console.log('[seed] Scored stages 1-3 for all shooters');

  // Assign squads (1, 2, 3, 4)
  const regIds = registrations.filter((r) => r.id).map((r) => r.id);
  for (let i = 0; i < regIds.length; i++) {
    const squad = (i % 4) + 1;
    await updateSquad(token, match.id, regIds[i], squad);
  }
  console.log('[seed] Assigned 4 squads');

  // DQ the last 2
  const dqReasons = ['Failure to follow range commands', 'Rule violation'];
  for (let i = regIds.length - 2; i < regIds.length; i++) {
    await dq(token, match.id, regIds[i], dqReasons[i - (regIds.length - 2)]);
  }
  console.log('[seed] DQ-ed last 2 shooters');

  // Recalculate results
  await recalc(token, match.id);
  console.log('[seed] Recalculated match results');

  console.log('\n[seed] DONE. Match id:', match.id);
  console.log('[seed] Use this match to capture help screenshots.');
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
