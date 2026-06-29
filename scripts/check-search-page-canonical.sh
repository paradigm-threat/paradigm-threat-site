#!/usr/bin/env bash
# Guard against a recurring local working-tree artifact: monolithic search page.tsx
# (fixed on main in c9bc1bd). Cause unknown — may be stale editor buffer, sync tool, or agent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGE="${ROOT}/app/(main)/search/[[...topic]]/page.tsx"

if [[ ! -f "$PAGE" ]]; then
  echo "check-search-page-canonical: missing ${PAGE}" >&2
  exit 1
fi

missing=()
grep -q 'SearchInputIsland' "$PAGE" || missing+=('SearchInputIsland')
grep -q 'SearchResultsPanel' "$PAGE" || missing+=('SearchResultsPanel')
grep -q 'SearchContentFiltersBar' "$PAGE" || missing+=('SearchContentFiltersBar')
grep -q 'getCachedMergedSearchIndex' "$PAGE" || missing+=('getCachedMergedSearchIndex')

if ((${#missing[@]} > 0)); then
  echo "check-search-page-canonical: page.tsx missing required symbols: ${missing[*]}" >&2
  echo "  Restore: git checkout HEAD -- 'app/(main)/search/[[...topic]]/page.tsx'" >&2
  echo "  See: .cursor/rules/search-page-revert-artifact.mdc" >&2
  exit 1
fi

if grep -qE 'DEBOUNCE_MS|isDebounsingRef|getRemoteFile' "$PAGE"; then
  echo "check-search-page-canonical: page.tsx matches the known broken monolithic artifact." >&2
  echo "  Restore: git checkout HEAD -- 'app/(main)/search/[[...topic]]/page.tsx'" >&2
  echo "  See: .cursor/rules/search-page-revert-artifact.mdc" >&2
  exit 1
fi

echo "check-search-page-canonical: ok"
