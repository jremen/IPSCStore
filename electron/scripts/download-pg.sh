#!/usr/bin/env bash
# Download PostgreSQL binaries for Electron bundling.
# Usage: ./scripts/download-pg.sh [platform]
#   platform: mac-arm64 | mac-x64 | win-x64 | linux-x64 | linux-arm64
#   Defaults to current platform.
#
# Download sources (in order):
#   1. EDB official binaries (https://www.enterprisedb.com/download-postgresql-binaries)
#   2. Homebrew PostgreSQL (macOS only, if EDB download fails)
#   3. theseus-rs/postgresql-binaries on GitHub (fallback)

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
fi

# PostgreSQL version — must match EDB binary release
PG_VERSION="16.13"
PG_MAJOR="${PG_VERSION%%.*}"

PG_DIR="$RESOURCES_DIR/pg"
PG_BIN_DIR="$PG_DIR/bin"

echo "Setting up PostgreSQL $PG_VERSION binaries for $PLATFORM..."
echo "  Target: $PG_DIR"

# Clean previous download — remove the entire pg directory to ensure
# no stale files from other platforms remain (e.g., .exe/.dll from Windows builds)
if [ -d "$PG_DIR" ]; then
  rm -rf "$PG_DIR" 2>/dev/null || true
fi

# --- Map platform to EDB download info ---
# EDB binary URLs: https://www.enterprisedb.com/download-postgresql-binaries
# The URLs follow the pattern: https://get.enterprisedb.com/postgresql/postgresql-{version}-1-{os}-binaries.{ext}
case "$PLATFORM" in
  mac-arm64)
    # EDB provides a universal macOS binary (works on both arm64 and x64)
    EDB_OS="osx"
    EDB_EXT="zip"
    EDB_EXTRACT_SUBDIR="bin"
    ;;
  mac-x64)
    EDB_OS="osx"
    EDB_EXT="zip"
    EDB_EXTRACT_SUBDIR="bin"
    ;;
  win-x64)
    EDB_OS="windows-x64"
    EDB_EXT="zip"
    EDB_EXTRACT_SUBDIR="bin"
    ;;
  win-arm64)
    # EDB doesn't provide native Windows ARM64 binaries.
    # No ARM64 PG binaries exist anywhere (not from EDB, theseus-rs, or Homebrew).
    # Use the EDB x64 binaries which run under Windows x64 emulation on ARM64.
    echo "NOTE: No native ARM64 PostgreSQL binaries exist for Windows."
    echo "Using x64 binaries — these require Windows x64 emulation (built into Windows 11 ARM64)."
    EDB_OS="windows-x64"
    EDB_EXT="zip"
    EDB_EXTRACT_SUBDIR="bin"
    ;;
  linux-x64)
    EDB_OS="linux-x64"
    EDB_EXT="tar.gz"
    EDB_EXTRACT_SUBDIR="bin"
    ;;
  linux-arm64)
    # EDB doesn't provide arm64 Linux binaries, fall through to theseus-rs
    EDB_OS=""
    ;;
  *)
    echo "Unknown platform: $PLATFORM"
    echo "Supported: mac-arm64, mac-x64, win-x64, linux-x64, linux-arm64"
    exit 1
    ;;
esac

