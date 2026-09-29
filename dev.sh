#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  local exit_code="${1:-2}"
  printf 'Usage: %s [--host HOST] [--port PORT]\n' "${0##*/}"
  printf 'Defaults: --host 0.0.0.0 --port 5173\n'
  exit "$exit_code"
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
host="0.0.0.0"
port="5173"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      [[ $# -ge 2 ]] || usage
      host="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 && "$2" =~ ^[0-9]+$ && "$2" -ge 1 && "$2" -le 65535 ]] || usage
      port="$2"
      shift 2
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      usage
      ;;
  esac
done

if [[ ! -x "$script_dir/node_modules/.bin/vite" ]]; then
  printf 'Dependencies are missing. Run ./build.sh --debug first (or npm install).\n' >&2
  exit 1
fi

cd "$script_dir"
printf 'Starting Vite with live reload at http://%s:%s\n' "$host" "$port"
printf 'Press Ctrl+C to stop the development server.\n'
exec npm run dev -- --host "$host" --port "$port" --strictPort
