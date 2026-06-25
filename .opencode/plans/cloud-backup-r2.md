# Cloud Backup — Implementation Plan

## Overview

Hybrid backup strategy: **periodic compressed full backups** (every 30 minutes) + **per-score deltas** (~3-5 KB each). This keeps bandwidth at ~200 MB/day for a 38 MB database, vs 6+ GB/day for full-backup-per-score. Manual SQL export/import (local file) is preserved unchanged.

**Two providers supported**:
- **Cloudflare R2** — S3-compatible object storage, 3-step setup
- **Google Drive** — Service account + shared folder, files visible in user's own Drive, 7-step setup

**Electron distribution**: credentials are user-configurable via the Settings UI and stored in `app_settings` — no server env vars required per-user.

## Backup architecture

```
Score saved  ──→  upload delta (~3-5 KB)  ──→  provider.upload(<path>, <json>)
                     (fire-and-forget, debounced 5s)

Timer (30 min) ──→  upload gzipped full DB  ──→  provider.upload(<path>, <compressed>)
                     (only if any scores modified since last full)

Restore:  download full → gunzip → import → list deltas since → download → apply (UPSERT)
```

### Bandwidth budget (38 MB database, 100 shooters, 6 stages)

| Component | Count | Size each | Total/day |
|---|---|---|---|
| Full backups (every 30 min) | ~20 | ~10 MB (gzipped) | ~200 MB |
| Score deltas | ~600 | ~3-5 KB | ~1.8 MB |
| **Total** | | | **~202 MB** |

### File structure (per provider)

```
<instance_id>/
  full.json.gz                    — latest full backup (overwrite each time)
  full-<timestamp>.json.gz        — rotating full (keep 3)
  deltas/
    <ts>-<regId>.json             — per-score delta
```

Instance ID = auto-generated UUID stored in `app_settings` as `cloud_instance_id`. Namespaces keys to prevent collisions across users sharing a bucket.

For R2: keys are object keys (`backups/<instance_id>/full.json.gz`).
For Google Drive: files live in a user-shared Drive folder, named as `<instance_id>/full.json.gz`.

## What stays unchanged

- **Manual SQL export/import** (`POST /api/backup`, `POST /api/restore`): kept exactly as-is. Admin downloads/uploads `.sql` files. No dependency on cloud backup.
- **Score save flow**: the `scheduleDeltaBackup()` call after audit log is fire-and-forget, non-blocking. Scoring UX is unaffected.

## New dependency

`aws4fetch` — ~2 KB library that signs `fetch()` requests with AWS Signature V4. Added to `backend/package.json`. Used only for R2 provider. Google Drive provider uses no new dependencies (Node.js built-in `crypto` for JWT signing).

## Provider abstraction

```typescript
interface CloudProvider {
  id: 'r2' | 'gdrive';
  name: string;

  // Config
  getConfigFields(): ProviderField[];
  saveConfig(data: Record<string, string>): Promise<void>;
  loadConfig(): Promise<Record<string, string> | null>;
  maskSensitiveFields(data: Record<string, string>): Record<string, string>;

  // Connection
  testConnection(): Promise<{ success: boolean; error?: string }>;

  // File ops
  upload(path: string, body: Buffer | string, contentType?: string): Promise<void>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
}
```

The backup service (`cloudBackup.ts`) works with the `CloudProvider` interface — it doesn't know or care whether it's R2 or Google Drive. Uploading a delta just calls `provider.upload(key, body)`.

## Google Drive provider — details

### Auth: Service Account + Shared Folder

The user creates a Google Cloud service account, downloads a JSON key, pastes it into the app. Files go into a shared folder in the **user's own Drive** (visible to them), not the service account's Drive.

