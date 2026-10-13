#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  printf 'Usage: %s [--debug | --prod]\n' "${0##*/}" >&2
  printf '  --debug  Build debug APK (default)\n' >&2
  printf '  --prod   Build release APK\n' >&2
  exit 2
}

# Default to --debug if no arguments are passed so any user or agent can simply run: ./build.sh
mode="${1:---debug}"
case "$mode" in
  --debug) gradle_task="assembleDebug"; apk_variant="debug" ;;
  --prod)  gradle_task="assembleRelease"; apk_variant="release" ;;
  *) usage ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

# Load .env if present
if [[ -f "$script_dir/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$script_dir/.env"
  set +a
fi

for command in npm java; do
  command -v "$command" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  }
done

if [[ ! -f "$script_dir/android/gradlew" ]]; then
  printf 'Gradle wrapper not found under android/.\n' >&2
  exit 1
fi
chmod +x "$script_dir/android/gradlew" 2>/dev/null || true

# Install dependencies if needed
if [[ -f package-lock.json ]]; then
  npm ci || npm install
else
  npm install
fi

app_version="$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")"
export VITE_APP_VERSION="$app_version"

# Build web frontend
printf '\n==> Building web assets with Vite (v%s)...\n' "$app_version"
npm run build

# Sync web assets to Capacitor Android
printf '\n==> Syncing assets to Capacitor Android project...\n'
npx cap sync android

# Package OTA update assets directly into docs/ (GitHub Pages root folder)
printf '\n==> Packaging OTA Live Update assets directly into docs/...\n'
ota_base_url="${VITE_OTA_UPDATE_URL:-${OTA_UPDATE_URL:-https://santanderelias.github.io/furniture/}}"
[[ "$ota_base_url" != */ ]] && ota_base_url="${ota_base_url}/"
mkdir -p "$script_dir/docs"

# Create docs/dist.zip from compiled dist contents
if command -v zip >/dev/null 2>&1; then
  (
    cd "$script_dir/dist"
    zip -r -q "$script_dir/docs/dist.zip" . -x "*.zip"
  )
else
  node -e "
    const fs = require('fs');
    console.warn('zip command not found; install zip for optimal packaging.');
  "
fi

# Create docs/version.json manifest
cat <<EOF > "$script_dir/docs/version.json"
{
  "version": "$app_version",
  "url": "${ota_base_url}dist.zip",
  "zip": "dist.zip",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Build Android APK
printf '\n==> Building Android APK (%s)...\n' "$gradle_task"
(
  cd android
  ./gradlew "$gradle_task"
)

# Clean up temporary build artifacts (dist/ folder and root zip/manifest)
printf '\n==> Cleaning up temporary build artifacts (dist/)...\n'
rm -rf "$script_dir/dist"
rm -f "$script_dir/dist.zip" "$script_dir/version.json"

apk_path="$script_dir/android/app/build/outputs/apk/$apk_variant/app-$apk_variant.apk"
if [[ ! -f "$apk_path" && "$mode" == "--prod" ]]; then
  apk_path="$script_dir/android/app/build/outputs/apk/release/app-release-unsigned.apk"
fi

if [[ ! -f "$apk_path" ]]; then
  printf 'Build finished, but expected APK was not found. Check Gradle output.\n' >&2
  exit 1
fi

printf '\n=======================================================\n'
printf ' BUILD COMPLETED SUCCESSFULLY\n'
printf '=======================================================\n'
printf ' Android APK:       %s\n' "$apk_path"
printf ' GitHub Pages OTA:  %s\n' "$script_dir/docs/dist.zip"
printf ' OTA Manifest:      %s\n' "$script_dir/docs/version.json"
printf ' OTA Target URL:    %s\n' "$ota_base_url"
printf ' App Version:       %s\n' "$app_version"
printf '=======================================================\n'
if [[ "$mode" == "--prod" && "$apk_path" == *unsigned.apk ]]; then
  printf 'Note: this release APK is unsigned. Configure Android release signing before distribution.\n'
fi