# --- Try EDB official binaries first (except linux-arm64) ---
EDB_SUCCESS=false
if [ -n "$EDB_OS" ]; then
  EDB_ARCHIVE="postgresql-${PG_VERSION}-1-${EDB_OS}-binaries.${EDB_EXT}"
  EDB_URL="https://get.enterprisedb.com/postgresql/${EDB_ARCHIVE}"

  echo "Downloading from EDB: $EDB_URL"
  TMPDIR=$(mktemp -d)

  if curl -fSL --retry 3 -o "$TMPDIR/$EDB_ARCHIVE" "$EDB_URL" 2>/dev/null; then
    echo "Extracting..."
    mkdir -p "$TMPDIR/extracted"

    if [ "$EDB_EXT" = "zip" ]; then
      # macOS/Windows: zip archives
      if command -v unzip &>/dev/null; then
        unzip -q "$TMPDIR/$EDB_ARCHIVE" -d "$TMPDIR/extracted"
      else
        # Python fallback for unzip
        python3 -c "import zipfile; zipfile.ZipFile('$TMPDIR/$EDB_ARCHIVE').extractall('$TMPDIR/extracted')"
      fi
    else
      # Linux: tar.gz archives
      tar -xzf "$TMPDIR/$EDB_ARCHIVE" -C "$TMPDIR/extracted"
    fi

    # Find the extracted directory — EDB archives contain a single top-level dir like "pgsql" or "postgresql-16.14-1"
    EXTRACTED_DIR=$(find "$TMPDIR/extracted" -maxdepth 1 -type d ! -path "$TMPDIR/extracted" | head -1)

    if [ -z "$EXTRACTED_DIR" ]; then
      EXTRACTED_DIR="$TMPDIR/extracted"
    fi

    echo "Found extracted directory: $EXTRACTED_DIR"
    ls "$EXTRACTED_DIR/" | head -10

    # Copy essential binaries
    mkdir -p "$PG_BIN_DIR"
    for bin in initdb pg_ctl postgres createdb psql pg_dump pg_restore; do
      BIN_EXT=""
      if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
        BIN_EXT=".exe"
      fi
      SRC="$EXTRACTED_DIR/bin/${bin}${BIN_EXT}"
      if [ -f "$SRC" ]; then
        cp "$SRC" "$PG_BIN_DIR/"
        echo "  Copied: ${bin}${BIN_EXT}"
      else
        echo "  WARNING: ${bin}${BIN_EXT} not found"
      fi
    done

    # On Windows, the EDB distribution puts required DLLs in bin/ alongside the EXEs.
    # These DLLs (libpq.dll, libssl-3-x64.dll, libintl-9.dll, etc.) are required
    # by postgres.exe and pg_ctl.exe at runtime. They MUST be in the same directory
    # as the EXEs or on the system PATH — the lib/ directory alone is not enough.
    if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
      find "$EXTRACTED_DIR/bin" -maxdepth 1 -name '*.dll' -exec cp {} "$PG_BIN_DIR/" \;
      echo "  Copied: bin/*.dll (Windows runtime DLLs)"
    fi

    # Copy lib directory — shared libraries (.dylib/.so/.dll), skip static archives (.a), libtool (.la), pkg-config (.pc)
    # Also copy the lib/postgresql/ subdirectory which contains extension modules
    if [ -d "$EXTRACTED_DIR/lib" ]; then
      mkdir -p "$PG_DIR/lib"
      if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
        # Windows: copy DLLs (extension modules like adminpack.dll, etc.)
        find "$EXTRACTED_DIR/lib" -maxdepth 1 -name '*.dll' -exec cp {} "$PG_DIR/lib/" \;
        echo "  Copied: lib/*.dll"
      else
        # macOS/Linux: copy shared libraries only (skip .a, .la, .pc)
        find "$EXTRACTED_DIR/lib" -maxdepth 1 \( -name '*.dylib' -o -name '*.so*' \) -exec cp {} "$PG_DIR/lib/" \;
        echo "  Copied: lib/*.dylib"
      fi
      # Copy extension modules (lib/postgresql/*.so or *.dylib)
      if [ -d "$EXTRACTED_DIR/lib/postgresql" ]; then
        mkdir -p "$PG_DIR/lib/postgresql"
        cp "$EXTRACTED_DIR/lib/postgresql"/* "$PG_DIR/lib/postgresql/" 2>/dev/null || true
        echo "  Copied: lib/postgresql/"
      fi
    fi

    # Copy share directory (timezone, postgres.bki, extension control files, etc.)
    # Layout differs between platforms:
    #   macOS/Linux: EDB puts files in share/postgresql/ (extension/, postgres.bki, etc.)
    #   Windows: EDB puts files directly in share/ (extension/, postgres.bki, etc.)
    # PostgreSQL derives pkgdatadir relative to its binary:
    #   macOS: pg/bin/../share/postgresql/
    #   Windows: pg/bin/../share/
    # We must preserve the platform-specific layout so PostgreSQL can find its files.
    if [ -d "$EXTRACTED_DIR/share" ]; then
      mkdir -p "$PG_DIR/share"
      if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
        # Windows: copy share/ contents directly to pg/share/ (matching EDB layout)
        # This includes: extension/, contrib/, postgres.bki, tsearch_data/, timezone/, etc.
        cp -r "$EXTRACTED_DIR/share"/* "$PG_DIR/share/" 2>/dev/null || true
        echo "  Copied: share/* (Windows layout)"
      else
        # macOS/Linux: EDB puts files in share/postgresql/
        if [ -d "$EXTRACTED_DIR/share/postgresql" ]; then
          cp -r "$EXTRACTED_DIR/share/postgresql" "$PG_DIR/share/"
          echo "  Copied: share/postgresql/"
        fi
        if [ -d "$EXTRACTED_DIR/share/timezone" ]; then
          cp -r "$EXTRACTED_DIR/share/timezone" "$PG_DIR/share/"
          echo "  Copied: share/timezone/"
        elif [ -d "$EXTRACTED_DIR/share/postgresql/timezone" ]; then
          mkdir -p "$PG_DIR/share/timezone"
          cp -r "$EXTRACTED_DIR/share/postgresql/timezone"/* "$PG_DIR/share/timezone/"
          echo "  Copied: share/timezone/ (from postgresql dir)"
        fi
      fi
    fi

    EDB_SUCCESS=true
    rm -rf "$TMPDIR"
  else
    echo "EDB download failed, trying fallback..."
    rm -rf "$TMPDIR"
  fi
fi

# --- Fallback: Homebrew on macOS ---
if [ "$EDB_SUCCESS" = false ] && [[ "$PLATFORM" == mac-* ]]; then
  echo "Trying Homebrew PostgreSQL..."
  BREW_PG_BIN=""
  for pg_pkg in "postgresql@${PG_MAJOR}" "postgresql@17" "postgresql@16" "postgresql"; do
    BREW_PREFIX=$(brew --prefix "$pg_pkg" 2>/dev/null || true)
    if [ -n "$BREW_PREFIX" ] && [ -x "$BREW_PREFIX/bin/pg_ctl" ]; then
      BREW_PG_BIN="$BREW_PREFIX/bin"
      echo "Found Homebrew PostgreSQL at: $BREW_PG_BIN"
      break
    fi
  done

  if [ -z "$BREW_PG_BIN" ]; then
    for dir in /opt/homebrew/opt/postgresql@16/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql/bin /usr/local/opt/postgresql@16/bin /usr/local/opt/postgresql@17/bin /usr/local/opt/postgresql/bin; do
      if [ -x "$dir/pg_ctl" ]; then
        BREW_PG_BIN="$dir"
        echo "Found system PostgreSQL at: $BREW_PG_BIN"
        break
      fi
    done
  fi

  if [ -n "$BREW_PG_BIN" ]; then
    echo "Copying PostgreSQL binaries from Homebrew..."
    mkdir -p "$PG_BIN_DIR"

    for bin in initdb pg_ctl postgres createdb psql pg_dump pg_restore; do
      if [ -f "$BREW_PG_BIN/$bin" ]; then
        cp "$BREW_PG_BIN/$bin" "$PG_BIN_DIR/"
        echo "  Copied: $bin"
      else
        echo "  WARNING: $bin not found in $BREW_PG_BIN"
      fi
    done

    BREW_LIB_DIR=$(dirname "$BREW_PG_BIN")/lib
    if [ -d "$BREW_LIB_DIR" ]; then
      mkdir -p "$PG_DIR/lib"
      # Copy only shared libraries, skip static archives
      find "$BREW_LIB_DIR" -maxdepth 1 \( -name '*.dylib' -o -name '*.so*' \) -exec cp {} "$PG_DIR/lib/" \; 2>/dev/null || true
      echo "  Copied: lib/*.dylib"
      # Copy extension modules
      if [ -d "$BREW_LIB_DIR/postgresql" ]; then
        mkdir -p "$PG_DIR/lib/postgresql"
        cp "$BREW_LIB_DIR/postgresql"/* "$PG_DIR/lib/postgresql/" 2>/dev/null || true
        echo "  Copied: lib/postgresql/"
      fi
    fi

    BREW_SHARE_DIR=""
    for candidate in \
      "$BREW_LIB_DIR/../share/postgresql" \
      "$BREW_LIB_DIR/../share/postgresql@${PG_MAJOR}" \
      $(echo /opt/homebrew/Cellar/postgresql@${PG_MAJOR}/*/share/postgresql@${PG_MAJOR} 2>/dev/null) \
      $(echo /usr/local/Cellar/postgresql@${PG_MAJOR}/*/share/postgresql@${PG_MAJOR} 2>/dev/null); do
      if [ -d "$candidate" ] && [ -f "$candidate/postgresql.conf.sample" -o -f "$candidate/postgres.bki" ]; then
        BREW_SHARE_DIR="$candidate"
        break
      fi
    done

    if [ -n "$BREW_SHARE_DIR" ] && [ -d "$BREW_SHARE_DIR" ]; then
      mkdir -p "$PG_DIR/share/postgresql"
      cp -r "$BREW_SHARE_DIR"/* "$PG_DIR/share/postgresql/" 2>/dev/null || true
      echo "  Copied: share/postgresql/"
    fi

    if [ -d "$PG_DIR/share/postgresql/timezone" ]; then
      mkdir -p "$PG_DIR/share/timezone"
      cp -r "$PG_DIR/share/postgresql/timezone"/* "$PG_DIR/share/timezone/" 2>/dev/null || true
      echo "  Copied: share/timezone/ (from postgresql dir)"
    else
      for tz_candidate in \
        "$BREW_LIB_DIR/../share/timezone" \
        /opt/homebrew/share/timezone \
        /usr/local/share/timezone; do
        if [ -d "$tz_candidate" ]; then
          mkdir -p "$PG_DIR/share/timezone"
          cp -r "$tz_candidate"/* "$PG_DIR/share/timezone/" 2>/dev/null || true
          echo "  Copied: share/timezone/"
          break
        fi
      done
    fi

    EDB_SUCCESS=true
    echo ""
    echo "PostgreSQL binaries installed from Homebrew to: $PG_DIR"
  fi
fi

# --- Fallback: theseus-rs/postgresql-binaries on GitHub ---
if [ "$EDB_SUCCESS" = false ]; then
  echo "Downloading from theseus-rs/postgresql-binaries on GitHub..."

  # Map platform to Rust target triple
  case "$PLATFORM" in
    mac-arm64)  TARGET="aarch64-apple-darwin" ;;
    mac-x64)    TARGET="x86_64-apple-darwin" ;;
    win-x64)    TARGET="x86_64-pc-windows-msvc" ;;
    win-arm64)  TARGET="aarch64-pc-windows-msvc" ;;
    linux-x64)  TARGET="x86_64-unknown-linux-gnu" ;;
    linux-arm64) TARGET="aarch64-unknown-linux-gnu" ;;
  esac

  # theseus-rs uses three-part versioning (e.g., 16.13.0) for tags and filenames
  THESEUS_VERSION="${PG_VERSION}.0"
  PG_TARBALL="postgresql-${THESEUS_VERSION}-${TARGET}.tar.gz"
  PG_URL="https://github.com/theseus-rs/postgresql-binaries/releases/download/${THESEUS_VERSION}/${PG_TARBALL}"

  echo "Downloading from: $PG_URL"
  TMPDIR=$(mktemp -d)
  trap "rm -rf $TMPDIR" EXIT

  curl -fSL -o "$TMPDIR/$PG_TARBALL" "$PG_URL"

  echo "Extracting..."
  mkdir -p "$TMPDIR/extracted"
  tar -xzf "$TMPDIR/$PG_TARBALL" -C "$TMPDIR/extracted"

  EXTRACTED_DIR=$(find "$TMPDIR/extracted" -maxdepth 1 -type d -name "pgsql" -o -name "postgresql*" | head -1)
  if [ -z "$EXTRACTED_DIR" ]; then
    EXTRACTED_DIR="$TMPDIR/extracted"
  fi

  echo "Found extracted directory: $EXTRACTED_DIR"

  mkdir -p "$PG_BIN_DIR"
  for bin in initdb pg_ctl postgres createdb psql pg_restore; do
    BIN_EXT=""
    if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
      BIN_EXT=".exe"
    fi
    SRC="$EXTRACTED_DIR/bin/${bin}${BIN_EXT}"
    if [ -f "$SRC" ]; then
      cp "$SRC" "$PG_BIN_DIR/"
      echo "  Copied: ${bin}${BIN_EXT}"
    else
      echo "  WARNING: ${bin}${BIN_EXT} not found"
    fi
  done

  # On Windows, copy required DLLs from bin/ (runtime dependencies)
  if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
    find "$EXTRACTED_DIR/bin" -maxdepth 1 -name '*.dll' -exec cp {} "$PG_BIN_DIR/" \; 2>/dev/null || true
    echo "  Copied: bin/*.dll (Windows runtime DLLs)"
  fi

  if [ -d "$EXTRACTED_DIR/lib" ]; then
    mkdir -p "$PG_DIR/lib"
    if [ "$PLATFORM" = "win-x64" ] || [ "$PLATFORM" = "win-arm64" ]; then
      find "$EXTRACTED_DIR/lib" -maxdepth 1 -name '*.dll' -exec cp {} "$PG_DIR/lib/" \; 2>/dev/null || true
      echo "  Copied: lib/*.dll"
    else
      find "$EXTRACTED_DIR/lib" -maxdepth 1 \( -name '*.dylib' -o -name '*.so*' \) -exec cp {} "$PG_DIR/lib/" \; 2>/dev/null || true
      echo "  Copied: lib/*.dylib"
    fi
    # Copy extension modules
    if [ -d "$EXTRACTED_DIR/lib/postgresql" ]; then
      mkdir -p "$PG_DIR/lib/postgresql"
      cp "$EXTRACTED_DIR/lib/postgresql"/* "$PG_DIR/lib/postgresql/" 2>/dev/null || true
      echo "  Copied: lib/postgresql/"
    fi
  fi

  if [ -d "$EXTRACTED_DIR/share" ]; then
    mkdir -p "$PG_DIR/share"
    cp -r "$EXTRACTED_DIR/share/timezone" "$PG_DIR/share/" 2>/dev/null || true
    cp -r "$EXTRACTED_DIR/share/postgresql" "$PG_DIR/share/" 2>/dev/null || true
    echo "  Copied: share/"
  fi

  EDB_SUCCESS=true
  rm -rf "$TMPDIR"
fi

# --- Bundle system shared libraries for Linux ---
# On Linux, PostgreSQL binaries dynamically link against system libraries (libxml2, libssl,
# libicu, libkrb5, etc.). These must be bundled with the app for portability.
# RPATH is already set to $ORIGIN/../lib by theseus-rs patchelf, so the bundled .so files
# will be found automatically. Exception: libc.so.6, ld-linux-*.so.1, and linux-vdso.so.1
# cannot be bundled — they are loaded by the kernel before RPATH is consulted.
if [[ "$PLATFORM" == linux-* ]] && [ -d "$PG_BIN_DIR" ]; then
  echo ""
  echo "Bundling system shared libraries for Linux..."

  # Check if ldd is available
  if command -v ldd &>/dev/null; then
    SO_COUNT=0

    # Find all PG binaries and resolve their shared library dependencies
    for bin_file in "$PG_BIN_DIR"/*; do
      [ -f "$bin_file" ] || continue
      # Skip non-ELF files
      file "$bin_file" 2>/dev/null | grep -q "ELF" || continue

      # Get resolved library paths from ldd (follows symlinks)
      ldd "$bin_file" 2>/dev/null | while read -r line; do
        # Parse "libxml2.so.2 => /usr/lib/aarch64-linux-gnu/libxml2.so.2 (0x...)"
        SO_PATH=$(echo "$line" | grep -oE '/\S+\.so(\.[0-9]+)*')
        [ -z "$SO_PATH" ] && continue
        [ -f "$SO_PATH" ] || continue

        # Skip system libraries that cannot be bundled
        SO_BASENAME=$(basename "$SO_PATH")
        case "$SO_BASENAME" in
          libc.so.*|libm.so.*|libpthread.so.*|libdl.so.*|librt.so.*|libresolv.so.*)
            # Part of glibc — cannot bundle, user's system must provide
            ;;
          ld-linux-aarch64.so.*|ld-linux.so.*|ld-linux-x86-64.so.*)
            # Dynamic linker — cannot bundle, loaded by kernel
            ;;
          linux-vdso.so.*|linux-gate.so.*)
            # Virtual shared objects — provided by kernel, cannot bundle
            ;;
          *)
            # Bundlable library — copy to pg/lib/
            DEST_DIR="$PG_DIR/lib"
            mkdir -p "$DEST_DIR"
            cp -L "$SO_PATH" "$DEST_DIR/" 2>/dev/null && {
              # Preserve symlinks if the source has them
              SO_REAL=$(readlink -f "$SO_PATH" 2>/dev/null)
              if [ -n "$SO_REAL" ] && [ "$SO_REAL" != "$SO_PATH" ]; then
                SO_REAL_NAME=$(basename "$SO_REAL")
                cp "$SO_REAL" "$DEST_DIR/$SO_REAL_NAME" 2>/dev/null || true
              fi
              SO_COUNT=$((SO_COUNT + 1))
            }
            ;;
        esac
      done
    done

    if [ "$SO_COUNT" -gt 0 ]; then
      echo "  Copied: $SO_COUNT shared libraries to pg/lib/"
    else
      echo "  No additional shared libraries found (all deps may already be static or in pg/lib/)"
    fi

    # Ensure RPATH is set on all ELF binaries (safety net — theseus-rs already does this)
    if command -v patchelf &>/dev/null; then
      for bin_file in "$PG_BIN_DIR"/*; do
        [ -f "$bin_file" ] || continue
        file "$bin_file" 2>/dev/null | grep -q "ELF" || continue
        patchelf --set-rpath '$ORIGIN/../lib' "$bin_file" 2>/dev/null && \
          echo "  Set RPATH on: $(basename "$bin_file")"
      done
    else
      echo "  WARNING: patchelf not found — RPATH may not be set correctly"
    fi

    # List final bundled .so files
    if [ -d "$PG_DIR/lib" ]; then
      echo ""
      echo "Bundled libraries in pg/lib/:"
      ls -1 "$PG_DIR/lib"/*.so* 2>/dev/null | head -20
      TOTAL=$(ls -1 "$PG_DIR/lib"/*.so* 2>/dev/null | wc -l)
      if [ "$TOTAL" -gt 20 ]; then
        echo "  ... and $((TOTAL - 20)) more"
      fi
    fi
  else
    echo "  WARNING: ldd not found — cannot bundle shared libraries"
    echo "  User must install required system libraries (libxml2, libssl, etc.)"
  fi
fi

if [ "$EDB_SUCCESS" = false ]; then
  echo "ERROR: Could not obtain PostgreSQL binaries from any source"
  exit 1
fi

# Remove macOS quarantine attributes from downloaded binaries.
# When curl downloads .exe/.dll files, macOS marks them with com.apple.quarantine,
# which prevents 7-Zip (used by electron-builder's NSIS installer) from reading them.
if [ "$(uname -s)" = "Darwin" ]; then
  echo "Removing macOS quarantine attributes..."
  xattr -cr "$PG_DIR" 2>/dev/null || true
fi

echo ""
echo "PostgreSQL binaries installed to: $PG_DIR"
echo "Done!"