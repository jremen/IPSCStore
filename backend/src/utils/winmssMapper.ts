/**
 * WinMSS Database Mapper
 *
 * Maps WinMSS .mdb table/column names to IPSCScore data model.
 * WinMSS table names and column names vary between versions, so this
 * module dynamically discovers tables and maps columns by trying
 * multiple naming conventions.
 */

// ── Division Mapping ──────────────────────────────────────────────────
// WinMSS uses integer TypeDivisionId, IPSCScore uses string division names
// These are default mappings — the tblTypeDivision table may override them
export const WINMSS_DIVISION_MAP: Record<number, string> = {
  1: 'open',
  2: 'standard',
  3: 'modified',       // WinMSS id 3 = Modified (not used in IPSCScore, map to open)
  4: 'production',
  5: 'revolver',
  18: 'classic',
  24: 'production_optics',
};

// ── Category Mapping ──────────────────────────────────────────────────
// WinMSS uses integer TypeCategoryId
// These are default mappings — the tblTypeCategory table may override them
export const WINMSS_CATEGORY_MAP: Record<number, string> = {
  1: 'regular',
  2: 'lady',
  3: 'junior',
  4: 'senior',
  5: 'super_senior',
};

// ── Power Factor Mapping ──────────────────────────────────────────────
export const WINMSS_POWER_FACTOR_MAP: Record<number, string> = {
  1: 'major',
  2: 'minor',
};

// ── Firearm Type Mapping ──────────────────────────────────────────────
export const WINMSS_FIREARM_MAP: Record<number, string> = {
  1: 'handgun',
  2: 'rifle',
  3: 'shotgun',
  4: 'pcc',           // WinMSS PCC → IPSCScore pcc (no pcc_optics/pcc_iron distinction)
};

// ── Table Discovery ───────────────────────────────────────────────────
// WinMSS table names by purpose, with multiple naming variants
export const TABLE_ALIASES: Record<string, string[]> = {
  match: ['tblMatch', 'Match', 'Matches', 'Competitions'],
  stage: ['tblMatchStage', 'tblStage', 'MatchStage', 'Stages'],
  member: ['tblMember', 'Member', 'Members', 'Shooters', 'Competitors'],
  competitor: ['tblMatchCompetitor', 'tblCompetitor', 'MatchCompetitor', 'Competitors', 'Registrations'],
  score: ['tblMatchStageScore', 'tblStageScore', 'MatchStageScore', 'Scores', 'StageScores'],
  division: ['tblTypeDivision', 'TypeDivision', 'Divisions', 'tblDivision'],
  category: ['tblTypeCategory', 'TypeCategory', 'Categories', 'tblCategory'],
  powerFactor: ['tblTypePowerFactor', 'TypePowerFactor', 'PowerFactors', 'tblPowerFactor'],
  stdStageSetup: ['tblTypeStdStageSetup', 'TypeStdStageSetup', 'StdStageSetup'],
  tag: ['tblTag', 'Tag', 'Tags', 'MemberTags'],
  region: ['tblTypeRegion', 'tblRegion', 'TypeRegion', 'Regions', 'tblTypeRegions'],
};

/**
 * Find a table in the MDB reader by trying known aliases.
 * Returns the actual table name found, or null if none match.
 */
export function findTable(readerTableNames: string[], purpose: string): string | null {
  const aliases = TABLE_ALIASES[purpose];
  if (!aliases) return null;

  // Case-insensitive match
  const lowerNames = readerTableNames.map(n => n.toLowerCase());
  for (const alias of aliases) {
    const idx = lowerNames.indexOf(alias.toLowerCase());
    if (idx >= 0) return readerTableNames[idx];
  }
  return null;
}