| Step | User action |
|---|---|
| 1 | Go to [console.cloud.google.com](https://console.cloud.google.com) → create project |
| 2 | Enable Drive API |
| 3 | Create Service Account → download JSON key |
| 4 | Create folder in Google Drive, e.g. "IPSCScore Backups" |
| 5 | Share folder with the service account email → **Editor** |
| 6 | Copy folder ID from URL (`drive.google.com/drive/folders/XXXXX`) |
| 7 | Paste JSON key + folder ID into IPSCScore Settings |

Files are created inside the shared folder, so they appear in the user's own Drive. The service account only has write access to that specific folder — no access to anything else.

### No new npm dependencies

JWT signing uses Node.js built-in `crypto` module (`crypto.createSign('RSA-SHA256')`). Google Drive REST API uses plain `fetch()`.

### Service Account JWT flow

```
1. Parse JSON key → extract client_email, private_key
2. Create JWT claims:
   { iss: client_email,
     scope: 'https://www.googleapis.com/auth/drive.file',
     aud: 'https://oauth2.googleapis.com/token',
     exp: now + 3600,
     iat: now }
3. Sign JWT with RSA-SHA256 using private_key
4. POST to https://oauth2.googleapis.com/token
   grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>
5. Get back access_token (expires in 1 hour, refreshed automatically)
```

### Google Drive file operations

| Operation | API call |
|---|---|
| Upload file | `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` |
| Download file | `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` |
| Delete file | `DELETE https://www.googleapis.com/drive/v3/files/{fileId}` |
| List files in folder | `GET https://www.googleapis.com/drive/v3/files?q='<folderId>'+in+parents` |
| Find file by name | `GET .../files?q=name='<filename>'+and+'<folderId>'+in+parents` |
| Create subfolder | `POST .../files` with `mimeType: 'application/vnd.google-apps.folder'` |

File IDs are cached in a local Map after first lookup to avoid repeated name-based queries.

### Google Drive provider implementation

`backend/src/services/cloudProviders/gdrive.ts` (~250 lines):

```typescript
class GDriveProvider implements CloudProvider {
  id = 'gdrive';
  name = 'Google Drive';

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private fileIdCache: Map<string, string> = new Map(); // filename → fileId

  getConfigFields(): ProviderField[] {
    return [
      { key: 'cloud_gdrive_service_account_json', label: 'Service Account JSON', type: 'textarea',
        placeholder: 'Paste the full JSON key from Google Cloud Console' },
      { key: 'cloud_gdrive_folder_id', label: 'Folder ID', type: 'text',
        placeholder: 'e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgV' },
    ];
  }

  async upload(path: string, body: Buffer | string, contentType = 'application/json'): Promise<void> {
    const token = await this.getAccessToken();
    const fileId = await this.findOrCreateFile(path);
    // If file exists → update via PATCH, else → create via POST
    // ... multipart upload with metadata + content
  }

  async download(path: string): Promise<Buffer> {
    const token = await this.getAccessToken();
    const fileId = await this.findFile(path);
    // GET .../files/{fileId}?alt=media
    // ... return Buffer
  }

  private async getAccessToken(): Promise<string> {
    // If token valid (expiresAt - now > 60s), return cached
    // Otherwise: sign JWT → POST to token endpoint → cache new token
  }
}
```

## R2 provider implementation

`backend/src/services/cloudProviders/r2.ts` (~100 lines):

```typescript
class R2Provider implements CloudProvider {
  id = 'r2';
  name = 'Cloudflare R2';

  getConfigFields(): ProviderField[] {
    return [
      { key: 'cloud_r2_endpoint', label: 'R2 Endpoint', type: 'text',
        placeholder: 'https://<account_id>.r2.cloudflarestorage.com' },
      { key: 'cloud_r2_bucket', label: 'Bucket', type: 'text' },
      { key: 'cloud_r2_access_key_id', label: 'Access Key ID', type: 'text' },
      { key: 'cloud_r2_secret_access_key', label: 'Secret Access Key', type: 'password' },
    ];
  }

  async upload(path: string, body: Buffer | string): Promise<void> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${path}`;
    const response = await aws4fetch.fetch(url, { method: 'PUT', body });
    if (!response.ok) throw new Error(`R2 upload failed: ${response.status}`);
  }

  // download, delete, listKeys — similar aws4fetch-signed requests
}
```

## Credential storage model

All settings stored in `app_settings` (same table as `admin_password_hash`, `scorer_trust_token`):

| Setting key | Type | Provider | Description |
|---|---|---|---|
| `cloud_provider` | string | Both | `"r2"`, `"gdrive"`, or `""` (none) |
| `cloud_backup_enabled` | string | Both | `"true"` / `"false"` |
| `cloud_instance_id` | string | Both | auto-generated UUID (on first backup) |
| `cloud_last_full_backup_at` | string | Both | ISO timestamp of last full backup |
| `cloud_r2_endpoint` | string | R2 | `https://<account_id>.r2.cloudflarestorage.com` |
| `cloud_r2_bucket` | string | R2 | bucket name |
| `cloud_r2_access_key_id` | string | R2 | R2 access key ID |
| `cloud_r2_secret_access_key` | string | R2 | R2 secret access key (plain in DB) |
| `cloud_gdrive_service_account_json` | string | GDrive | full JSON key string |
| `cloud_gdrive_folder_id` | string | GDrive | shared folder ID |

