# Audit log

The audit log records every administrative and scoring action performed in the app. Use it to track who changed scores, created or deleted entries, exported data, or performed other sensitive operations.

## Opening the audit log

From the admin header, click the **⚙️ Settings** button. In the Settings modal, click **View Audit Log** under the "Audit log" section.

![Audit log modal](/docs/screenshots/audit-log-modal.png)

## What the audit log shows

Each entry contains:

- **Time** — when the action occurred
- **Actor** — who performed it (`admin`, `scorer`, or `anonymous`)
- **Action** — what was done (e.g. `score.write`, `shooter.create`, `match.delete`)
- **Target** — which table and row was affected (e.g. `registrations:uuid`, `stages:uuid`)
- **IP** — the IP address of the actor
- **Details** — optional metadata (click to expand)

## Filtering

- **Action filter** — type a substring to filter by action name (e.g. `score` shows all score-related entries)
- **Role filter** — select a role to show only that actor's actions
- Click **Filter** or press Enter to apply; click **↻** to refresh from the first page

## Pagination

The log loads 100 entries at a time. Click **Load more** at the bottom to fetch older entries.

## Typical actions

| Action | Description |
|---|---|
| `score.write` | A score was saved or updated |
| `score.recalculate-stage` | Scores for a stage were recalculated |
| `score.recalculate-match` | All scores for a match were recalculated |
| `match.create` / `match.delete` | A match was created or deleted |
| `shooter.create` / `shooter.update` / `shooter.delete` | A shooter was created, updated, or soft-deleted |
| `registration.create` / `registration.delete` | A shooter was registered or unregistered |
| `registration.dq` / `registration.undq` | A shooter was disqualified or reinstated |
| `import.shooters` / `import.scores` | Data was imported |
| `backup.export` / `backup.restore` | A database backup was exported or restored |
| `match.export` | A match was exported to another format |
