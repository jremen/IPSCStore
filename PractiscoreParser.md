# Practiscore PSC v2 File Format — IPSCScore Implementation

## Overview

A `.psc` file is a standard ZIP archive containing two JSON documents:

| Entry | Purpose |
|---|---|
| `match_def.json` | Match definition: metadata, stages, shooters, classifications |
| `match_scores.json` | Per-shooter, per-stage score details |

The format described here is **PractiScore v2**, written by the iPad/Android app (tested against app v2.3.11+313). IPSCScore implements:

- **Import** (`parsePscFiles` in `pscMapper.ts`): reads a `.psc` ZIP into the IPSCScore database.
- **Export** (`buildPscExport` in `pscMapper.ts`): exports an IPSCScore match back to `.psc` format with full round-trip fidelity (stage targets as array, `ts` bitfield encoding).

---

## `match_def.json` — Top-Level Fields

| Key | Type | Example | Notes |
|---|---|---|---|
| `match_id` | string (UUID) | `"429b0d12-..."` | Origin device's UUID; **always replaced** with a fresh UUID on import |
| `match_name` | string | `"IPSC: Handgun Jun 4, 2026"` | Display name |
| `match_type` | string | `"uspsa_p"` | Mapped via `PSC_MATCH_TYPE_MAP` to IPSCScore firearm types |
| `match_subtype` | string | `"ipsc"` | `"ipsc"` → organization `"IPSC"`, `"uspsa"` → `"USPSA"` |
| `match_date` | string | `"2026-06-04"` |
| `match_creationdate` | string | `"2026-06-04 12:57:11.711"` |
| `match_modifieddate` | string | `"2026-06-04 12:57:33.711"` |
| `match_secure` | boolean | `false` |
| `match_pointsdownvalue` | number | `1.0` |
| `match_steelmisspdcount` | number | `0` | Steel miss penalty count mode (0 = per miss, 1 = per target) |
| `match_maxteamresults` | number | `3` |
| `match_penalties` | array | `[]` | Penalty rule definitions (table of penalty structs) |
| `match_bonuses` | array | `[]` | Bonus rule definitions |
| `match_cats` | array[string] | `["Open", "Production", ...]` | Division categories (native array) |
| `match_cls` | array[string] | `["U","D","C","B","A","M","G"]` | Classification grades |
| `match_ctgs` | string | `"[\"Junior\",\"Lady\",...]"` | **Stringified** JSON array of category names. Must be `JSON.parse()`d to use. |
| `match_chkins` | array[string] | `["Checked in","Paid","Staff","RO"]` | Check-in states |
| `match_procs` | array[object] | `[{"uuid":"EQRTwQ","name":"10.2.7..."}]` | Procedural rule definitions |
| `match_meta` | array[object] | | Meta entries (library URL, classifier URL) |
| `match_docs` | array[object] | | Documents (rulebook PDF, prod list URL) |
| `match_stages` | array[object] | | **See below** |
| `match_shooters` | array[object] | | **See below** |

---

## `match_stages[]` — Stage Entries

Each entry describes a single stage. The known keys:

| Key | Type | Example | Import behavior |
|---|---|---|---|
| `stage_uuid` | string (UUID) | `"4e006c07-..."` | Stored as stage.id |
| `stage_number` | string | `"1"` | Converted to integer in export |
| `stage_name` | string | `"Stage 1"` | Display name |
| `stage_targets` | **array** | `[{"target_number":1,"target_reqshots":2},...]` | **Array of target objects**, NOT a number. Length (excluding `target_deleted`) = paper target count |
| `stage_poppers` | number | `6` | Steel popper count |
| `stage_plates` | number | `0` | Steel plate count (kept for compatibility, PSC v2 uses poppers only) |
| `stage_noshoots` | number/boolean | `true` or `4` | No-shoot count. Can be boolean `true` (means 1) or number. Coerced via `safeNum`. |
| `stage_minrounds` | number | `16` | Minimum rounds |
| `stage_maxpoints` | number | `80` | Maximum possible points |
| `stage_scoring` | string | `"Comstock"` | Scoring method — mapped via `parsePscScoringMethod` |
| `stage_strings` | number | `1` | Number of strings (always 1 in IPSCScore export) |
| `stage_deleted` | boolean | `false` | If `true`, stage is skipped entirely on import |
| `stage_classifier` | boolean | `false` | |
| `stage_modified` | boolean | `false` | |
| `stage_type` | string | `""` | |

