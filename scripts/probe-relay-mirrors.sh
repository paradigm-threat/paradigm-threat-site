#!/usr/bin/env bash
# Probe Spot relay mirror pairs (files + timeline QUERY catalogs).
# Usage: ./scripts/probe-relay-mirrors.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load .env.local without bash `source` (values may contain spaces).
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
  key="${line%%=*}"
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  export "$key=$val"
done < <(cat .env.local .env 2>/dev/null | grep -E '^NEXT_PUBLIC_(FILES|TIMELINE)_BASE_URL=|^PIPER_API_URLS=' || true)

read -ra FILES <<< "${NEXT_PUBLIC_FILES_BASE_URL:-}"
read -ra TIMELINE <<< "${NEXT_PUBLIC_TIMELINE_BASE_URL:-}"

fail=0
ok() { echo "OK  $*"; }
bad() { echo "FAIL $*" >&2; fail=1; }

echo "=== relay mirror probe (${#FILES[@]} files, ${#TIMELINE[@]} timeline) ==="

n=$(( ${#FILES[@]} > ${#TIMELINE[@]} ? ${#FILES[@]} : ${#TIMELINE[@]} ))
for ((i=0; i<n; i++)); do
  f="${FILES[$i]:-${FILES[0]}}"
  t="${TIMELINE[$i]:-${TIMELINE[0]}}"
  echo "--- pair $((i+1)): files=$f"
  echo "              timeline=$t"
  if curl -fsS --connect-timeout 20 -X QUERY "${f%/}" \
      -H 'Accept: application/json' -H 'Content-Type: application/json' \
      -d '{"type":"query","collection":"index","query":"venus","limit":1}' -o /dev/null; then
    ok "files QUERY"
  else
    bad "files QUERY"
  fi
  if curl -fsS --connect-timeout 20 -X QUERY "${t%/}" \
      -H 'Accept: application/json' -H 'Content-Type: application/json' \
      -d '{"type":"query","collection":"index","query":"venus","limit":1}' -o /dev/null; then
    ok "timeline QUERY"
  else
    bad "timeline QUERY"
  fi
  host="$(echo "$f" | sed -n 's|https://paradigm-threat-files\.\([^/]*\)\.relaygateway.net.*|\1|p')"
  if [[ -n "$host" ]]; then
    if curl -fsS --connect-timeout 15 "https://${host}.relaygateway.net/voices" \
      | jq -e '.voices | length > 0' >/dev/null 2>&1; then
      ok "piper /voices on ${host}"
    else
      bad "piper /voices on ${host}"
    fi
  fi
done

exit "$fail"
