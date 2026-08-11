#!/usr/bin/env bash
# Lock PWA flags that caused surprise full-document reloads / stale article shells.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/next.config.js"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f "$CFG" ]] || fail "missing next.config.js"

grep -qE 'reloadOnOnline:\s*false' "$CFG" \
  || fail "next.config.js must set reloadOnOnline: false (PWA default reloads the tab on online)"

grep -qE 'cacheOnFrontEndNav:\s*false' "$CFG" \
  || fail "next.config.js must set cacheOnFrontEndNav: false (avoid history patch + soft-nav HTML cache)"

grep -qE 'aggressiveFrontEndNavCaching:\s*false' "$CFG" \
  || fail "next.config.js must set aggressiveFrontEndNavCaching: false"

# Article MD runtime rules must prefer NetworkFirst (not week-long SWR sticky bodies).
if ! grep -n "cacheName: 'pt-articles'" "$CFG" >/dev/null; then
  fail "missing pt-articles cacheName"
fi
# Walk upward from cacheName line to find handler in the same rule object.
art_line=$(grep -n "cacheName: 'pt-articles'" "$CFG" | head -1 | cut -d: -f1)
handler_line=$(sed -n "1,${art_line}p" "$CFG" | grep -n "handler:" | tail -1 | cut -d: -f1)
handler=$(sed -n "${handler_line}p" "$CFG")
echo "$handler" | grep -q NetworkFirst \
  || fail "pt-articles rule must use NetworkFirst (got: $handler)"

echo "OK  PWA safe flags (reloadOnOnline/cacheOnFrontEndNav/aggressiveFrontEndNavCaching + NetworkFirst articles)"