### `stage_targets[]` — Target Objects

Each element represents a single paper target:

| Key | Type | Example | Notes |
|---|---|---|---|
| `target_number` | number | `1` | Sequential within stage |
| `target_reqshots` | number | `2` | Required shots (A-zone hits to neutralize) |
| `target_deleted` | boolean | `true` | If `true`, target is excluded from count. Only present on deleted targets. |

Deleted targets are excluded from the paper target count via:
```ts
paperTargets = rawTargets.filter(t => t?.target_deleted !== true).length;
```

---

## `match_shooters[]` — Shooter Entries

| Key | Type | Example | Notes |
|---|---|---|---|
| `sh_uuid` | string (UUID) | `"180522aa-..."` | Shooter identifier |
| `sh_fn` | string | `"Jozef"` | First name |
| `sh_ln` | string | `"Remeň"` | Last name |
| `sh_dvp` | string | `"Open"` | Division — mapped via `PSC_DIVISION_MAP` |
| `sh_pf` | string | `"Minor"` | Power factor: `"Major"` or `"Minor"` |
| `sh_grd` | string | `"U"` | Classification grade |
| `sh_ctg` | string | `""` | Category (`"Junior"`, `"Lady"`, etc.). Empty = default `"regular"` on import. |
| `sh_sq` | number | `1` | Squad number (0 = unsquadded) |
| `sh_region` | string | `"USA"` | Region / country code |

Import synthesizes shooter records from scores when `match_shooters` is absent (see "Synced Shooters" below).

---

## `match_scores.json` — Score Structure

Top level:

| Key | Type | Notes |
|---|---|---|
| `match_id` | string (UUID) | Should match `match_def.match_id` |
| `match_scores` | array[object] | One entry per stage, ordered by stage |
| `match_scores_history` | object | Historical score data (not decoded in v1) |

### `match_scores[]` Entry

| Key | Type | Notes |
|---|---|---|
| `stage_number` | string | `"1"` |
| `stage_uuid` | string (UUID) | Should match `stage_uuid` in match_def |
| `stage_stagescores` | array[object] | One entry per shooter |

### `stage_stagescores[]` Entry (per-shooter, per-stage)

| Key | Type | Notes |
|---|---|---|
| `shtr` | string (UUID) | References a shooter's `sh_uuid` |
| `mod` | string | Last-modified timestamp |
| `popm` | number | Steel poppers/plates **missed** |
| `poph` | number | Steel poppers/plates **hit** |
| `rawpts` | number | Pre-calculated total points (paper hits + steel hits, before penalty deduction) |
| `str` | **array[number]** | String times. `str[0]` = primary time. |
| `ts` | **array[integer]** | Per-target hit-zone bitfield. One entry per paper target. **See bitfield decoder below.** |
| `proc_cnts` | array[object] | Procedural penalty counts, e.g. `[{"EQRTwQ": 1}]` |
| `proc` | number | Total procedural count (convenience aggregate, sometimes absent when 0) |
| `aprv` | boolean | Whether the score is approved. `false` → DNF. |
| `udid`, `dname` | string | Device identifiers (iPad model/version, not used in IPSCScore) |

---

## `ts` Bitfield Decoder — Per-Target Hit Zone Encoding

Each integer in the `ts` array represents one paper target. The value is a **nibble-packed base-16 sum**: each 4-bit slot stores the hit count for one zone (max 15 hits).

