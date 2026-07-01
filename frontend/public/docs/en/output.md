# Output & exports

The app can export results in several formats. Open the **Results** tab and use the export buttons in the header.

![Export buttons](/docs/screenshots/export-buttons.png)

## CSV

- **Results CSV** — all shooters with their total match percentage, division, and category.
- **Registrations CSV** — from the Matches tab, exports the registration list for a match.
- **Shooters CSV** — from the Shooters tab, exports the global shooter database.

CSV files open in Excel, Numbers, or any spreadsheet app.

## PDF

- **Score sheets** — from the Stages tab, per-stage score sheets ready for printing.
- **Squadding list** — from the squadding modal, the squad assignments for the range.
- **Results** — formatted results PDF, ready to print and post at the range.

## JSON

- **Match export** — from the Matches tab, a single JSON file with the full match (stages, registrations, scores, results). Useful for sharing a match setup with another device.
- **Match import** — the reverse: replace a local match with the contents of a JSON file.

## WinMSS import

If you have an existing WinMSS database, you can import a `.mdb` file from the **Settings → Database** panel. The match, shooters, registrations, and scores are all imported.

## Database backup

For ongoing protection, configure a **local backup folder** in Settings. The app writes a full backup nightly and delta updates throughout the day, so you can recover the entire database from any folder synced to iCloud, Google Drive, OneDrive, Dropbox, or a USB drive.

**To do this in the app:** [Export results as PDF](app-action:export-results-pdf)