// ── Column Mapping ────────────────────────────────────────────────────
// For each IPSCScore field, list possible WinMSS column names (case-insensitive)
export const COLUMN_ALIASES: Record<string, string[]> = {
  // Match fields
  matchName: ['MatchName', 'Match_Title', 'Name', 'Title', 'MatchTitle'],
  matchDate: ['MatchDt', 'MatchDate', 'Date', 'MatchDtStart', 'StartDate'],
  matchFirearmType: ['TypeFirearmId', 'FirearmType', 'FirearmTypeId'],
  matchId: ['MatchId', 'Id', 'ID'],

  // Stage fields
  stageId: ['StageId', 'StageNum', 'StageNumber'],
  stageName: ['StageName', 'Stage_Name', 'Name', 'Title'],
  stagePaperTargets: ['TrgtPaper', 'PaperTargets', 'Paper', 'NumPaper', 'TargetCount'],
  stageSteelTargets: ['TrgtPopper', 'SteelTargets', 'Popper', 'NumSteel', 'TrgtSteel', 'TrgtPopperPlate', 'PopperCount'],
  stagePlateTargets: ['TrgtPlates', 'Plates', 'NumPlates', 'PlateCount'],
  stageNoShootTargets: ['TrgtPenalty', 'NoShootTargets', 'PenaltyTargets', 'NumPenalty', 'NoShoot', 'Penalty'],
  stageMinRounds: ['MinRounds', 'MinRoundCount', 'MinimumRounds', 'MinRds'],
  stageScoringType: ['ScoringType', 'TypeStageScoringId', 'StageScoringType'],
  stageMatchId: ['MatchId', 'Match_Id'],

  // Member/Shooter fields
  memberId: ['MemberId', 'ShooterId', 'CompetitorId', 'ID'],
  firstName: ['Firstname', 'FirstName', 'First_Name', 'FName', 'NameFirst', 'GivenName'],
  lastName: ['Lastname', 'LastName', 'Last_Name', 'LName', 'NameLast', 'Surname', 'FamilyName'],
  region: ['Region', 'State', 'Country', 'NatCode'],
  club: ['Club', 'ClubName', 'ClubId'],
  shooterDivision: ['TypeDivisionId', 'DivisionId', 'Division'],
  shooterCategory: ['TypeCategoryId', 'CategoryId', 'Category'],
  shooterPowerFactor: ['TypePowerFactorId', 'PowerFactorId', 'PowerFactor', 'PF'],
  shooterFirearmType: ['TypeFirearmId', 'FirearmType'],
  shooterTag: ['MemberNumber', 'MemberNum', 'ShooterNumber', 'ShooterNum', 'Number', 'RegNumber', 'RegNum', 'IPSCNumber', 'IPSCNum', 'LicenseNumber', 'LicNum'],
  shooterEmail: ['Email', 'EmailAddress', 'EMail'],

  // Competitor/Registration fields
  competitorMemberId: ['MemberId', 'ShooterId', 'CompetitorId'],
  competitorMatchId: ['MatchId', 'Match_Id'],
  competitorDivision: ['TypeDivisionId', 'DivisionId', 'Division'],
  competitorCategory: ['TypeCategoryId', 'CategoryId', 'Category'],
  competitorPowerFactor: ['TypePowerFactorId', 'PowerFactorId', 'PowerFactor', 'PF'],
  competitorDq: ['IsDisqualified', 'Disqualified', 'DQ', 'IsDQ'],
  competitorFailedPf: ['FailedPowerFactor', 'FailedPF', 'PF_Failed'],
  competitorSquad: ['Squad', 'SquadNumber', 'SquadNum'],

  // Score fields (tblMatchStageScore)
  scoreMemberId: ['MemberId', 'ShooterId', 'CompetitorId', 'ID'],
  scoreStageId: ['StageId', 'StageNum', 'StageNumber'],
  scoreMatchId: ['MatchId', 'MatchID', 'Match_Id'],
  scoreAlpha: ['ScoreA', 'AHits', 'aHits', 'Alpha', 'AlphaHits', 'A', 'HitsA'],
  scoreBravo: ['ScoreB', 'BHits', 'bHits', 'Bravo', 'BravoHits', 'B', 'HitsB'],
  scoreCharlie: ['ScoreC', 'CHits', 'cHits', 'Charlie', 'CharlieHits', 'C', 'HitsC'],
  scoreDelta: ['ScoreD', 'DHits', 'dHits', 'Delta', 'DeltaHits', 'D', 'HitsD'],
  scoreMiss: ['Misses', 'Miss', 'M', 'MissCount'],
  scoreNoShoot: ['Penalties', 'NSHits', 'NoShootHits', 'NoShoot', 'NS', 'Penalty', 'NoShootCount'],
  scoreProcedural: ['Procedurals', 'Procedural', 'Proc', 'ProceduralCount', 'ProcCount'],
  scoreTime: ['Time', 'StageTime', 'ShootTime', 'ElapsedTime'],
  scoreDnf: ['ScoresZeroedForStage', 'Zeroed', 'IsDNF', 'DNF', 'ScoreZeroed'],
  scoreDq: ['Disqualified', 'DQ', 'IsDQ', 'IsDisqualified'],
  scoreHitFactor: ['HitFactor', 'HF', 'HitFactorScore'],
  scoreFTSA: ['FTSA', 'FtsaCount', 'FtSa', 'FirstTarget', 'FirstShot', 'Ftsa', 'FTSACount'],

  // Division/Category lookup tables
  divisionId: ['TypeDivisionId', 'DivisionId', 'Id', 'ID'],
  divisionName: ['DivisionName', 'Division', 'Name', 'ShortName'],
  categoryId: ['TypeCategoryId', 'CategoryId', 'Id', 'ID'],
  categoryName: ['CategoryName', 'Category', 'Name', 'ShortName'],
  powerFactorId: ['TypePowerFactorId', 'PowerFactorId', 'Id', 'ID'],
  powerFactorName: ['PowerFactorName', 'PowerFactor', 'Name', 'ShortName', 'PFName'],

  // Tag table columns (for tblTag lookup)
  tagId: ['TagId', 'Id', 'ID', 'TagID'],
  tagValue: ['Tag', 'TagNumber', 'Number', 'Code', 'Value'],
  // Region table columns (for tblTypeRegion lookup)
  regionId: ['TypeRegionId', 'RegionId', 'Id', 'ID', 'RegionID'],
  regionName: ['Region', 'Code', 'RegionCode', 'ShortName', 'Name'],
  // Member DfltTagId column (FK to tblTag)
  memberDfltTagId: ['DfltTagId', 'DefaultTagId', 'TagId', 'DfltTagID'],
};

