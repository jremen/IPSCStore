#!/usr/bin/env bash
# Download PostgreSQL binaries for Electron bundling.
# Usage: ./scripts/download-pg.sh [platform]
#   platform: mac-arm64 | mac-x64 | win-x64 | linux-x64 | linux-arm64
#   Defaults to current platform.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../resources"

# Determine platform
PLATFORM="${1:-}"
if [ -z "$PLATFORM" ]; then
  ARCH=$(uname -m)
  OS=$(uname -s)
  case "$OS" in
    Darwin) PLATFORM="mac-${ARCH//arm64/arm64}" ;;
    Linux) PLATFORM="linux-${ARCH//x86_64/x64}" ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="win-x64" ;;
    *) echo "Unsupported OS: $OS"; exit 1 ;;
  esac
  # Normalize arm64
  if [ "$PLATFORM" = "mac-arm64" ]; then PLATFORM="mac-arm64"; fi
fi

# PostgreSQL version
PG_VERSION="16.4"

# Map platform to PostgreSQL download info
case "$PLATFORM" in
  mac-arm64)
    PG_DOWNLOAD_OS="darwin"
    PG_DOWNLOAD_ARCH="arm64"
    PG_TARBALL="postgresql-${PG_VERSION}-darwin-arm64-binaries.tar.gz"
    PG_URL="https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-darwin-arm64-binaries.tar.gz"
    ;;
  mac-x64)
    PG_DOWNLOAD_OS="darwin"
    PG_DOWNLOAD_ARCH="x64"
    PG_TARBALL="postgresql-${PG_VERSION}-darwin-x86_64-binaries.tar.gz"
    PG_URL="https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-darwin-x86_64-binaries.tar.gz"
    ;;
  win-x64)
    PG_DOWNLOAD_OS="win"
    PG_DOWNLOAD_ARCH="x64"
    PG_TARBALL="postgresql-${PG_VERSION}-windows-x64-binaries.zip"
    PG_URL="https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-windows-x64-binaries.zip"
    ;;
  linux-x64)
    PG_DOWNLOAD_OS="linux"
    PG_DOWNLOAD_ARCH="x64"
    PG_TARBALL="postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz"
    PG_URL="https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz"
    ;;
  linux-arm64)
    PG_DOWNLOAD_OS="linux"
    PG_DOWNLOAD_ARCH="arm64"
    PG_TARBALL="postgresql-${PG_VERSION}-linux-arm64-binaries.tar.gz"
    PG_URL="https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-linux-arm64-binaries.tar.gz"
    ;;
  *)
    echo "Unknown platform: $PLATFORM"
    echo "Supported: mac-arm64, mac-x64, win-x64, linux-x64, linux-arm64"
    exit 1
    ;;
esac

PG_DIR="$RESOURCES_DIR/pg"
PG_BIN_DIR="$PG_DIR/bin"

echo "Downloading PostgreSQL $PG_VERSION for $PLATFORM..."
echo "  URL: $PG_URL"
echo "  Target: $PG_DIR"

# Clean previous download
rm -rf "$PG_DIR"

# Create temp directory
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Download
echo "Downloading..."
curl -fSL -o "$TMPDIR/$PG_TARBALL" "$PG_URL"

# Extract
echo "Extracting..."
tar -xzf "$TMPDIR/$PG_TARBALL" -C "$TMPDIR"

# Find the extracted directory (varies by archive)
EXTRACTED_DIR=$(find "$TMPDIR" -maxdepth 1 -type d -name "pgsql" -o -name "postgresql*" | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
  echo "Could not find extracted PostgreSQL directory"
  ls -la "$TMPDIR"
  exit 1
fi

echo "Found extracted directory: $EXTRACTED_DIR"

# Copy only the essential binaries
mkdir -p "$PG_BIN_DIR"
for bin in initdb pg_ctl postgres createdb psql; do
  BIN_EXT=""
  if [ "$PG_DOWNLOAD_OS" = "win" ]; then
    BIN_EXT=".exe"
  fi
  SRC="$EXTRACTED_DIR/bin/${bin}${BIN_EXT}"
  if [ -f "$SRC" ]; then
    cp "$SRC" "$PG_BIN_DIR/"
    echo "  Copied: ${bin}${BIN_EXT}"
  else
    echo "  WARNING: ${bin}${BIN_EXT} not found in $EXTRACTED_DIR/bin/"
  fi
done

# Copy required shared libraries (macOS/Linux)
if [ "$PG_DOWNLOAD_OS" != "win" ]; then
  # Copy lib directory (needed by postgres binary)
  if [ -d "$EXTRACTED_DIR/lib" ]; then
    cp -r "$EXTRACTED_DIR/lib" "$PG_DIR/"
    echo "  Copied: lib/"
  fi
  # Copy share directory (needed for timezone data, etc.)
  if [ -d "$EXTRACTED_DIR/share" ]; then
    mkdir -p "$PG_DIR/share"
    cp -r "$EXTRACTED_DIR/share/timezone" "$PG_DIR/share/" 2>/dev/null || true
    cp -r "$EXTRACTED_DIR/share/postgresql" "$PG_DIR/share/" 2>/dev/null || true
    echo "  Copied: share/"
  fi
else
  # Windows: copy lib and share directories
  if [ -d "$EXTRACTED_DIR/lib" ]; then
    cp -r "$EXTRACTED_DIR/lib" "$PG_DIR/"
    echo "  Copied: lib/"
  fi
  if [ -d "$EXTRACTED_DIR/share" ]; then
    cp -r "$EXTRACTED_DIR/share" "$PG_DIR/"
    echo "  Copied: share/"
  fi
fi

echo ""
echo "PostgreSQL binaries installed to: $PG_DIR"
echo "Done!"