**Fallback**: env vars (`CLOUDFLARE_R2_*`) provide defaults when DB rows don't exist. DB values always win when present. No env vars for Google Drive (user must configure via UI for security — JSON key is too sensitive for env vars).

**Secret key masking**: `GET /api/cloud-backup/status` returns secret key as `r2_...<last4>` (R2) or `****` (GDrive JSON key). On save, if `cloud_r2_secret_access_key` starts with `r2_`, keep existing value.

## Delta format

Each score save produces a small JSON file uploaded to the provider:

```json
{
  "type": "score",
  "ts": "2026-06-25T14:30:05.000Z",
  "matchId": "...",
  "stageId": "...",
  "registrationId": "...",
  "score": { /* full stage_scores row */ },
  "targets": [ /* all target_scores rows for this stage_score_id */ ],
  "chrono": { /* chrono_results row or null */ }
}
```

Size: ~3-5 KB per delta (1 score + 1-20 targets).

## Full backup format (gzipped JSON)

Same as delta-only plan but includes everything. On upload, gzipped with Node.js built-in `zlib.gzipSync()`.

```json
{
  "version": 2,
  "exportedAt": "2026-06-25T14:30:00.000Z",
  "instanceId": "...",
  "matches": [...],
  "stages": [...],
  "shooters": [...],
  "registrations": [...],
  "scores": [...],
  "targets": [...],
  "chrono": [...],
  "settings": [...],
  "adminSessions": [...],
  "scorerSessions": [...]
}
```

## Restore logic

```
1. provider.download(<instance_id>/full.json.gz) → gunzip → DELETE all rows → INSERT all rows (transaction)
2. provider.listKeys(<instance_id>/deltas/) → sort by name (timestamp-ordered)
3. For each delta where ts > full.exportedAt:
   UPSERT stage_scores (from delta.score)
   UPSERT target_scores (from delta.targets[])
   UPSERT chrono_results (from delta.chrono, if present)
4. Done. Page reload.
```

Delta replay is fast: each UPSERT is ~1ms. 600 deltas = ~600ms total.

## Files to create

### 1. `backend/src/services/cloudProviders/r2.ts` (~100 lines)

R2 provider implementing `CloudProvider`. Uses `aws4fetch` for signed requests. File ops: PUT/GET/DELETE/LIST against `endpoint/bucket/path`.

### 2. `backend/src/services/cloudProviders/gdrive.ts` (~250 lines)

Google Drive provider implementing `CloudProvider`. JWT auth with service account. File ops: multipart upload, media download, REST API list/delete. File ID caching.

### 3. `backend/src/services/cloudProviders/types.ts` (~30 lines)

`CloudProvider` interface + `ProviderField` type + `providerRegistry` map:

```typescript
const providers = new Map<string, CloudProvider>([
  ['r2', new R2Provider()],
  ['gdrive', new GDriveProvider()],
]);

export function getProvider(id: string): CloudProvider | undefined {
  return providers.get(id);
}
```

### 4. `backend/src/services/cloudBackup.ts` (~300 lines)

Core service. Uses `CloudProvider` interface for all file ops. Exports:

```typescript
// ── Scoring hook ──
scheduleDeltaBackup(matchId, stageId, registrationId): void  // debounced 5s

// ── Manual / timer ──
triggerFullBackup(): Promise<{ success: boolean; key: string; size: number }>
downloadAndRestoreBackup(): Promise<{ success: boolean; message: string }>

// ── Config / status ──
getCloudBackupStatus(): CloudBackupStatus
saveCloudConfig(config): Promise<void>
testCloudConnection(): Promise<{ success: boolean; error?: string }>
```

