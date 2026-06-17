export const CATEGORIES = [
  { value: 'regular', i18nKey: 'categories.regular' },
  { value: 'junior', i18nKey: 'categories.junior' },
  { value: 'senior', i18nKey: 'categories.senior' },
  { value: 'super_senior', i18nKey: 'categories.superSenior' },
  { value: 'lady', i18nKey: 'categories.lady' },
] as const;

export const DIVISIONS = [
  // IPSC
  { value: 'standard', label: 'Standard', group: 'IPSC' },
  { value: 'open', label: 'Open', group: 'IPSC' },
  { value: 'production', label: 'Production', group: 'IPSC' },
  { value: 'production_optics', label: 'Production Optics', group: 'IPSC' },
  { value: 'optics', label: 'Optics', group: 'IPSC' },
  { value: 'classic', label: 'Classic', group: 'IPSC' },
  { value: 'revolver', label: 'Revolver', group: 'IPSC' },
  { value: 'pcc_optics', label: 'PCC Optics', group: 'IPSC' },
  { value: 'pcc_iron', label: 'PCC Iron', group: 'IPSC' },
  // USPSA
  { value: 'limited', label: 'Limited', group: 'USPSA' },
  { value: 'limited_optics', label: 'Limited Optics', group: 'USPSA' },
  { value: 'carry_optics', label: 'Carry Optics', group: 'USPSA' },
  { value: 'single_stack', label: 'Single Stack', group: 'USPSA' },
  // IDPA
  { value: 'ssp', label: 'SSP', group: 'IDPA' },
  { value: 'esp', label: 'ESP', group: 'IDPA' },
  { value: 'cdp', label: 'CDP', group: 'IDPA' },
  { value: 'ccp', label: 'CCP', group: 'IDPA' },
  { value: 'bug', label: 'BUG', group: 'IDPA' },
  { value: 'revolver_idpa', label: 'Revolver', group: 'IDPA' },
  // 3-Gun
  { value: 'tactical', label: 'Tactical', group: '3-Gun' },
  { value: 'open_3gun', label: 'Open', group: '3-Gun' },
  { value: 'heavy', label: 'Heavy', group: '3-Gun' },
  // PRS
  { value: 'open_prs', label: 'Open', group: 'PRS' },
  { value: 'production_prs', label: 'Production', group: 'PRS' },
  // NRL22
  { value: 'any', label: 'Any', group: 'NRL22' },
  { value: 'irons', label: 'Irons', group: 'NRL22' },
  { value: 'open_22', label: 'Open', group: 'NRL22' },
  // Bullseye
  { value: 'conventional', label: 'Conventional', group: 'Bullseye' },
  { value: 'international', label: 'International', group: 'Bullseye' },
] as const;

/** Map organization to its applicable division values */
export const ORGANIZATION_DIVISIONS: Record<string, string[]> = {
  IPSC: ['standard', 'open', 'production', 'production_optics', 'optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron'],
  USPSA: ['open', 'limited', 'limited_optics', 'carry_optics', 'production', 'single_stack', 'revolver', 'pcc_optics', 'pcc_iron'],
  IDPA: ['ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa'],
  '3GUN': ['tactical', 'open_3gun', 'heavy'],
  PRS: ['open_prs', 'production_prs'],
  NRL22: ['any', 'irons', 'open_22'],
  NRA: ['conventional', 'international'],
  USA_ARCHERY: [],
};

/** Get divisions filtered by organization. Returns all if org is undefined. */
export function getDivisionsForOrganization(org: string | undefined) {
  if (!org) return DIVISIONS;
  const allowed = ORGANIZATION_DIVISIONS[org];
  if (!allowed) return DIVISIONS;
  return DIVISIONS.filter(d => allowed.includes(d.value));
}

/** Get divisions grouped by organization for optgroup rendering.
 *  Used when no single organization is selected — groups duplicates like
 *  "Open (IPSC)" vs "Open (3-Gun)" under labeled headings. */
export function getGroupedDivisions(): { group: string; divisions: typeof DIVISIONS[number][] }[] {
  const groups: Record<string, typeof DIVISIONS[number][]> = {};
  for (const d of DIVISIONS) {
    const g = d.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push(d);
  }
  // Return in a stable order matching DIVISIONS definition
  const seen = new Set<string>();
  const result: { group: string; divisions: typeof DIVISIONS[number][] }[] = [];
  for (const d of DIVISIONS) {
    if (!seen.has(d.group)) {
      seen.add(d.group);
      result.push({ group: d.group, divisions: groups[d.group] });
    }
  }
  return result;
}

export const POWER_FACTORS = [
  { value: 'minor', i18nKey: 'powerFactors.minor' },
  { value: 'major', i18nKey: 'powerFactors.major' },
] as const;