/**
 * Find a column value from a row by trying known aliases.
 * Case-insensitive column matching, with fuzzy pattern fallback.
 */
export function findColumn(row: Record<string, any>, field: string): any {
  const aliases = COLUMN_ALIASES[field];
  if (!aliases) return undefined;

  const keys = Object.keys(row);
  const lowerKeys = keys.map(k => k.toLowerCase());

  // 1. Exact alias match (case-insensitive)
  for (const alias of aliases) {
    const idx = lowerKeys.indexOf(alias.toLowerCase());
    if (idx >= 0) {
      return row[keys[idx]];
    }
  }

  // 2. Fuzzy: check if any column name contains the alias as a substring
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase();
    for (let i = 0; i < lowerKeys.length; i++) {
      if (lowerKeys[i].includes(lowerAlias) || lowerAlias.includes(lowerKeys[i])) {
        return row[keys[i]];
      }
    }
  }

  return undefined;
}

/**
 * Dump all column names and values from a row for debugging.
 * Returns a formatted string of key=value pairs.
 */
export function dumpRow(row: Record<string, any>): string {
  return Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', ');
}

/**
 * Build lookup maps from WinMSS type tables (division, category, power factor).
 * These allow us to map IDs → IPSCScore string values dynamically.
 */
export function buildDivisionLookup(rows: Record<string, any>[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(findColumn(row, 'divisionId'));
    const name = String(findColumn(row, 'divisionName') || '').trim().toLowerCase();
    if (!id || !name) continue;
    // Map common WinMSS division names to IPSCScore values
    const mapped = mapDivisionNameToId(name);
    if (mapped) map.set(id, mapped);
  }
  return map;
}

export function buildCategoryLookup(rows: Record<string, any>[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(findColumn(row, 'categoryId'));
    const name = String(findColumn(row, 'categoryName') || '').trim().toLowerCase();
    if (!id || !name) continue;
    const mapped = mapCategoryName(name);
    if (mapped) map.set(id, mapped);
  }
  return map;
}

export function buildPowerFactorLookup(rows: Record<string, any>[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(findColumn(row, 'powerFactorId'));
    const name = String(findColumn(row, 'powerFactorName') || '').trim().toLowerCase();
    if (!id || !name) continue;
    if (name.includes('major')) map.set(id, 'major');
    else if (name.includes('minor')) map.set(id, 'minor');
  }
  return map;
}

export function buildTagLookup(rows: Record<string, any>[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(findColumn(row, 'tagId'));
    const value = String(findColumn(row, 'tagValue') || '').trim();
    if (!id || !value) continue;
    map.set(id, value);
  }
  return map;
}

export function buildRegionLookup(rows: Record<string, any>[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(findColumn(row, 'regionId'));
    const name = String(findColumn(row, 'regionName') || '').trim();
    if (!id || !name) continue;
    map.set(id, name);
  }
  return map;
}

/**
 * Map a division name string to IPSCScore division value.
 */
function mapDivisionNameToId(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (lower.includes('open') || lower.includes('standard') && lower.includes('open')) return 'open';
  if (lower === 'standard' || lower === 'std') return 'standard';
  if (lower.includes('production') && lower.includes('optics')) return 'production_optics';
  if (lower.includes('production') || lower.includes('prod')) return 'production';
  if (lower.includes('classic')) return 'classic';
  if (lower.includes('revolver') || lower.includes('rev')) return 'revolver';
  if (lower.includes('modified') || lower === 'mod') return 'open'; // Modified → Open in IPSCScore
  return null;
}

/**
 * Map a category name string to IPSCScore category value.
 */
function mapCategoryName(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (lower.includes('lady') || lower.includes('women') || lower.includes('female')) return 'lady';
  if (lower.includes('super senior') || lower.includes('super_senior') || lower === 'ss') return 'super_senior';
  if (lower.includes('senior') || lower === 's') return 'senior';
  if (lower.includes('junior') || lower === 'j') return 'junior';
  if (lower.includes('regular') || lower.includes('general') || lower === 'r' || lower === 'open') return 'regular';
  return null;
}

