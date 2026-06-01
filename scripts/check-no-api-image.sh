#!/usr/bin/env bash
# Fail if application code references the retired /api/image proxy (stub route may remain).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if rg -n '/api/image' \
  --glob '!scripts/check-no-api-image.sh' \
  --glob '!app/api/image/**' \
  --glob '!**/*.regression.test.ts' \
  --glob '!e2e/**' \
  --glob '!scripts/smoke-production.mjs' \
  --glob '!dev_server.log' \
  --glob '!README.md' \
  . >/tmp/check-no-api-image.txt 2>/dev/null; then
  echo 'ERROR: retired /api/image still referenced in app code:' >&2
  cat /tmp/check-no-api-image.txt >&2
  exit 1
fi

echo 'OK  no /api/image references in application code'
