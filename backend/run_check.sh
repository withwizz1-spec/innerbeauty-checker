#!/usr/bin/env bash
# check_categorize.mjs 실행기 — analyze와 같은 이유로 esbuild 번들이 필요하다.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=".check_bundle.mjs"
trap 'rm -f "$OUT"' EXIT
npx esbuild backend/check_categorize.mjs --bundle --platform=node --format=esm --log-level=warning --outfile="$OUT"
node "$OUT" "$@"
