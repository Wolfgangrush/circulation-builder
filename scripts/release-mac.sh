#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to this script so it works regardless of current working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Verify required signing identity and notary keychain profile exist in environment
if [[ -z "${CB_SIGN_IDENTITY:-}" || -z "${CB_NOTARY_PROFILE:-}" ]]; then
  echo "Usage: CB_SIGN_IDENTITY=\"<identity>\" CB_NOTARY_PROFILE=\"<profile>\" $0" >&2
  echo "Required environment variables CB_SIGN_IDENTITY and CB_NOTARY_PROFILE must be set." >&2
  exit 2
fi

# Configurable staging directory and final distribution output directory
CB_STAGE_DIR="${CB_STAGE_DIR:-${TMPDIR:-/tmp}/circulation-builder-release}"
CB_OUT_DIR="${CB_OUT_DIR:-$PROJECT_DIR/release}"

# WHY: Preflight check 1 - verify the requested Developer ID signing certificate is installed in keychain
if ! security find-identity -v -p codesigning | grep -F "$CB_SIGN_IDENTITY" >/dev/null 2>&1; then
  echo "Error: Code signing identity not found: $CB_SIGN_IDENTITY" >&2
  exit 1
fi

# WHY: Preflight check 2 - verify the signing certificate is currently valid and unexpired
if ! security find-certificate -c "$CB_SIGN_IDENTITY" -p | openssl x509 -noout -checkend 0 >/dev/null 2>&1; then
  echo "Error: Code signing certificate is expired or invalid for: $CB_SIGN_IDENTITY" >&2
  exit 1
fi

# WHY: Preflight check 3 - test stored notarytool keychain credentials against Apple's notary service
if ! xcrun notarytool history --keychain-profile "$CB_NOTARY_PROFILE" >/dev/null; then
  echo "Error: Notarytool authentication failed with profile: $CB_NOTARY_PROFILE" >&2
  exit 1
fi

# WHY: Cloud-synced directories (such as iCloud/OneDrive) inject extended attributes that break codesign.
# Mirror the repository into an isolated staging location and strip all extended attributes before building.
mkdir -p "$CB_STAGE_DIR"
rsync -a --delete \
  --exclude /release \
  --exclude /dist \
  --exclude /test-results \
  --exclude /playwright-report \
  "$PROJECT_DIR/" "$CB_STAGE_DIR/"
# WHY: rsync leaves excluded folders alone, so clear any build output left by an earlier run.
rm -rf "$CB_STAGE_DIR/release" "$CB_STAGE_DIR/dist"
xattr -cr "$CB_STAGE_DIR"

# WHY: Compile application assets and invoke electron-builder to sign with hardened runtime,
# submit to Apple notary service, and staple tickets to the application bundle.
CSC_NAME="${CB_SIGN_IDENTITY#Developer ID Application: }"
(
  cd "$CB_STAGE_DIR"
  # WHY: the Electron and Chromium licence files are shipped inside the app. They sit beside the
  # Electron binary, which npm only unpacks on demand, so unpack it and confirm both files exist.
  node node_modules/electron/install.js
  for licence_file in node_modules/electron/dist/LICENSE node_modules/electron/dist/LICENSES.chromium.html; do
    if [[ ! -f "$licence_file" ]]; then
      echo "Error: missing $licence_file" >&2
      exit 1
    fi
  done
  npm run build
  CSC_NAME="$CSC_NAME" APPLE_KEYCHAIN_PROFILE="$CB_NOTARY_PROFILE" npx electron-builder --mac dmg --arm64
)

# WHY: Ensure expected build artifacts (.app and .dmg) exist before validation
APP="$CB_STAGE_DIR/release/mac-arm64/Circulation Builder.app"
if [[ ! -d "$APP" ]]; then
  echo "Error: Staged application bundle not found at: $APP" >&2
  exit 1
fi

# WHY: the application must carry its own licence, the privacy policy and every third-party licence.
for shipped in LICENSE.txt PRIVACY.md THIRD-PARTY-NOTICES.md LICENSE.electron.txt LICENSES.chromium.html; do
  if [[ ! -f "$APP/Contents/Resources/$shipped" ]]; then
    echo "Error: $shipped is missing from the application bundle" >&2
    exit 1
  fi
done

shopt -s nullglob
DMG_LIST=("$CB_STAGE_DIR"/release/Circulation-Builder-*-arm64.dmg)
shopt -u nullglob

if [[ ${#DMG_LIST[@]} -ne 1 || ! -f "${DMG_LIST[0]}" ]]; then
  echo "Error: Expected exactly one DMG matching Circulation-Builder-*-arm64.dmg in $CB_STAGE_DIR/release" >&2
  exit 1
fi
DMG="${DMG_LIST[0]}"

# WHY: Strictly verify code signature integrity, hardened runtime entitlement, and timestamp
codesign --verify --deep --strict --verbose=2 "$APP"

APP_SIGN_INFO="$(codesign -dvv "$APP" 2>&1)"
if ! echo "$APP_SIGN_INFO" | grep -F "flags=0x10000(runtime)" >/dev/null 2>&1; then
  echo "Error: Hardened runtime flag (0x10000) missing from $APP" >&2
  exit 1
fi

if ! echo "$APP_SIGN_INFO" | grep -E "^Timestamp=" >/dev/null 2>&1; then
  echo "Error: Secure timestamp missing from $APP" >&2
  exit 1
fi

# WHY: Validate that Apple notarization ticket has been stapled to the application bundle
xcrun stapler validate "$APP"

# WHY: Codesign the outer DMG container disk image with the Developer ID certificate and timestamp
codesign --force --timestamp --sign "$CB_SIGN_IDENTITY" "$DMG"

# WHY: Submit disk image to Apple notary service and wait for acceptance
NOTARY_RESULT="$(xcrun notarytool submit "$DMG" --keychain-profile "$CB_NOTARY_PROFILE" --wait 2>&1 || true)"
if ! echo "$NOTARY_RESULT" | grep -F "status: Accepted" >/dev/null 2>&1; then
  echo "Error: DMG notarization failed." >&2
  echo "$NOTARY_RESULT" >&2
  exit 1
fi

# WHY: Staple notarization ticket to DMG so macOS Gatekeeper can verify it offline
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"

# WHY: Perform final Gatekeeper evaluation simulating direct user download
spctl --assess --type open --context context:primary-signature --verbose=2 "$DMG"

# WHY: Place the finalized release artifact in output directory and output cryptographic hash
mkdir -p "$CB_OUT_DIR"
cp "$DMG" "$CB_OUT_DIR/"
OUT_DMG="$CB_OUT_DIR/$(basename "$DMG")"

echo "Release DMG built, signed, notarized, and stapled successfully:"
echo "$OUT_DMG"
shasum -a 256 "$OUT_DMG"