export const ORGANIZATIONS = [
  { value: 'IPSC', i18nKey: 'organizations.ipsc' },
  { value: 'USPSA', i18nKey: 'organizations.uspsa' },
  { value: 'IDPA', i18nKey: 'organizations.idpa' },
  { value: '3GUN', i18nKey: 'organizations.threeGun' },
  { value: 'NRL22', i18nKey: 'organizations.nrl22' },
  { value: 'PRS', i18nKey: 'organizations.prs' },
  { value: 'NRA', i18nKey: 'organizations.nra' },
  { value: 'USA_ARCHERY', i18nKey: 'organizations.usaArchery' },
] as const;

export const FIREARM_TYPES = [
  { value: 'handgun', i18nKey: 'firearmTypes.handgun' },
  { value: 'rifle', i18nKey: 'firearmTypes.rifle' },
  { value: 'pcc', i18nKey: 'firearmTypes.pcc' },
  { value: 'shotgun', i18nKey: 'firearmTypes.shotgun' },
  { value: 'combined', i18nKey: 'firearmTypes.combined' },
  { value: 'bow', i18nKey: 'firearmTypes.bow' },
] as const;

/** Match level 1-5. Canonical English labels (do not translate — see CLAUDE.md). */
export const MATCH_LEVELS = [
  { value: 1, label: 'Level 1' },
  { value: 2, label: 'Level 2' },
  { value: 3, label: 'Level 3' },
  { value: 4, label: 'Level 4' },
  { value: 5, label: 'Level 5' },
] as const;

/** Common IPSC/USPSA disqualification reasons. Translated via i18n (dqReasons.* keys).
 *  The selected reason is stored as the translated text string (matches existing free-text
 *  storage in `match_registrations.dq_reason`), so prior data and WinMSS imports remain valid. */
export const DQ_REASONS = [
  { value: 'unsafe_gun_handling', i18nKey: 'dqReasons.unsafeGunHandling' },
  { value: 'breaking_180_rule', i18nKey: 'dqReasons.breaking180Rule' },
  { value: 'failure_to_follow_procedure', i18nKey: 'dqReasons.failureToFollowProcedure' },
  { value: 'premature_shot', i18nKey: 'dqReasons.prematureShot' },
  { value: 'dropped_gun', i18nKey: 'dqReasons.droppedGun' },
  { value: 'disruptive_behavior', i18nKey: 'dqReasons.disruptiveBehavior' },
  { value: 'unsportsmanlike_conduct', i18nKey: 'dqReasons.unsportsmanlikeConduct' },
] as const;

export const SCORING_TYPES = [
  // IPSC/USPSA
  { value: 'comstock', label: 'Comstock', group: 'IPSC/USPSA' },
  { value: 'virginia', label: 'Virginia Count', group: 'IPSC/USPSA' },
  { value: 'fixed_time', label: 'Fixed Time', group: 'IPSC/USPSA' },
  { value: 'chrono', label: 'Chrono', group: 'IPSC/USPSA' },
  // General
  { value: 'hit_factor', label: 'Hit Factor', group: 'General' },
  // IDPA
  { value: 'idpa', label: 'IDPA (Vickers Count)', group: 'IDPA' },
  // Steel Challenge
  { value: 'action_steel', label: 'Action Steel', group: 'Steel' },
  // Multi-Gun
  { value: 'multi_gun', label: 'Multi-Gun (3-Gun)', group: 'Multi-Gun' },
  // Precision
  { value: 'long_range', label: 'Long Range Rifle', group: 'Precision' },
  { value: 'bullseye', label: 'Bullseye', group: 'Precision' },
  // Archery
  { value: 'archery', label: 'Archery', group: 'Archery' },
  // Rimfire
  { value: 'nrl22', label: 'NRL22', group: 'Rimfire' },
] as const;

// Scoring category helpers
export type ScoringCategory = 'zone_per_target' | 'time_plus' | 'ring_per_shot' | 'hit_count';

export function getScoringCategory(type: string): ScoringCategory {
  switch (type) {
    case 'comstock':
    case 'virginia':
    case 'fixed_time':
    case 'hit_factor':
      return 'zone_per_target';
    case 'idpa':
      return 'zone_per_target'; // same UI pattern but different labels/penalties
    case 'action_steel':
    case 'multi_gun':
      return 'time_plus';
    case 'bullseye':
    case 'archery':
      return 'ring_per_shot';
    case 'long_range':
      return 'ring_per_shot'; // f_class variant; prs variant is hit_count
    case 'nrl22':
      return 'hit_count';
    default:
      return 'zone_per_target';
  }
}

