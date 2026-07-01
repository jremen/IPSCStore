# Registration & shooters

A shooter is a person in the global database. A registration is the link between a shooter and a specific match, with optional division/category/power-factor overrides.

## Global shooter database

The **Shooters** tab is the global pool. You can:

- Add a shooter manually
- Bulk-import a CSV
- Edit, soft-delete, or restore any shooter
- Search by name, division, region, or tag

![Shooters database](/docs/screenshots/registration-list.png)

**To do this in the app:** [Add a new shooter](app-action:new-shooter)

## Registering shooters in a match

Open the **Registration** tab for the current match.

- **Add existing shooter** — search the global database, click to add.
- **Create + register inline** — create a new shooter and add them in one step.
- **Edit registration** — override division, category, or power factor for this match only.
- **Bulk edit / remove** — select rows with checkboxes, then act on them.
- **Drag-to-group** — drag a row onto another row to put them in the same shooter group (car pool). Useful so friends get squadded together.

![Edit registration](/docs/screenshots/edit-registration-modal.png)

**To do this in the app:** [Go to Registration](app-tab:registration)

## Divisions and categories

- **Division** is a class of firearm (e.g. Production, Standard, Open for IPSC). Divisions are scoped by match organization and firearm type.
- **Category** is a person class (Regular, Junior, Senior, Super Senior, Lady).
- **Power factor** is Minor or Major — affects how hits score (IPSC).

Each registration inherits the shooter's defaults; you can override per-match via the Edit Registration modal.

**To do this in the app:** [Add a registration](app-action:add-registration)