### Slot Map

| Slot | 16^n | Bits | Category | Confirmed by |
|------|------|------|----------|-------------|
| 0 | 1 | 0–3 | Alpha | `2`, `257`, `4097`, `1048577`, `1114113` |
| 1 | 16 | 4–7 | (unused — Bravo) | never appears in practice |
| 2 | 256 | 8–11 | Charlie | `257`, `1048832` |
| 3 | 4096 | 12–15 | Delta | `4097` |
| 4 | 65536 | 16–19 | No-Shoot | `1114113` |
| 5 | 1048576 | 20–23 | Miss | `1048577`, `1048832`, `1114113` |

### Decoder (TypeScript)

```ts
function decodeTsValue(value: number): DecodedTsHits {
  const raw = Math.max(0, Math.floor(Number(value) || 0));
  return {
    alpha:         (raw >>> 0) & 0xF,   // slot 0
    charlie:       (raw >>> 8) & 0xF,   // slot 2
    delta:         (raw >>> 12) & 0xF,  // slot 3
    no_shoot_hits: (raw >>> 16) & 0xF,  // slot 4
    miss:          (raw >>> 20) & 0xF,  // slot 5
  };
}
```

### Encoder (TypeScript)

```ts
function encodeTsValue(hits: DecodedTsHits): number {
  return ((hits.alpha & 0xF) << 0)
       | ((hits.charlie & 0xF) << 8)
       | ((hits.delta & 0xF) << 12)
       | ((hits.no_shoot_hits & 0xF) << 16)
       | ((hits.miss & 0xF) << 20);
}
```

### Worked Examples

| ts value | Hex | Alpha | Charlie | Delta | No-Shoot | Miss | Meaning |
|----------|-----|-------|---------|-------|----------|------|---------|
| `2` | `0x000002` | 2 | 0 | 0 | 0 | 0 | Double Alpha |
| `257` | `0x000101` | 1 | 1 | 0 | 0 | 0 | Alpha Charlie |
| `4097` | `0x001001` | 1 | 0 | 1 | 0 | 0 | Alpha Delta |
| `1048577` | `0x100001` | 1 | 0 | 0 | 0 | 1 | Alpha Miss |
| `1048832` | `0x100100` | 0 | 1 | 0 | 0 | 1 | Charlie Miss |
| `1114113` | `0x110001` | 1 | 0 | 0 | 1 | 1 | Alpha No-Shoot Miss |

---

## Import Flow (`parsePscFiles`)

1. **Unzip** the `.psc` file → extract `match_def.json` and `match_scores.json`.
2. **Parse** both files using `JSON.parse`.
3. **Stages**: iterate `match_def.match_stages`. Skip entries with `stage_deleted === true`. Count paper targets from `stage_targets` array length (excluding entries with `target_deleted === true`). Map `stage_poppers` + `stage_plates` → steel count.
4. **Shooters**: iterate `match_def.match_shooters`. Map division, power factor, category. Default category to `"regular"` when empty.
5. **Synced Shooters**: if `match_shooters` is empty or missing, synthesise shooter records from unique `shtr` UUIDs found in scores (with a warning).
6. **Scores**: iterate `match_scores.stage_stagescores`. For each shooter's score:
   - Read `str[0]` as primary time.
   - Read `rawpts` as pre-calculated raw points (authoritative).
   - Read `poph` / `popm` as steel hit/miss counts.
   - Read `ts` array and **decode each element** into A/C/D/NS/M hit counts per paper target.
   - Generate one `target_scores` row per paper target (from decoded `ts`) + one per steel target (from `poph`/`popm`).
   - Compute penalty points: `proceduralCount * 10 + popm * 5` (minor PF assumed).
   - Compute net points and hit factor: `net = max(0, rawpts - penalties)`, `hft = net / time`.
   - **Validate** decoded `ts` points against reported `rawpts` — warn on >1pt mismatch.
   - Store decoded `ts` in `score_data.decoded.ts` for future re-hydration.
