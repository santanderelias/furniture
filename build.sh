#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  printf 'Usage: %s --debug | --prod\n' "${0##*/}" >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
mode="$1"
case "$mode" in
  --debug) gradle_task="assembleDebug"; apk_variant="debug" ;;
  --prod) gradle_task="assembleRelease"; apk_variant="release" ;;
  *) usage ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

for command in npm java; do
  command -v "$command" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  }
done

if [[ ! -x "$script_dir/android/gradlew" ]]; then
  printf 'Gradle wrapper not found or not executable under android/.\n' >&2
  exit 1
fi

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run build
npx cap sync android
(
  cd android
  ./gradlew "$gradle_task"
)

apk_path="$script_dir/android/app/build/outputs/apk/$apk_variant/app-$apk_variant.apk"
if [[ ! -f "$apk_path" && "$mode" == "--prod" ]]; then
  apk_path="$script_dir/android/app/build/outputs/apk/release/app-release-unsigned.apk"
fi

if [[ ! -f "$apk_path" ]]; then
  printf 'Build finished, but expected APK was not found. Check Gradle output.\n' >&2
  exit 1
fi

printf '\nBuild successful: %s\n' "$apk_path"
if [[ "$mode" == "--prod" && "$apk_path" == *unsigned.apk ]]; then
  printf 'Note: this release APK is unsigned. Configure Android release signing before distribution.\n'
fi
