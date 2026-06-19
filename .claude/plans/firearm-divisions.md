# Plan: Firearm-type-aware division filtering for Rifle and Shotgun matches

## Goal

When a match's `firearm_type` is `rifle` or `shotgun`, show only the divisions appropriate for that discipline, instead of the handgun / PCC divisions. Concretely:

- **IPSC Rifle** (match.firearm_type = `rifle`, match.organization = `IPSC`):
  - Semi-Auto Standard (SASTD)
  - Semi-Auto Open (SAO)
  - Manual Action Contemporary (MAC)
  - Manual Action Bolt (MAB)
- **IPSC Shotgun** (match.firearm_type = `shotgun`):
  - Open
  - Modified
  - Standard
  - Standard Manual

The existing per-stage `hits_per_paper` field already drives scoring (it caps the "best N hits per target" loop in `backend/src/utils/scoringCalc.ts:75`). MAB requires `hits_per_paper = 1`; SA Standard / SA Open / MAC / Shotgun divisions use `2`. The stage form keeps defaulting to 2 — the range master edits it for MAB.

## Why this matters

The user's premise that "MAB 1 hit = 2 hits" is incorrect per the IPSC Rifle Rules (Jan 2025): the rule is "best ONE hit to score" — that one hit counts its points once. The scoring engine already supports this through `hits_per_paper`. We just need to expose the right division choices and (optionally) a hint.

## Files to change

### 1. `frontend/src/utils/constants.ts`

- Add 8 new division entries to `DIVISIONS` with new groups:
  - `{ value: 'sa_standard', label: 'Semi-Auto Standard', group: 'IPSC Rifle' }`
  - `{ value: 'sa_open', label: 'Semi-Auto Open', group: 'IPSC Rifle' }`
  - `{ value: 'mac', label: 'Manual Action Contemporary', group: 'IPSC Rifle' }`
  - `{ value: 'mab', label: 'Manual Action Bolt', group: 'IPSC Rifle' }`
  - `{ value: 'shotgun_open', label: 'Open', group: 'IPSC Shotgun' }`
  - `{ value: 'shotgun_modified', label: 'Modified', group: 'IPSC Shotgun' }`
  - `{ value: 'shotgun_standard', label: 'Standard', group: 'IPSC Shotgun' }`
  - `{ value: 'shotgun_standard_manual', label: 'Standard Manual', group: 'IPSC Shotgun' }`

- Add a new `FIREARM_DIVISIONS: Record<string, string[]>` map keyed by firearm type:
  ```ts
  export const FIREARM_DIVISIONS: Record<string, string[]> = {
    rifle: ['sa_standard', 'sa_open', 'mac', 'mab'],
    shotgun: ['shotgun_open', 'shotgun_modified', 'shotgun_standard', 'shotgun_standard_manual'],
  };
  ```

- Add a new `getDivisionsForMatch(match: { organization?: string; firearm_type?: string } | null | undefined)` helper that:
  - Returns `FIREARM_DIVISIONS[firearm_type]` when defined
  - Otherwise falls back to `ORGANIZATION_DIVISIONS[organization]`
  - When both fall through, returns all `DIVISIONS`

- Add a `getGroupedDivisionsForMatch(match)` helper for the ShooterFormFields case where organization is known but firearm_type isn't.

### 2. Backend CHECK constraint migration

Create `backend/src/db/migrations/016_add_rifle_shotgun_divisions.sql` to extend the `shooters.division` and `match_registrations.division` CHECK constraints to include the 8 new values. Mirror the structure of `006_add_new_divisions.sql`. Wire it into the migration runner (`db/migrate.ts`) — confirm the runner picks up new files automatically (it should; they are numbered).

### 3. Frontend consumers of `getDivisionsForOrganization`

Three call sites currently pass only the organization. Update them to also pass `firearm_type`:

- `frontend/src/components/shared/ShooterFormFields.tsx` — accept an optional `firearmType` prop and use `getDivisionsForMatch`.
- `frontend/src/components/shared/BulkEditFormFields.tsx` — accept an optional `firearmType` prop and use `getDivisionsForMatch`.
- `frontend/src/components/registration/EditRegistrationModal.tsx` — look up the match's `firearm_type` from `matchStore` and pass it to a refactored `getDivisionsForMatch`.

Caller updates:
- `frontend/src/components/registration/MatchRegistration.tsx` — pass `match.firearm_type` to `ShooterFormFields` and `BulkEditFormFields`.
- `frontend/src/components/shooter/ShooterDatabase.tsx` — the global Shooter Database has no match context, so it should fall back to `getDivisionsForOrganization` (which returns all divisions, as today). No code change here.

### 4. `frontend/src/components/stage/StageFormModal.tsx`

Add a small hint under the `hits_per_paper` field when `match.firearm_type === 'rifle'`:
- "IPSC Rifle MAB division uses best 1 hit per paper target."

The stage form already supports any value for `hits_per_paper` (no code change to the field itself). The hint just informs the range master.

### 5. i18n keys (optional, divisions are kept in English per CLAUDE.md)

CLAUDE.md says divisions stay in English ("Open, Standard, Production Optics, Carry Optics, Single Stack"). The new IPSC rifle/shotgun divisions follow the same rule — keep them as canonical English labels and don't translate. No i18n changes needed for division labels. The hint message in (4) should be added to both `en.json` and `sk.json` under `stages.hitsPerPaperRifleHint`.

## Critical files to read before editing

- `frontend/src/utils/constants.ts` — current `DIVISIONS`, `ORGANIZATION_DIVISIONS`, `getDivisionsForOrganization`, `divisionLabel`.
- `frontend/src/components/shared/ShooterFormFields.tsx` — primary consumer; check existing `organization` prop wiring.
- `frontend/src/components/registration/MatchRegistration.tsx` — passes match context into form fields; needs the new `firearmType` prop.
- `backend/src/db/migrations/006_add_new_divisions.sql` — template for the new constraint migration.
- `backend/src/db/migrate.ts` — verify the runner auto-discovers numbered migrations.

## Verification

- `cd backend && npx tsx src/db/migrate.ts` applies the new migration cleanly (or `docker compose up` rebuilds the schema).
- `cd frontend && npx tsc -b` passes.
- Manual: open a rifle match → register a shooter → division dropdown shows only SA Standard / SA Open / MAC / MAB.
- Manual: open a shotgun match → register a shooter → division dropdown shows only the four shotgun divisions.
- Manual: open a handgun IPSC match → division dropdown still shows the original IPSC handgun divisions (regression check).
- Manual: set a rifle stage's `hits_per_paper` to 1 and confirm scoring uses the best 1 hit (verify by saving a paper target with two zone-A hits and one zone-C hit → raw points = 5, not 5+5=10 or 5+3=8).

## Note on the user's "1 hit = 2 hits" claim

Per IPSC Rifle Rules Jan 2025:
- "the best two hits to score in Semi Auto and Manual Action Contemporary Divisions and the best hit to score in Manual Action Bolt Division"
- No rule doubles the value of that single hit. MAB = best 1 hit counts once.

This plan implements the correct rule.
