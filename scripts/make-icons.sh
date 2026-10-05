#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to this script's directory so it works from any cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ICON_SVG="$PROJECT_DIR/build/icon.svg"
ICON_PNG="$PROJECT_DIR/build/icon.png"
ICON_ICNS="$PROJECT_DIR/build/icon.icns"
ICONSET_DIR="$PROJECT_DIR/build/icon.iconset"
FAVICON_SVG="$PROJECT_DIR/public/favicon.svg"

# Verify required command line utilities exist
if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "Error: 'rsvg-convert' is required but not installed or not in PATH." >&2
  exit 1
fi

if ! command -v iconutil >/dev/null 2>&1; then
  echo "Error: 'iconutil' is required but not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -f "$ICON_SVG" ]]; then
  echo "Error: Input artwork not found at $ICON_SVG" >&2
  exit 1
fi

# Produce 1024x1024 PNG
echo "Generating $ICON_PNG..."
rsvg-convert -w 1024 -h 1024 "$ICON_SVG" -o "$ICON_PNG"

# Produce macOS iconset with standard 10 sizes
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

echo "Generating iconset files..."
rsvg-convert -w 16 -h 16 "$ICON_SVG" -o "$ICONSET_DIR/icon_16x16.png"
rsvg-convert -w 32 -h 32 "$ICON_SVG" -o "$ICONSET_DIR/icon_16x16@2x.png"
rsvg-convert -w 32 -h 32 "$ICON_SVG" -o "$ICONSET_DIR/icon_32x32.png"
rsvg-convert -w 64 -h 64 "$ICON_SVG" -o "$ICONSET_DIR/icon_32x32@2x.png"
rsvg-convert -w 128 -h 128 "$ICON_SVG" -o "$ICONSET_DIR/icon_128x128.png"
rsvg-convert -w 256 -h 256 "$ICON_SVG" -o "$ICONSET_DIR/icon_128x128@2x.png"
rsvg-convert -w 256 -h 256 "$ICON_SVG" -o "$ICONSET_DIR/icon_256x256.png"
rsvg-convert -w 512 -h 512 "$ICON_SVG" -o "$ICONSET_DIR/icon_256x256@2x.png"
rsvg-convert -w 512 -h 512 "$ICON_SVG" -o "$ICONSET_DIR/icon_512x512.png"
rsvg-convert -w 1024 -h 1024 "$ICON_SVG" -o "$ICONSET_DIR/icon_512x512@2x.png"

# Convert iconset directory to .icns
echo "Generating $ICON_ICNS..."
iconutil -c icns "$ICONSET_DIR" -o "$ICON_ICNS"

# Delete temporary iconset directory
rm -rf "$ICONSET_DIR"

# Copy build/icon.svg to public/favicon.svg
mkdir -p "$(dirname "$FAVICON_SVG")"
cp "$ICON_SVG" "$FAVICON_SVG"

echo "Icons successfully generated."
