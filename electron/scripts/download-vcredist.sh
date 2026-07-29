#!/usr/bin/env bash
# Download Microsoft Visual C++ 2015-2022 Redistributable (x64) for bundling
# with the Windows NSIS installer. This is NOT included in the repo due to
# Microsoft licensing — run this script before building for Windows.
#
# Usage: bash scripts/download-vcredist.sh
#
# The downloaded file lives at resources/vc_redist.x64.exe and is bundled
# into the installer by electron-builder.yml (extraResources). The NSIS
# installer (resources/installer/vcredist.nsh) runs it automatically if
# the runtime is not already installed on the target system.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../resources"
VCREDIST_URL="https://aka.ms/vs/17/release/vc_redist.x64.exe"
VCREDIST_DEST="$RESOURCES_DIR/vc_redist.x64.exe"

echo "Downloading Visual C++ 2015-2022 Redistributable (x64)..."
echo "  From: $VCREDIST_URL"
echo "  To:   $VCREDIST_DEST"

mkdir -p "$RESOURCES_DIR"

if curl -fSL --retry 3 -o "$VCREDIST_DEST" "$VCREDIST_URL"; then
  echo "Done. $(ls -lh "$VCREDIST_DEST" | awk '{print $5}') downloaded."
else
  echo "ERROR: Download failed."
  echo "Download manually from: $VCREDIST_URL"
  echo "Place it at: $VCREDIST_DEST"
  exit 1
fi