Internal helpers:

| Helper | Purpose |
|---|---|
| `getActiveProvider()` | Read `cloud_provider` from `app_settings`, return `getProvider(id)` |
| `getInstanceId()` | Read/generate `cloud_instance_id` UUID |
| `exportFullDbAsJson()` | SELECT * all tables → stringified JSON |
| `importJsonToDb(json)` | DELETE + INSERT all rows in a transaction |
| `compressJson(json)` | `zlib.gzipSync(Buffer.from(json))` → Buffer |
| `decompressGzip(buf)` | `zlib.gunzipSync(buf)` → string |
| `rotateFullBackups()` | Keep 3 most recent full backups (delete older) |
| `clearDeltas()` | Delete all delta files after successful full backup |

**Delta flow** (after score save):
```
let deltaTimer: NodeJS.Timeout | null = null;
let pendingDeltas: DeltaPayload[] = [];
let running = false;

function scheduleDeltaBackup(matchId, stageId, registrationId) {
  pendingDeltas.push({ matchId, stageId, registrationId });
  if (deltaTimer) clearTimeout(deltaTimer);
  deltaTimer = setTimeout(flushDeltas, 5000);
}

async function flushDeltas() {
  if (running) return;
  running = true;
  try {
    const provider = getActiveProvider();
    if (!provider) return;
    for (const delta of pendingDeltas) {
      const payload = await buildDeltaPayload(delta);
      const path = `${getInstanceId()}/deltas/${new Date().toISOString()}-${delta.registrationId}.json`;
      await provider.upload(path, JSON.stringify(payload));
    }
    pendingDeltas = [];
  } finally { running = false; }
}
```

**Full backup flow** (timer + manual trigger):
```
let fullTimer: NodeJS.Timeout | null = null;

function startFullBackupTimer() {
  fullTimer = setInterval(async () => {
    const provider = getActiveProvider();
    if (!provider) return;
    const config = await provider.loadConfig();
    if (!config?.enabled) return;
    const modified = await hasScoresModifiedSinceLastFull();
    if (!modified) return;
    await triggerFullBackup();
  }, 30 * 60 * 1000);  // 30 minutes
}

async function triggerFullBackup() {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No cloud provider configured');
  const json = await exportFullDbAsJson();
  const compressed = compressJson(json);
  const ts = new Date().toISOString();
  const instanceId = await getInstanceId();

  // Upload new full backup
  const path = `${instanceId}/full-${ts}.json.gz`;
  await provider.upload(path, compressed);

  // Overwrite latest
  await provider.upload(`${instanceId}/full.json.gz`, compressed);

  // Rotate: keep 3 most recent full backups
  await rotateFullBackups(instanceId);

  // Clear deltas
  await clearDeltas(instanceId);

  // Update timestamp in settings
  await sql`UPDATE app_settings SET value = ${ts} WHERE key = 'cloud_last_full_backup_at'`;
}
```

### 5. `backend/src/routes/cloudBackup.ts` (~120 lines)

```
POST /api/cloud-backup            → triggerFullBackup()       (admin)
POST /api/cloud-restore           → downloadAndRestoreBackup() (admin)
GET  /api/cloud-backup/status     → getCloudBackupStatus()     (admin)
PUT  /api/cloud-backup/config     → saveCloudConfig()          (admin)
POST /api/cloud-backup/test       → testCloudConnection()      (admin)
```

### 6. `backend/src/services/fullBackupTimer.ts` (~30 lines)

Standalone module that starts the 30-minute full backup interval on app startup:

```typescript
import { startFullBackupTimer } from './cloudBackup.js';
export function initFullBackupTimer() { startFullBackupTimer(); }
```

Called from `backend/src/index.ts` after DB connection is ready.

## Files to modify

### 7. `backend/src/env.ts` — make cloud vars optional:

```typescript
CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT || '',
CLOUDFLARE_R2_BUCKET: process.env.CLOUDFLARE_R2_BUCKET || '',
CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
CLOUDFLARE_BACKUP_ENABLED: process.env.CLOUDFLARE_BACKUP_ENABLED || '',
```

### 8. `backend/src/app.ts` — add after backup routes (line 170):

