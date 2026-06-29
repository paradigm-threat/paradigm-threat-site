#!/usr/bin/env bash
# Fail if TSX uses root-relative raster img/src URLs (each triggers middleware edge hit).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if rg -n 'src=\{?["'\''`]/[^"'\''` ]+\.(png|jpe?g|gif|webp|avif|svg)' \
  app components \
  --glob '*.tsx' \
  --glob '!**/*.regression.test.ts' \
  >/tmp/check-no-site-origin-raster.txt 2>/dev/null; then
  echo 'ERROR: root-relative raster src in TSX (use Relay mirror URLs via imageHelper):' >&2
  cat /tmp/check-no-site-origin-raster.txt >&2
  exit 1
fi

echo 'OK  no root-relative raster src in TSX'