7. **Fallback**: if a score row has no `ts` array (legacy files), fall back to `distributedHits` — a flat distribution of aggregate points across targets.
8. **Insert** all records in a database transaction.
9. **Return** match UUID, counts, and warnings.

---

## Export Flow (`buildPscExport`)

1. **Match metadata**: construct `match_def` with all known v2 fields (`match_id` from IPSCScore DB, name, type, subtype, dates, classification arrays, procedural rule list, etc.).
2. **Stages**:
   - For each stage, build a `stage_targets` **array** of `[{target_number, target_reqshots}, ...]` (one per paper target).
   - Write explicit v2 markers: `stage_deleted: false`, `stage_classifier: false`, `stage_modified: false`, `stage_type: ''`.
   - Include `stage_poppers` (steel count) and `stage_plates: 0`.
3. **Shooters**: deduplicate by `shooter_id` (one registration per shooter). Map IPSCScore divisions back to Practiscore division names.
4. **Scores**:
   - For each shooter's stage score, look up the shooter's `target_scores`.
   - **Re-encode `ts` array** from paper target rows using `encodeTsValue` (mirror of the importer's decoder).
   - Count steel hits/misses from steel target rows.
   - Include `proc_cnts` and `proc` fields when procedural count > 0.
   - Use `str: [time]` (array of one element) for time.
5. **Package**: construct `match_scores` object and return `{match_def, match_scores}` as `PscExportData`.

---

## Round-Trip Guarantees

An PSC file → import → export → re-import cycle **preserves**:

- Match name, date, organization, firearm type
- Stage names, numbers, paper target counts (after excluding deleted), steel counts
- Shooter names, division, power factor, category
- Per-shooter, per-stage **hit zone breakdowns** (A/C/D/NS/M counts per paper target from `ts`)
- Per-shooter aggregate `rawpts`, `poph`, `popm`, `procedural_count`
- Per-shooter time (`str`), DNF status

**Not preserved** (v1 limitations):

- Match-level procedural rule UUIDs in `match_procs` — always exported with a single default `EQRTwQ` entry ("Failure to engage target")
- Device identifiers (`udid`, `dname`) — omitted on re-export
- Per-string times (multi-string stages always export one string)
- `match_meta`, `match_docs` — exported as empty arrays
- `match_scores_history` — exported as empty object
- Shooter UUIDs are **always regenerated** on import to avoid UUID conflicts

---

## Edge Cases and Fallbacks

| Scenario | Behavior |
|---|---|
| `match_shooters` missing or empty | Shooters synthesised from unique `shtr` UUIDs in scores with warning |
| `stage_deleted: true` | Stage skipped with warning; referencing scores also skipped |
| `target_deleted: true` | Target excluded from paper target count |
| Empty `ts` array | Falls back to `distributedHits` (flat aggregate distribution) |
| `stage_noshoots` is boolean `true` | Treated as 1 via `safeNum(true) → 1` |
| `stage_targets` is a number (not array) | Defensive fallback: use via `safeNum` |
| Division/power factor missing | Defaults to `open` / `minor` |
| Category missing or empty | Defaults to `"regular"` |
| `rawpts` mismatch with decoded `ts` | Warning logged, import proceeds with PSC-reported `rawpts` |
| File is not a valid ZIP | Returns 400 error |
| `match_def.json` or `match_scores.json` missing in ZIP | Returns 400 error |

---

## Database Schema Reference

| IPSCScore table | PSC source |
|---|---|
| `matches` | `match_def` top-level fields |
| `stages` | `match_stages[]` |
| `shooters` | `match_shooters[]` (or synthesised from scores) |
| `match_registrations` | `match_shooters[]` (division, PF, category per registration) |
| `stage_scores` | `match_scores[].stage_stagescores[]` |
| `target_scores` | `ts` bitfield (paper) + `poph`/`popm` (steel) |