```typescript
import { cloudBackupRoutes } from './routes/cloudBackup.js';
app.use('/api/cloud-backup', authMiddleware);
app.use('/api/cloud-backup', requireAdmin);
app.use('/api/cloud-restore', authMiddleware);
app.use('/api/cloud-restore', requireAdmin);
app.route('/api', cloudBackupRoutes);
```

### 9. `backend/src/index.ts` — start full backup timer:

```typescript
import { initFullBackupTimer } from './services/fullBackupTimer.js';
// After DB migration, before starting server:
initFullBackupTimer();
```

### 10. `backend/src/routes/scoring.ts:376` — after audit log:

```typescript
import { scheduleDeltaBackup } from '../services/cloudBackup.js';
// After line 376 (await audit(...)):
scheduleDeltaBackup(matchId, stageId, registrationId);
```

### 11. `backend/package.json` — add:

```json
"aws4fetch": "^1.0.20"
```

### 12. `frontend/src/services/api.ts` — add:

```typescript
triggerCloudBackup: (): Promise<{ success: boolean; key: string; size: number }> =>
  request('/api/cloud-backup', { method: 'POST' }),

getCloudBackupStatus: (): Promise<CloudBackupStatus> =>
  request('/api/cloud-backup/status'),

saveCloudConfig: (config: { provider, enabled, endpoint?, bucket?, accessKeyId?, secretAccessKey?, serviceAccountJson?, folderId? }) =>
  request('/api/cloud-backup/config', { method: 'PUT', body: JSON.stringify(config) }),

testCloudConnection: (): Promise<{ success: boolean; error?: string }> =>
  request('/api/cloud-backup/test', { method: 'POST' }),

restoreFromCloud: (): Promise<{ success: boolean; message: string }> =>
  request('/api/cloud-restore', { method: 'POST' }),
```

### 13. `frontend/src/components/settings/DatabaseSettings.tsx` — add cloud config section:

```
┌─ Local Backup ──────────────────────────────────────┐
│  [Export SQL]  [Import SQL]                           │
│  Manual export/import of full database as .sql file   │
└──────────────────────────────────────────────────────┘

┌─ Cloud Backup ───────────────────────────────────────┐
│                                                       │
│  Provider:  [None ▼]                                  │
│             [Cloudflare R2]                           │
│             [Google Drive]                            │
│                                                       │
│  ☑ Enable automatic cloud backup                     │
│                                                       │
│  ═══ Cloudflare R2 fields (shown when R2 selected) ═══│
│  Endpoint    [                                    ]    │
│  Bucket      [                                    ]    │
│  Access Key  [                                    ]    │
│  Secret Key  [••••••••                            ]    │
│                                                       │
│  ═══ Google Drive fields (shown when GDrive selected) ═│
│  Service Account JSON  [                    ] [Paste] │
│  Folder ID             [                    ]         │
│                                                       │
│  [Test Connection]  [Save Configuration]              │
│                                                       │
│  Status: ● Connected  │  Last full: 14:30  │  Δ: 12   │
│  [Backup Now]  [Restore from Cloud]                   │
└──────────────────────────────────────────────────────┘
```

Provider dropdown controls which fields are visible. Changing providers clears the previous provider's fields from the form (doesn't delete stored config until "Save" is clicked).

### 14. `frontend/src/i18n/locales/en.json` + `sk.json` — add:

