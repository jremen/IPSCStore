#!/usr/bin/env bash
# Export current database data as seed data for the Electron app bundle.
# Usage: ./scripts/export-seed-data.sh [DATABASE_URL]
#
# This creates a custom-format pg_dump (data only) that can be imported
# with pg_restore on first launch of the Electron app.
# The dump is saved to electron/resources/seed-data.dump

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../resources"

# Default DATABASE_URL — matches PgManager defaults
DATABASE_URL="${1:-postgresql://ipscscore@127.0.0.1:5433/ipscscore}"

SEED_FILE="$RESOURCES_DIR/seed-data.dump"

echo "Exporting database seed data..."
echo "  Source: $DATABASE_URL"
echo "  Output: $SEED_FILE"

# Ensure resources directory exists
mkdir -p "$RESOURCES_DIR"

# Export data-only custom format dump (small and fast to import)
# Exclude _migrations table since the backend's migration runner manages it
pg_dump "$DATABASE_URL" \
  --data-only \
  --format=custom \
  --no-owner \
  --no-privileges \
  --no-comments \
  --exclude-table='_migrations' \
  -f "$SEED_FILE"

FILE_SIZE=$(du -h "$SEED_FILE" | cut -f1)
echo ""
echo "Seed data exported successfully!"
echo "  File: $SEED_FILE"
echo "  Size: $FILE_SIZE"