/**
 * Map a WinMSS division ID to IPSCScore division string.
 * Uses the lookup map if available, falls back to hardcoded map, then to 'production'.
 */
export function mapDivision(
  typeDivisionId: number | string | undefined,
  lookup?: Map<number, string>
): string {
  if (typeDivisionId === undefined || typeDivisionId === null) return 'production';
  const id = typeof typeDivisionId === 'string' ? parseInt(typeDivisionId, 10) : typeDivisionId;
  // Try dynamic lookup first
  if (lookup && lookup.has(id)) return lookup.get(id)!;
  // Fall back to hardcoded map
  return WINMSS_DIVISION_MAP[id] || 'production';
}

/**
 * Map a WinMSS category ID to IPSCScore category string.
 * Uses the lookup map if available, falls back to hardcoded map, then to 'regular'.
 */
export function mapCategory(
  typeCategoryId: number | string | undefined,
  lookup?: Map<number, string>
): string {
  if (typeCategoryId === undefined || typeCategoryId === null) return 'regular';
  const id = typeof typeCategoryId === 'string' ? parseInt(typeCategoryId, 10) : typeCategoryId;
  // Try dynamic lookup first
  if (lookup && lookup.has(id)) return lookup.get(id)!;
  // Fall back to hardcoded map
  return WINMSS_CATEGORY_MAP[id] || 'regular';
}

/**
 * Map a WinMSS power factor ID to IPSCScore power factor string.
 */
export function mapPowerFactor(
  typePFId: number | string | undefined,
  lookup?: Map<number, string>
): string {
  if (typePFId === undefined || typePFId === null) return 'minor';
  const id = typeof typePFId === 'string' ? parseInt(typePFId, 10) : typePFId;
  if (lookup && lookup.has(id)) return lookup.get(id)!;
  return WINMSS_POWER_FACTOR_MAP[id] || 'minor';
}

/**
 * Map a WinMSS region value to IPSCScore region string.
 * Handles both numeric TypeRegionId values (resolved via lookup) and
 * string region codes (like "SVK") that are already in the correct format.
 */
export function mapRegion(
  regionValue: number | string | undefined,
  lookup?: Map<number, string>
): string {
  if (regionValue === undefined || regionValue === null) return '';
  // If it's a numeric ID (or a string that's purely digits), resolve via lookup
  if (typeof regionValue === 'number' || (typeof regionValue === 'string' && /^\d+$/.test(regionValue))) {
    const id = typeof regionValue === 'string' ? parseInt(regionValue, 10) : regionValue;
    if (lookup && lookup.has(id)) return lookup.get(id)!;
    return ''; // Unknown region ID without lookup
  }
  // Already a string region code like "SVK"
  return String(regionValue).trim();
}

/**
 * Map a WinMSS firearm type ID to IPSCScore firearm type string.
 */
export function mapFirearmType(typeFirearmId: number | string | undefined): string {
  if (typeFirearmId === undefined || typeFirearmId === null) return 'handgun';
  const id = typeof typeFirearmId === 'string' ? parseInt(typeFirearmId, 10) : typeFirearmId;
  return WINMSS_FIREARM_MAP[id] || 'handgun';
}

/**
 * Determine scoring type from WinMSS stage data.
 */
export function inferScoringType(stage: {
  paperTargets?: number;
  steelTargets?: number;
  minRounds?: number;
  parTime?: number | null;
  scoringTypeId?: number | string | null;
}): 'comstock' | 'virginia' | 'fixed_time' | 'chrono' {
  // WinMSS scoring type IDs: 1=Comstock, 2=Virginia Count, 3=Fixed Time, 4=Chrono
  const stId = stage.scoringTypeId;
  if (stId !== undefined && stId !== null) {
    const id = typeof stId === 'string' ? parseInt(stId, 10) : stId;
    if (id === 1) return 'comstock';
    if (id === 2) return 'virginia';
    if (id === 3) return 'fixed_time';
    if (id === 4) return 'chrono';
  }
  // Fallback: infer from stage data
  if (stage.parTime && stage.parTime > 0) return 'fixed_time';
  return 'comstock';
}

/**
 * Hits per paper target — always 2 for IPSC/USPSA/IDPA paper targets.
 * Steel targets are always 1 hit. No calculation needed.
 */
export function inferHitsPerPaper(): number {
  return 2;
}

/**
 * Extract a tag/identifier from member row.
 * Tries multiple WinMSS columns that could hold a shooter number/tag.
 * For DfltTagId-based resolution, use buildTagLookup + findColumn(row, 'memberDfltTagId').
 */
export function extractTag(row: Record<string, any>): string | null {
  const tag = findColumn(row, 'shooterTag');
  if (tag) return String(tag).trim();
  return null;
}