```json
"cloud": {
  "title": "Cloud Backup",
  "description": "Automatically back up match data to cloud storage. Full backups every 30 minutes + deltas after each score.",
  "providerLabel": "Provider",
  "providerNone": "None",
  "providerR2": "Cloudflare R2",
  "providerGDrive": "Google Drive",
  "enableToggle": "Enable cloud backup",
  "r2EndpointLabel": "R2 Endpoint",
  "r2EndpointHint": "https://<account_id>.r2.cloudflarestorage.com",
  "r2BucketLabel": "Bucket",
  "r2AccessKeyLabel": "Access Key ID",
  "r2SecretKeyLabel": "Secret Access Key",
  "gdriveJsonLabel": "Service Account JSON",
  "gdriveJsonHint": "Paste the full JSON key from Google Cloud Console",
  "gdriveFolderLabel": "Folder ID",
  "gdriveFolderHint": "e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgV",
  "gdriveSetupGuide": "Setup guide: Create a folder in Google Drive, share it with your service account email (Editor), then paste the folder ID from the URL.",
  "secretKeyMasked": "(unchanged)",
  "testConnection": "Test Connection",
  "testing": "Testing...",
  "testSuccess": "Connection successful",
  "testFailed": "Connection failed: {{error}}",
  "saveConfig": "Save Configuration",
  "configSaved": "Configuration saved",
  "noSecretKey": "Enter a new secret key to change it",
  "status": "Status",
  "configured": "Configured",
  "notConfigured": "Not configured",
  "enabled": "Enabled",
  "disabled": "Disabled",
  "lastBackup": "Last backup",
  "lastFullBackup": "Last full backup",
  "deltasSinceFull": "Deltas since full",
  "never": "Never",
  "backupNow": "Backup to Cloud Now",
  "backingUp": "Backing up...",
  "backupSuccess": "Cloud backup completed",
  "backupError": "Cloud backup failed",
  "restoreFromCloud": "Restore from Cloud",
  "restoring": "Restoring...",
  "restoreConfirm": "Restore from Cloud?",
  "restoreWarning": "This will replace ALL local data with the cloud backup. This action cannot be undone.",
  "restoreSuccess": "Database restored from cloud. Reloading...",
  "restoreError": "Cloud restore failed"
}
```

### 15. `.env.example` — add:

```env
# Cloud Backup (optional — per-user config via Settings UI is preferred for Electron)
# Provider: "r2" or "gdrive" (leave empty to disable)
# CLOUD_PROVIDER=
# CLOUD_BACKUP_ENABLED=false
#
# Cloudflare R2
# CLOUDFLARE_R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
# CLOUDFLARE_R2_BUCKET=ipscscore-backups
# CLOUDFLARE_R2_ACCESS_KEY_ID=
# CLOUDFLARE_R2_SECRET_ACCESS_KEY=
```

## JSON import logic (inside transaction)

```
BEGIN;
  DELETE FROM target_scores;
  DELETE FROM chrono_results;
  DELETE FROM stage_scores;
  DELETE FROM match_registrations;
  DELETE FROM stages;
  DELETE FROM matches;
  DELETE FROM shooters;
  DELETE FROM app_settings;
  DELETE FROM admin_sessions;
  DELETE FROM scorer_sessions;

  INSERT INTO matches ...;
  INSERT INTO stages ...;
  INSERT INTO shooters ...;
  INSERT INTO match_registrations ...;
  INSERT INTO stage_scores ...;
  INSERT INTO target_scores ...;
  INSERT INTO chrono_results ...;
  INSERT INTO app_settings ...;
  INSERT INTO admin_sessions ...;
  INSERT INTO scorer_sessions ...;
COMMIT;

-- Then replay deltas (outside transaction, each is a small UPSERT):
-- For each delta: UPSERT stage_scores, UPSERT target_scores, UPSERT chrono_results
```

## Error handling

| Scenario | Behavior |
|---|---|
| Provider unreachable (delta) | Log error, skip. Next score's flush will retry. |
| Provider unreachable (full) | Log error, skip. Timer retries next cycle. |
| Provider auth fails | Log error, skip. UI shows "Connection failed". |
| JSON export fails | Log error, skip. No impact on scoring. |
| JSON import fails | Return error to admin. Transaction rolled back. |
| No provider configured | Timers no-op. Delta flushes no-op. UI shows provider dropdown. |
| Provider disabled | All timers stop. Delta flushes stop. |
| Delta upload fails mid-batch | Remaining deltas stay in `pendingDeltas[]`, retry on next flush. |
| Full backup fails | Deltas accumulate (up to 30 min worth). Next timer cycle retries. |
| GDrive token expired | Re-sign JWT → POST to token endpoint → retry upload. |
| GDrive file not found | Clear fileIdCache for that path → retry. |

## Restore procedure for disaster recovery

### Docker deployment (R2)
1. New machine: `git clone` + `docker compose up`
2. Set `CLOUDFLARE_R2_*` env vars in `.env`
3. Start app, go to Settings > "Restore from Cloud"
4. Confirm → backend downloads `full.json.gz` → gunzip → import → replay deltas → page reloads
5. All data restored.

