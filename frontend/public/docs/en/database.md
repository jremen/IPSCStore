# Database backup

![Settings modal showing the Database panel](/docs/screenshots/settings-modal.png)

The Database panel in Settings lets you export, import, and automatically back up your data.

## Manual export / import (.sql)

- **Export** — downloads a complete `.sql` file of your database. Use it as a snapshot to transfer data between devices or keep as a safety copy.
- **Import** — replaces **all** existing data with the contents of a `.sql` file. The confirmation dialog warns that this cannot be undone.

Both actions are available from **Settings → Database**.

## WinMSS import

If you have an existing WinMSS `.mdb` file, use the **WinMSS Import** button in Settings → Database to import legacy match data (matches, shooters, registrations, scores).

## Local automatic backup (Electron desktop app only)

For ongoing protection, set a **backup folder** in **Settings → Database → Automatic Backup**.

1. **Pick a folder** — choose any local folder synced to iCloud, Google Drive, OneDrive, Dropbox, a USB drive, or a NAS.
2. **Enable automatic backup** — the app writes a full backup every night and incremental delta updates throughout the day.
3. **Monitor status** — the panel shows the last full backup time, number of pending delta updates, and total disk usage.
4. **Backup now** — trigger an immediate full backup.
5. **Restore from folder** — pick a backup folder and restore the full + delta chain. This replaces all data and reloads the app.

The backup folder must remain accessible for the automatic schedule to work. If the drive is disconnected, the app pauses and the panel shows a warning.
