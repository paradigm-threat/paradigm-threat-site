#!/usr/bin/env bash
# Local smoke: SPA rewrites + dedicated routes (run after `npm run build && npm run start`).
# Requires NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1 at build time.
set -euo pipefail
BASE="${SPA_TEST_BASE:-http://localhost:8081}"

if [[ "${NEXT_PUBLIC_SPA_DOCUMENT_ROUTES:-}" != "1" ]]; then
  echo "spa-routes: skip — set NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1 and rebuild first" >&2
  exit 0
fi

fail() { echo "spa-routes: $*" >&2; exit 1; }

check() {
  local path="$1" expect="$2"
  local code body
  code=$(curl -s -o /tmp/spa-body.html -w '%{http_code}' "${BASE}${path}")
  body=$(head -c 200 /tmp/spa-body.html)
  if [[ "$code" != "$expect" ]]; then
    fail "${path} — expected HTTP ${expect}, got ${code}"
  fi
  if [[ "$expect" == "200" ]] && ! grep -q 'Paradigm Threat' /tmp/spa-body.html; then
    fail "${path} — expected app shell in body"
  fi
  echo "OK  ${path} -> ${code}"
}

echo "spa-routes: base=${BASE}"

check "/" 200
check "/governance/constitution/tona-not-war-liberty-rebrand" 200
check "/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation" 200
check "/search" 200
check "/timeline" 200
check "/chat" 200

code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/client-telemetry")
[[ "$code" == "405" || "$code" == "400" ]] || fail "/api/client-telemetry — expected 405/400, got ${code}"
echo "OK  /api/client-telemetry -> ${code} (not rewritten to HTML)"

echo 'spa-routes: all checks passed'