export function getScoringCategoryConfig(type: string) {
  const category = getScoringCategory(type);
  const isLongRangePrs = type === 'long_range'; // will be refined with variant from config

  if (category === 'zone_per_target' && type === 'idpa') {
    return {
      category: 'zone_per_target' as const,
      zoneLabels: { alpha: '-0', charlie: '-1', delta: '-3', miss: 'M', no_shoot: 'NS' },
      hasTime: true,
      hasHitFactor: false,
      rankingMethod: 'lowest_time' as const,
      showPowerFactor: false,
      penaltyDefs: [
        { key: 'penalty_pe', label: 'PE (Procedural)', seconds: 3 },
        { key: 'penalty_hnt', label: 'HNT (Hit No-Shoot)', seconds: 5 },
        { key: 'penalty_ftn', label: 'FTN (Fail to Neutralize)', seconds: 5 },
        { key: 'penalty_fp', label: 'FP (Flagrant Penalty)', seconds: 10 },
        { key: 'penalty_ftdr', label: 'FTDR (Fail to Do Right)', seconds: 20 },
      ],
    };
  }

  if (category === 'zone_per_target') {
    return {
      category: 'zone_per_target' as const,
      zoneLabels: { alpha: 'A', charlie: 'C', delta: 'D', miss: 'M', no_shoot: 'NS' },
      hasTime: type !== 'fixed_time',
      hasHitFactor: type === 'comstock' || type === 'virginia' || type === 'hit_factor',
      rankingMethod: 'hit_factor' as const,
      showPowerFactor: true,
      penaltyDefs: [],
    };
  }

  if (category === 'time_plus') {
    if (type === 'action_steel') {
      return {
        category: 'time_plus' as const,
        hasTime: true,
        hasStrings: true,
        rankingMethod: 'lowest_time' as const,
        showPowerFactor: false,
        penaltyDefs: [],
      };
    }
    // multi_gun
    return {
      category: 'time_plus' as const,
      hasTime: true,
      hasStrings: false,
      rankingMethod: 'lowest_time' as const,
      showPowerFactor: false,
      penaltyDefs: [
        { key: 'penalty_ftn_sec', label: 'FTN', seconds: 5 },
        { key: 'penalty_miss_sec', label: 'Miss', seconds: 10 },
        { key: 'penalty_no_shoot_sec', label: 'No-Shoot', seconds: 5 },
        { key: 'penalty_procedural_sec', label: 'Procedural', seconds: 5 },
      ],
    };
  }

  if (category === 'ring_per_shot') {
    const ringValues = type === 'archery'
      ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
      : [10, 9, 8, 7, 6, 5]; // bullseye, f_class
    const hasX = type !== 'archery'; // archery uses 10-ring, not X
    return {
      category: 'ring_per_shot' as const,
      hasTime: false,
      rankingMethod: 'highest_score' as const,
      showPowerFactor: false,
      ringValues,
      hasX,
      penaltyDefs: [],
    };
  }

  // hit_count
  return {
    category: 'hit_count' as const,
    hasTime: false,
    rankingMethod: 'percentage_of_winner' as const,
    showPowerFactor: false,
    penaltyDefs: [],
  };
}

/** IDPA zone labels for display */
export const IDPA_ZONE_LABELS = { alpha: '-0', charlie: '-1', delta: '-3', miss: 'M', no_shoot: 'NS' } as const;

/** IDPA zone point-down values */
export const IDPA_ZONE_POINTS_DOWN = { alpha: 0, charlie: 1, delta: 3 } as const;

/** Ring values for bullseye (includes X=11) */
export const BULLSEYE_RING_VALUES = [11, 10, 9, 8, 7, 6, 5] as const;

/** Ring values for archery (no X, 10-1) */
export const ARCHERY_RING_VALUES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

/** Ring values for F-Class (includes X=11) */
export const FCLASS_RING_VALUES = [11, 10, 9, 8, 7, 6, 5] as const;

/** Ring value display labels */
export function ringValueLabel(value: number): string {
  if (value === 11) return 'X';
  if (value === 0) return 'M';
  return String(value);
}

/** Derive a human-readable English label from a snake_case value (e.g. 'production_optics' → 'Production Optics').
 *  Used as the English fallback when a translation key is missing. */
export function deriveLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Look up a label from an i18n key inside a constant item.
 *  Pass the t() function from useTranslation() and the item with optional i18nKey. */
export function translateItem(t: (key: string) => string, item: { i18nKey?: string; value: string } | undefined): string {
  if (!item) return '';
  if (item.i18nKey && t(item.i18nKey) !== item.i18nKey) return t(item.i18nKey);
  return deriveLabel(item.value);
}

/** Get human-readable division label from value (e.g. 'production_optics' → 'Production Optics'). English fallback. */
export function divisionLabel(value: string): string {
  const found = DIVISIONS.find(d => d.value === value);
  return found ? deriveLabel(found.value) : deriveLabel(value);
}

/** Get human-readable category label from value (e.g. 'super_senior' → 'Super Senior'). English fallback. */
export function categoryLabel(value: string): string {
  const found = CATEGORIES.find(c => c.value === value);
  return found ? deriveLabel(found.value) : deriveLabel(value);
}

/** Get human-readable power factor label from value (e.g. 'minor' → 'Minor'). English fallback. */
export function powerFactorLabel(value: string): string {
  const found = POWER_FACTORS.find(p => p.value === value);
  return found ? deriveLabel(found.value) : deriveLabel(value);
}

/** Format an ISO date string using the document's lang attribute for localization */
export function formatDate(isoDate: string): string {
  const lang = document.documentElement.lang || 'en';
  return new Date(isoDate).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}