### Docker deployment (Google Drive)
1. New machine: `git clone` + `docker compose up`
2. Go to Settings > Cloud Backup > select Google Drive
3. Paste Service Account JSON + Folder ID
4. Click "Test Connection" → confirm connected
5. Click "Restore from Cloud" → confirm
6. Page reloads, all data restored.

### Electron deployment
1. Install IPSCScore on new machine
2. Start app, log in (default password)
3. Go to Settings > Cloud Backup > select provider > enter credentials
4. Click "Test Connection" → confirm connected
5. Click "Restore from Cloud" > confirm
6. Page reloads, all data restored.

## Size estimate

### Full backup (38 MB database, compressed)

Wait — the user said 38 MB total database. That means the SELECT * query returns 38 MB of raw data. After gzip: ~10 MB per full backup.

### Daily bandwidth

| Component | Count | Size each | Total |
|---|---|---|---|
| Full backups (every 30 min) | ~20 | ~10 MB | ~200 MB |
| Score deltas | ~600 | ~3-5 KB | ~1.8 MB |
| **Total** | | | **~202 MB** |

### Storage

| File | Size | Rotation |
|---|---|---|
| `full.json.gz` | ~10 MB | Overwrite on each full backup |
| `full-<ts>.json.gz` | ~10 MB × 3 | Keep 3 most recent |
| `deltas/*.json` | ~3 KB × 600 | Cleared after each full backup |
| **Peak storage** | | **~40 MB** |

**R2 free tier**: 10 GB storage, 10M PUT operations/month — **$0** for an entire match day.
**Google Drive free tier**: 15 GB storage — **$0** for backup (shared with Gmail/Photos, but 40 MB is negligible).

## Verification plan

1. TypeScript check passes (backend + frontend)
2. Unit: `exportFullDbAsJson()` → gzip → gunzip → `importJsonToDb()` roundtrip preserves all data
3. Unit: `buildDeltaPayload()` produces correct score + targets for a given registration
4. Unit: delta replay UPSERTs correctly update existing rows
5. Unit: GDrive JWT signing produces valid access token
6. Unit: GDrive file operations (upload, download, list, delete) work against test folder
7. Integration: score save → delta appears in provider within 5-6 seconds
8. Integration: full backup timer fires after 30 min, compresses and uploads, clears deltas
9. Integration: restore downloads full + deltas, imports correctly
10. Smoke: without provider configured, scoring works (backup silently skipped)
11. Smoke: manual SQL export/import still works unchanged
12. Smoke: changing provider dropdown doesn't affect stored config until "Save"

## Trade-offs

1. **`aws4fetch` dependency** — tiny (2 KB), maintained by Cloudflare Workers team. Far lighter than `@aws-sdk/client-s3`. Used only for R2; Google Drive uses no new deps.

2. **Delta ordering**: deltas use ISO timestamps in keys, so `listKeys` returns them in chronological order. No additional ordering needed.

3. **Race condition on deltas**: if a score is saved while `flushDeltas` is running, the delta stays in `pendingDeltas[]` and is flushed on the next timer tick. No data lost.

4. **Full backup during active scoring**: the 30-minute timer doesn't block scoring. Full backup runs independently. Deltas continue to accumulate and are cleared only after successful full backup upload.

5. **Restore replays deltas**: up to 30 minutes × ~50 scores/hour = ~25 deltas. Each UPSERT takes ~1ms. Total replay: ~25ms. Negligible.

6. **Secret key stored plain in DB** — same as `admin_password_hash` and `scorer_trust_token`. Local file only. Bucket/folder is private.

7. **Instance ID per database** — survives database restore (it's in `app_settings` which is backed up). Different databases sharing a bucket/folder don't collide.

8. **Manual SQL backup is independent** — no dependency on cloud config. Works even if cloud backup is not configured.

9. **Google Drive service account setup is 7 steps** vs R2's 3 steps. But Google Drive is more familiar to most users, and files are visible in their own Drive (vs R2 dashboard). Trade-off: more setup steps, better visibility.

10. **Google Drive JWT tokens are short-lived (1 hour)** — but the provider re-signs automatically on each API call. No refresh token management needed.
