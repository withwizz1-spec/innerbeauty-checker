#!/usr/bin/env bash
# analyze_unknown.mjs 실행기.
#
# 프론트 소스(src/utils/parseIngredients.js 등)의 import가 확장자 없이 쓰여 있어
# Node가 그대로는 해석하지 못한다(vite가 해주던 일). esbuild로 한 번 묶어서 실행한다.
#
# 사전을 백엔드에서 받아오므로 백엔드가 떠 있어야 한다:
#   cd backend && ./venv/bin/python -m uvicorn main:app --port 8000
set -euo pipefail

cd "$(dirname "$0")/.."   # 프로젝트 루트

OUT=".analyze_bundle.mjs"
trap 'rm -f "$OUT"' EXIT

npx esbuild backend/analyze_unknown.mjs \
  --bundle --platform=node --format=esm --log-level=warning \
  --outfile="$OUT"

node "$OUT" "$@"
