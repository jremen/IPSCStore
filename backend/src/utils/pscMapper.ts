import crypto from 'crypto';
import { calculateScore } from './scoringCalc.js';

export type PowerFactor = 'major' | 'minor';

export interface ImportedShooter {
  id: string;
  first_name: string;
  last_name: string;
  division: string;
  power_factor: PowerFactor;
  category: string;
  region: string;
}

export interface ImportedRegistration {
  id: string;
  shooter_id: string;
  division: string;
  power_factor: PowerFactor;
  category: string;
  squad: number | null;
  is_dq: boolean;
  dq_reason: string | null;
}

export interface ImportedStage {
  id: string;
  stage_number: number;
  name: string;
  scoring_type: string;
  paper_targets: number;
  steel_targets: number;
  no_shoot_targets: number;
  hits_per_paper: number;
  min_rounds: number;
  max_points: number;
}

export interface ImportedStageScore {
  id: string;
  stage_id: string;
  registration_id: string;
  time: number;
  raw_points: number;
  penalty_points: number;
  net_points: number;
  hit_factor: number;
  procedural_count: number;
  is_dnf: boolean;
  score_data: any;
  total_time: number;
}

export interface ImportedTargetScore {
  id: string;
  stage_score_id: string;
  target_index: number;
  target_type: 'paper' | 'steel' | 'no_shoot';
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
  steel_hit: boolean | null;
}

export interface ParsedPscData {
  match: {
    name: string;
    date: string;
    organization: string;
    firearm_type: string;
  };
  stages: ImportedStage[];
  shooters: ImportedShooter[];
  registrations: ImportedRegistration[];
  stage_scores: ImportedStageScore[];
  target_scores: ImportedTargetScore[];
  warnings: string[];
  synced_shooters: boolean;
}

export interface PscExportData {
  match_def: any;
  match_scores: any;
}

const PSC_MATCH_TYPE_MAP: Record<string, string> = {
  'uspsa_p': 'handgun',
  'ipsc': 'handgun',
  '3gnpro': 'multi_gun',
  'idpa': 'handgun',
  'gadpa': 'handgun',
  'precisionrifle': 'long_range',
  'proam': 'handgun',
  'sc': 'action_steel',
  'timeplus': 'handgun',
  'timeplus_c': 'handgun',
  'timeplus_p': 'handgun',
};

const PSC_DIVISION_MAP: Record<string, string> = {
  'Open': 'open',
  'Production': 'production',
  'Production Optics': 'production_optics',
  'Standard': 'standard',
  'Classic': 'classic',
  'Revolver': 'revolver',
  'PCC': 'pcc_optics',
  'PCC Optics': 'pcc_optics',
  'PCC Iron': 'pcc_iron',
  'Limited': 'standard',
  'Limited 10': 'standard',
  'L10': 'standard',
  'Single Stack': 'classic',
};

function safeNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function pickFirst(obj: any, ...keys: string[]): any {
  for (const key of keys) {
    if (obj != null && obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

function parsePscScoringMethod(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('virginia')) return 'virginia';
  if (lower.includes('fixed')) return 'fixed_time';
  if (lower.includes('chrono')) return 'chrono';
  return 'comstock';
}

function parsePscDivision(raw: string): string {
  if (!raw) return 'open';
  const upper = raw.trim();
  return PSC_DIVISION_MAP[upper] || upper.toLowerCase();
}

function parsePscPowerFactor(raw: string): PowerFactor {
  const lower = (raw || '').toLowerCase();
  return lower.includes('major') ? 'major' : 'minor';
}

function mapPscMatchType(matchType: string): string {
  return PSC_MATCH_TYPE_MAP[matchType] || 'handgun';
}

function mapPscOrganization(subtype: string): string {
  const lower = (subtype || '').toLowerCase();
  if (lower === 'ipsc') return 'IPSC';
  if (lower === 'uspsa') return 'USPSA';
  return 'IPSC';
}

function generateId(): string {
  return crypto.randomUUID();
}

function decodeTsValue(value: number): DecodedTsHits {
  const raw = Math.max(0, Math.floor(Number(value) || 0));
  return {
    alpha:         (raw >>> 0) & 0xF,
    charlie:       (raw >>> 8) & 0xF,
    delta:         (raw >>> 12) & 0xF,
    no_shoot_hits: (raw >>> 16) & 0xF,
    miss:          (raw >>> 20) & 0xF,
  };
}

interface DecodedTsHits {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
}

function encodeTsValue(hits: DecodedTsHits): number {
  return ((hits.alpha & 0xF) << 0)
       | ((hits.charlie & 0xF) << 8)
       | ((hits.delta & 0xF) << 12)
       | ((hits.no_shoot_hits & 0xF) << 16)
       | ((hits.miss & 0xF) << 20);
}

export function parsePscFiles(matchDef: any, matchScores: any): ParsedPscData {
  const warnings: string[] = [];
  const matchId = generateId();

  const matchName = matchDef.match_name || matchDef.matchName || matchDef.name || 'Imported Match';
  const matchDate = (matchDef.match_date || matchDef.matchDate || matchDef.date || '').toString().slice(0, 10) || new Date().toISOString().slice(0, 10);
  const matchType = matchDef.match_type || '';
  const matchSubtype = matchDef.match_subtype || '';
  const firearmType = mapPscMatchType(matchType);
  const organization = mapPscOrganization(matchSubtype);

  const stages: ImportedStage[] = [];
  const rawStages: any[] = matchDef.match_stages || matchDef.stages || matchDef.match_stage || [];

  for (let i = 0; i < rawStages.length; i++) {
    const s = rawStages[i];

    if (s.stage_deleted === true) {
      warnings.push(`Stage #${pickFirst(s, 'stage_number', 'stageNumber') || i + 1} (${pickFirst(s, 'stage_name', 'stageName', 'name') || 'unnamed'}) is marked deleted — skipping`);
      continue;
    }

    const stageId = generateId();
    const rawStageTargets = s.stage_targets;
    let paperTargets = 0;
    if (Array.isArray(rawStageTargets)) {
      paperTargets = rawStageTargets.filter((t: any) => t?.target_deleted !== true).length;
    } else if (rawStageTargets != null) {
      paperTargets = safeNum(rawStageTargets);
    }
    const poppers = safeNum(pickFirst(s, 'stage_poppers', 'poppers'));
    const plates = safeNum(pickFirst(s, 'stage_plates', 'plates'));
    const steelTargets = poppers + plates;
    const noShootTargets = safeNum(pickFirst(s, 'stage_noshoots', 'stage_no_shoot_targets', 'noShootTargets', 'no_shoots'));
    const hitsPerPaper = 2;
    const minRounds = safeNum(pickFirst(s, 'stage_minrounds', 'stage_min_rounds', 'minRounds', 'min_rounds')) || (paperTargets * hitsPerPaper + steelTargets);
    const maxPoints = safeNum(pickFirst(s, 'stage_maxpoints', 'stage_max_points', 'maxPoints', 'max_points')) || (paperTargets * 10 + steelTargets * 5);
    const scoringRaw = pickFirst(s, 'stage_scoring', 'stage_scoring_method', 'scoring', 'scoringMethod') || '';
    const scoringType = parsePscScoringMethod(scoringRaw);

    const sourceStageNumber = safeNum(pickFirst(s, 'stage_number', 'stageNumber')) || (i + 1);
    stages.push({
      id: stageId,
      stage_number: sourceStageNumber,
      name: pickFirst(s, 'stage_name', 'stageName', 'name') || `Stage ${sourceStageNumber}`,
      scoring_type: scoringType,
      paper_targets: paperTargets,
      steel_targets: steelTargets,
      no_shoot_targets: noShootTargets,
      hits_per_paper: hitsPerPaper,
      min_rounds: minRounds,
      max_points: maxPoints,
    });
  }

  if (stages.length === 0) {
    warnings.push('No stages found in PSC match file');
  }

  const shooterMap = new Map<string, ImportedShooter>();
  const registrationMap = new Map<string, ImportedRegistration>();

  const rawShooters: any[] = matchDef.match_shooters || matchDef.shooters || matchDef.match_shtrs || matchDef.shtrs || [];

  for (let i = 0; i < rawShooters.length; i++) {
    const sh = rawShooters[i];
    const shooterId = pickFirst(sh, 'sh_uuid', 'sh_id', 'uuid', 'id') || generateId();
    const firstName = (pickFirst(sh, 'sh_fn', 'sh_first_name', 'firstName', 'first_name', 'fn') || '').toString();
    const lastName = (pickFirst(sh, 'sh_ln', 'sh_last_name', 'lastName', 'last_name', 'ln') || '').toString();
    const division = parsePscDivision(pickFirst(sh, 'sh_dvp', 'division', 'div') || '');
    const powerFactor = parsePscPowerFactor(pickFirst(sh, 'sh_pf', 'powerFactor', 'power_factor', 'pf') || '');
    const category = (pickFirst(sh, 'sh_ctg', 'category', 'sh_category', 'ctg') || '').toString().toLowerCase().replace(/\s+/g, '_');
    const region = (pickFirst(sh, 'sh_region', 'region', 'country') || '').toString();
    const squad = safeNum(pickFirst(sh, 'sh_sq', 'squad', 'sh_squad'));

    if (!firstName && !lastName) {
      warnings.push(`Shooter entry at index ${i} has empty name — skipping`);
      continue;
    }

    const registrationId = generateId();

    shooterMap.set(shooterId, {
      id: shooterId,
      first_name: firstName || 'Unknown',
      last_name: lastName || `Shooter ${i + 1}`,
      division,
      power_factor: powerFactor,
      category,
      region,
    });

    registrationMap.set(shooterId, {
      id: registrationId,
      shooter_id: shooterId,
      division,
      power_factor: powerFactor,
      category,
      squad: squad > 0 ? squad : null,
      is_dq: false,
      dq_reason: null,
    });
  }

  const scores = matchScores.match_scores || matchScores.scores || [];

  const scoreRows: ImportedStageScore[] = [];
  const targetRows: ImportedTargetScore[] = [];
  let syncedShooters = false;

  for (const stageScore of scores) {
    const stageNumber = safeNum(pickFirst(stageScore, 'stage_number', 'stageNumber'));
    const stageUuid = pickFirst(stageScore, 'stage_uuid', 'stageUuid');
    const memberScores: any[] = stageScore.stage_stagescores || stageScore.stageScores || [];

    const stage = stages.find(s => s.stage_number === stageNumber || s.id === stageUuid);
    if (!stage) {
      warnings.push(`Score for stage #${stageNumber} (${stageUuid}) — stage not found in match_def, skipping`);
      continue;
    }

    for (const ms of memberScores) {
      const shooterUuid = pickFirst(ms, 'shtr', 'shooterId', 'shooter_uuid', 'sh_uuid');
      if (!shooterUuid) {
        warnings.push(`Score entry missing shooter reference (shtr) — skipping`);
        continue;
      }

      if (!registrationMap.has(shooterUuid)) {
        const firstName = `PSC-${shooterUuid.slice(0, 8)}`;
        const lastName = '(synced)';
        shooterMap.set(shooterUuid, {
          id: shooterUuid,
          first_name: firstName,
          last_name: lastName,
          division: 'open',
          power_factor: 'minor',
          category: 'regular',
          region: '',
        });
        registrationMap.set(shooterUuid, {
          id: generateId(),
          shooter_id: shooterUuid,
          division: 'open',
          power_factor: 'minor',
          category: 'regular',
          squad: null,
          is_dq: false,
          dq_reason: null,
        });
        syncedShooters = true;
      }

      const rawpts = safeNum(pickFirst(ms, 'rawpts', 'rawPoints', 'raw_points'));
      const poph = safeNum(pickFirst(ms, 'poph', 'poppersHit', 'poppers_hit', 'steel_hit'));
      const popm = safeNum(pickFirst(ms, 'popm', 'poppersMiss', 'poppers_miss', 'steel_miss'));
      const procCounts: any[] = ms.proc_cnts || ms.proc_counts || ms.proceduralCounts || [];
      let proceduralCount = safeNum(pickFirst(ms, 'proc', 'procedurals', 'procedural', 'procedural_count'));
      if (proceduralCount === 0 && procCounts.length > 0) {
        proceduralCount = procCounts.reduce((sum: number, pc: any) => {
          const val = typeof pc === 'object' ? Object.values(pc)[0] : pc;
          return sum + safeNum(val);
        }, 0);
      }
      const timeArr: number[] = Array.isArray(ms.str) ? ms.str.map(safeNum) : (ms.time ? [safeNum(ms.time)] : []);
      const time = timeArr.length > 0 ? timeArr[0] : 0;
      const totalTime = timeArr.reduce((sum: number, t: number) => sum + t, 0);
      const isDnf = pickFirst(ms, 'aprv', 'approved', 'isApproved') === false || pickFirst(ms, 'dnf', 'is_dnf') === true;

      const scoreId = generateId();

      const tsArray: number[] = ms.ts || [];
      const hasValidTs = Array.isArray(tsArray) && tsArray.length > 0;

      let rawPoints = rawpts;
      let penaltyPoints = 0;
      let netPoints = 0;
      let hf = 0;

      if (hasValidTs) {
        let totalAlpha = 0, totalCharlie = 0, totalDelta = 0;
        let totalPaperMiss = 0, totalPaperNs = 0;

        for (let ti = 0; ti < tsArray.length; ti++) {
          const decoded = decodeTsValue(tsArray[ti]);
          totalAlpha += decoded.alpha;
          totalCharlie += decoded.charlie;
          totalDelta += decoded.delta;
          totalPaperMiss += decoded.miss;
          totalPaperNs += decoded.no_shoot_hits;

          targetRows.push({
            id: generateId(),
            stage_score_id: scoreId,
            target_index: ti + 1,
            target_type: 'paper',
            alpha: decoded.alpha,
            charlie: decoded.charlie,
            delta: decoded.delta,
            miss: decoded.miss,
            no_shoot_hits: decoded.no_shoot_hits,
            steel_hit: null,
          });
        }

        let steelIndex = tsArray.length + 1;
        for (let i = 0; i < poph; i++) {
          targetRows.push({
            id: generateId(),
            stage_score_id: scoreId,
            target_index: steelIndex++,
            target_type: 'steel',
            alpha: 0, charlie: 0, delta: 0,
            miss: 0, no_shoot_hits: 0,
            steel_hit: true,
          });
        }
        for (let i = 0; i < popm; i++) {
          targetRows.push({
            id: generateId(),
            stage_score_id: scoreId,
            target_index: steelIndex++,
            target_type: 'steel',
            alpha: 0, charlie: 0, delta: 0,
            miss: 0, no_shoot_hits: 0,
            steel_hit: false,
          });
        }

        const reg = registrationMap.get(shooterUuid)!;
        // Use calculateScore (the same per-target calculator used by the PUT edit
        // endpoint) instead of calculateAggregatedScore. This ensures imports and
        // re-edits produce identical results.
        const calcResult = calculateScore({
          targets: targetRows.map(t => ({
            target_type: t.target_type,
            alpha: t.alpha,
            charlie: t.charlie,
            delta: t.delta,
            miss: t.miss,
            no_shoot_hits: t.no_shoot_hits,
            steel_hit: t.steel_hit,
            hits_per_paper: stage.hits_per_paper,
          })),
          time,
          procedural_count: proceduralCount,
          ftsa_count: 0,
          extra_shot_count: 0,
          extra_hit_count: 0,
          stacking_count: 0,
          overtime_shot_count: 0,
          scoring_type: stage.scoring_type as any,
          power_factor: reg.power_factor,
        });

        rawPoints = calcResult.raw_points;
        penaltyPoints = calcResult.penalty_points;
        netPoints = Math.max(0, calcResult.net_points);
        hf = calcResult.hit_factor;

        if (rawpts > 0 && Math.abs(calcResult.raw_points - rawpts) > 1) {
          warnings.push(`Stage #${stageNumber}, shooter ${shooterUuid.slice(0, 8)}: PSC rawpts ${rawpts} ≠ recalculated ${calcResult.raw_points} (using recalculated)`);
        }
      } else {
        warnings.push(`Stage #${stageNumber}, shooter ${shooterUuid.slice(0, 8)}: no ts data, hit distribution estimated`);
        if (stage.paper_targets === 0 && stage.paper_targets * stage.hits_per_paper > 0) {
          warnings.push(`Stage #${stageNumber}, shooter ${shooterUuid.slice(0, 8)}: stage has hits but 0 paper targets — data inconsistency`);
        }
        const totalHitsPaper = stage.paper_targets * stage.hits_per_paper;
        const rawPointsFromSteel = poph * 5;
        const rawPointsFromPaper = Math.max(0, rawpts - rawPointsFromSteel);
        const idGen = () => generateId();
        distributedHits(
          rawPointsFromPaper,
          totalHitsPaper,
          stage.paper_targets,
          popm,
          stage.steel_targets,
          poph,
          scoreId,
          targetRows,
          idGen,
        );

        penaltyPoints = proceduralCount * 10 + popm * 10;
        netPoints = Math.max(0, rawpts - penaltyPoints);
        hf = totalTime > 0 ? Math.round((netPoints / totalTime) * 10000) / 10000 : 0;
      }

      const scoreData: any = {
        source: 'practiscore_v2',
        raw: ms,
        aggregated: {
          rawpts,
          poph,
          popm,
          procedural_count: proceduralCount,
          proc_cnts: procCounts,
          time,
          total_time: totalTime,
          str: timeArr,
          ts: ms.ts || [],
        },
      };
      if (hasValidTs) {
        scoreData.decoded = {
          ts: tsArray.map(decodeTsValue),
        };
      }

      scoreRows.push({
        id: scoreId,
        stage_id: stage.id,
        registration_id: registrationMap.get(shooterUuid)!.id,
        time,
        raw_points: rawPoints,
        penalty_points: penaltyPoints,
        net_points: netPoints,
        hit_factor: hf,
        procedural_count: proceduralCount,
        is_dnf: isDnf,
        score_data: scoreData,
        total_time: totalTime || time,
      });
    }
  }

  const registered = new Map<string, ImportedRegistration>();
  for (const [uuid, reg] of registrationMap) {
    registered.set(uuid, reg);
  }

  if (rawShooters.length === 0 && syncedShooters) {
    for (const [uuid] of shooterMap) {
      if (!registered.has(uuid)) {
        registered.set(uuid, registrationMap.get(uuid)!);
      }
    }
  }

  function distributedHits(
    paperPoints: number,
    totalPaperSlots: number,
    paperTargetCount: number,
    steelMissCount: number,
    steelTargetCount: number,
    steelHitCount: number,
    stageScoreId: string,
    targets: ImportedTargetScore[],
    idGen: () => string,
  ) {
    if (totalPaperSlots > 0 && paperTargetCount > 0) {
      const hitsPerTarget = Math.floor(totalPaperSlots / paperTargetCount);
      const extra = totalPaperSlots % paperTargetCount;

      for (let i = 0; i < paperTargetCount; i++) {
        const slots = hitsPerTarget + (i < extra ? 1 : 0);
        targets.push({
          id: idGen(),
          stage_score_id: stageScoreId,
          target_index: i + 1,
          target_type: 'paper',
          alpha: slots,
          charlie: 0,
          delta: 0,
          miss: 0,
          no_shoot_hits: 0,
          steel_hit: null,
        });
      }
    }

    for (let i = 0; i < steelTargetCount; i++) {
      const isHit = i < steelHitCount;
      const isMiss = !isHit && (i < steelHitCount + steelMissCount);
      targets.push({
        id: idGen(),
        stage_score_id: stageScoreId,
        target_index: paperTargetCount + i + 1,
        target_type: 'steel',
        alpha: 0,
        charlie: 0,
        delta: 0,
        miss: isMiss ? 1 : 0,
        no_shoot_hits: 0,
        steel_hit: isHit,
      });
    }
  }

  if (syncedShooters) {
    warnings.push(`${shooterMap.size - rawShooters.length} shooter(s) created from score data only (no shooter list in PSC match_def)`);
  }

  return {
    match: {
      name: matchName,
      date: matchDate,
      organization,
      firearm_type: firearmType,
    },
    stages,
    shooters: [...shooterMap.values()],
    registrations: [...registered.values()],
    stage_scores: scoreRows,
    target_scores: targetRows,
    warnings,
    synced_shooters: syncedShooters,
  };
}

export function buildPscExport(
  match: any,
  stages: any[],
  registrations: any[],
  stageScores: any[],
  targetScores: any[],
): PscExportData {
  const matchUuid = match.id;
  const deviceUdid = crypto.randomUUID();

  const matchDef: any = {
    device_model: 'Web',
    app_version: 'IPSCScore',
    os_version: 'Web',
    match_id: matchUuid,
    match_name: match.name,
    match_type: 'uspsa_p',
    match_subtype: match.organization?.toLowerCase() === 'uspsa' ? 'uspsa' : 'ipsc',
    match_usemaxstagetime: false,
    match_meta: [
      { k: 'classifiers', v: 'https://ipscresults.org/Images/stages', t: '2020-11-01 00:00:00.000' },
      { k: 'library', v: 'library_ipsc', t: '2025-07-01 00:00:00.000' },
    ],
    match_docs: [
      { url: 'https://drive.usercontent.google.com/download?id=1puySH1bSKuQdzdxUfB_uUbB5krOKzScZ', name: 'IPSC Handgun', file: '2025_IPSC_RulesHandgun.pdf', type: 'rules', chksum: '536cb692decf46c0122a8fd650ae53858a65ed99' },
      { url: 'https://www.ipsc.org/production-division-list/', name: 'IPSC Production Division List', type: 'prodlist' },
    ],
    match_pointsdownvalue: 1.0,
    match_steelmisspdcount: 0,
    match_maxteamresults: 3,
    match_secure: false,
    match_level: match.match_level || 'L1',
    match_date: match.date instanceof Date
      ? match.date.toISOString().slice(0, 10)
      : (match.date || '').toString().slice(0, 10),
    match_creationdate: new Date().toISOString().replace('T', ' ').slice(0, 23),
    match_modifieddate: new Date(Date.now() + 1000).toISOString().replace('T', ' ').slice(0, 23),
    match_penalties: [],
    match_bonuses: [],
    match_cats: ['Open', 'Production', 'Production Optics', 'Optics', 'Standard', 'Classic', 'Revolver', 'PCC Optics', 'PCC Iron'],
    match_cls: ['U', 'D', 'C', 'B', 'A', 'M', 'G'],
    match_ctgs: '["Grand Junior","Lady Grand Junior","Super Junior","Lady Super Junior","Junior","Lady Junior","Lady","Senior","Lady Senior","Super Senior","Grand Senior","regular"]',
    match_chkins: ['Checked in', 'Paid', 'Staff', 'RO'],
    match_procs: [
      { 'uuid': 'EQRTwQ', 'name': '10.2.7 Failure to engage target' },
      { 'uuid': 'v9pLTA', 'name': '2.2.1.5 Shortcut outside shooting area' },
      { 'uuid': 's8g7Dn', 'name': '10.2.1 Shooting while beyond a Fault Line' },
      { 'uuid': 's8g7Dm', 'name': '10.2.1.1 Shooting while beyond a Fault Line (per shot)' },
      { 'uuid': '7wTzBw', 'name': '10.2.2 Fail to comply with WSB' },
      { 'uuid': '8wTzB1', 'name': '10.2.2 Fail to comply with WSB (per shot)' },
      { 'uuid': 'jkaZwk', 'name': '10.2.4 Failure to reload (per shot)' },
      { 'uuid': 'kddJxe', 'name': '10.2.5 Cooper Tunnel' },
      { 'uuid': 'whF4jn', 'name': '10.2.8 SHO/WHO touching the handgun with the other hand' },
      { 'uuid': '6gWqZ7', 'name': '10.2.8.1 SHO/WHO support the handgun while shooting (per shot)' },
      { 'uuid': 'dg5MRS', 'name': '10.2.8.2 SHO/WHO increase stability while shooting (per shot)' },
      { 'uuid': 'xdnYza', 'name': '10.2.11 Shots over a barrier 1.8m tall (per shot)' },
      { 'uuid': 'WEkBf8', 'name': '8.6.2 Assisting competitor' },
      { 'uuid': 'bJQy4F', 'name': '8.7.2 Sighting aid during walkthrough' },
      { 'uuid': 'eWtfmL', 'name': '10.2.9 Prohibited action (per shot)' },
      { 'uuid': 'eWtfmK', 'name': '4.6.1 Rearrangement of stage equipment' },
      { 'uuid': 'HsjtM2', 'name': '9.9.2 Miss on non-activated disappearing target' },
      { 'uuid': 'GuAaQu', 'name': 'A.D4.17/A.D4a.17 Production/PO - first shot must be DA' },
      { 'uuid': 'GsjtMt', 'name': '8.7.1 Sight picture and/or dry firing (after a warning)' },
      { 'uuid': 'uBTRY2', 'name': '9.1.1 Approaching targets (after a warning)' },
      { 'uuid': 'HkvzTR', 'name': '10.2.6 Creeping prior Start Signal (after a warning)' },
      { 'uuid': 'ebYfyV', 'name': '8.7.1.1 PCC - Sight picture with unloaded firearm (after a warning)' },
      { 'uuid': '7x3MQr', 'name': '8.7.1.2 PCC - Testing target sequence' },
      { 'uuid': 'BeMf4a', 'name': '5.2.2 Handling without permission (DQ 10.5.1)', 'warn': true },
      { 'uuid': 'x2TVQ1', 'name': '6.2.5.1 Distance from the body (to Open or no score)', 'warn': true },
      { 'uuid': 'x2TVQF', 'name': '8.7.1 Sight picture and/or dry firing (Procedural)', 'warn': true },
      { 'uuid': 'BgXQGK', 'name': '9.1.1 Approaching targets during scoring (Procedural)', 'warn': true },
      { 'uuid': 'R8cMDc', 'name': '10.2.6 Creeping after the Standby command (Procedural)', 'warn': true },
      { 'uuid': '5mRLuR', 'name': '5.2.1.2 Non-empty magwell or cocked handgun (DQ 10.6.1)', 'warn': true },
      { 'uuid': '7NeDtm', 'name': '8.3.1.1 Moving away from the start location (DQ 10.6.1)', 'warn': true },
      { 'uuid': 'zLG6ev', 'name': '8.7.3 Unauthorized presence on stage (DQ 10.6)', 'warn': true },
      { 'uuid': 'XXTzeE', 'name': '9.7.8 Unauthorized handling of score sheets (DQ 10.6)', 'warn': true },
      { 'uuid': 'xdNYz1', 'name': '5.2.1 PCC - Carry and storage (DQ 10.5.1)', 'warn': true },
      { 'uuid': '5mRLu1', 'name': '5.2.1.2 PCC - Ammo on the gun (DQ 10.6.1)', 'warn': true },
      { 'uuid': 'x2TVQ2', 'name': '8.7.1.1 PCC - Sight picture with unloaded firearm (Procedural)', 'warn': true },
      { 'uuid': 'x2TVQ3', 'name': '8.7.1.2 PCC - Testing target sequence (Procedural)', 'warn': true },
      { 'uuid': 'xdnYz2', 'name': '10.2.12 PCC - Using full auto (DQ)', 'warn': true },
    ],
    match_stages: [],
    match_shooters: [],
  };

  for (const stage of stages) {
    const stageTargets = Array.from(
      { length: stage.paper_targets || 0 },
      (_: unknown, i: number) => ({
        target_number: i + 1,
        target_reqshots: 2,
      }),
    );
    matchDef.match_stages.push({
      stage_uuid: stage.id,
      stage_number: Number(stage.stage_number),
      stage_name: stage.name,
      stage_targets: stageTargets,
      stage_poppers: stage.steel_targets,
      stage_noshoots: stage.no_shoot_targets,
      stage_strings: 1,
      stage_deleted: false,
      stage_classifier: false,
      stage_modified: false,
    });
  }

  const shooterSeen = new Set<string>();
  const pscShooters: any[] = [];

  for (const reg of registrations) {
    const shooterKey = reg.shooter_id || reg.shooter?.id;
    if (!shooterKey || shooterSeen.has(shooterKey)) continue;
    shooterSeen.add(shooterKey);

    const division = reg.division_override || reg.shooter?.division || reg.division || '';
    const invDivMap: Record<string, string> = {
      'open': 'Open',
      'standard': 'Standard',
      'production': 'Production',
      'production_optics': 'Production Optics',
      'classic': 'Classic',
      'revolver': 'Revolver',
      'pcc_optics': 'PCC Optics',
      'pcc_iron': 'PCC Iron',
    };

    pscShooters.push({
      sh_uuid: shooterKey,
      sh_fn: reg.shooter?.first_name || '',
      sh_ln: reg.shooter?.last_name || '',
      sh_dvp: invDivMap[division] || division,
      sh_pf: (reg.power_factor_override || reg.shooter?.power_factor || 'minor') === 'major' ? 'Major' : 'Minor',
      sh_grd: 'U',
      sh_ctg: reg.category_override || reg.shooter?.category || '',
      sh_sq: reg.squad || 0,
    });
  }
  matchDef.match_shooters = pscShooters;

  const pscMatchScores: any[] = [];
  const stageMap = new Map(stages.map((s: any) => [s.id, s]));

  const scoresByStage = new Map<string, any[]>();
  for (const ss of stageScores) {
    if (!scoresByStage.has(ss.stage_id)) scoresByStage.set(ss.stage_id, []);
    scoresByStage.get(ss.stage_id)!.push(ss);
  }

  for (const stage of stages) {
    const stageScoresArr = scoresByStage.get(stage.id) || [];
    const pscStageScores: any[] = [];

    for (const ss of stageScoresArr) {
      const reg = registrations.find((r: any) => r.id === ss.registration_id);
      if (!reg) continue;

      const poph = targetScores
        .filter((t: any) => t.stage_score_id === ss.id && t.target_type === 'steel' && t.steel_hit === true)
        .length;
      const popm = targetScores
        .filter((t: any) => t.stage_score_id === ss.id && t.target_type === 'steel' && t.steel_hit === false)
        .length;

      const paperTargetRows = targetScores
        .filter((t: any) => t.stage_score_id === ss.id && t.target_type === 'paper')
        .sort((a: any, b: any) => a.target_index - b.target_index);

      const ts = paperTargetRows.map((t: any) => encodeTsValue({
        alpha: t.alpha || 0,
        charlie: t.charlie || 0,
        delta: t.delta || 0,
        miss: t.miss || 0,
        no_shoot_hits: t.no_shoot_hits || 0,
      }));

      const shooterId = reg.shooter_id || reg.shooter?.id;
      const mod = new Date(Date.now() + pscStageScores.length * 10).toISOString().replace('T', ' ').slice(0, 23);

      const scoreEntry: any = {
        shtr: shooterId,
        mod,
        popm,
        poph,
        ...(ss.procedural_count > 0 ? { proc: ss.procedural_count, proc_cnts: [{ 'EQRTwQ': ss.procedural_count }] } : {}),
        rawpts: Number(ss.raw_points || ss.net_points || 0),
        str: [Number(ss.time || 0)],
        ...(ts.length > 0 ? { ts } : {}),
        aprv: !ss.is_dnf,
        udid: deviceUdid,
        dname: 'IPSCScore Web ' + deviceUdid.slice(-8),
      };

      pscStageScores.push(scoreEntry);
    }

    pscMatchScores.push({
      stage_number: String(stage.stage_number),
      stage_uuid: stage.id,
      stage_stagescores: pscStageScores,
    });
  }

  const matchScores = {
    match_id: matchUuid,
    match_scores: pscMatchScores,
    match_scores_history: {},
  };

  return { match_def: matchDef, match_scores: matchScores };
}
