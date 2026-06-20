#!/usr/bin/env bash
#
# Checks that frontend source files do not exceed a per-file line limit.
# Intended to be invoked by lefthook with the list of staged files, but can also
# be run manually with explicit paths.
#
# Usage: check-file-size.sh <file>...

set -euo pipefail

MAX_LINES="${KLYNT_MAX_FILE_LINES:-300}"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <file>..."
  echo "Example: $0 frontend/src/components/ui/sidebar.tsx"
  exit 1
fi

oversized=()
for file in "$@"; do
  [ -f "$file" ] || continue

  # Only inspect frontend source files. This keeps the hook focused and avoids
  # tripping on config, lockfiles, or generated assets.
  case "$file" in
    frontend/src/*.ts | frontend/src/*.tsx | frontend/src/*.js | frontend/src/*.jsx | frontend/src/*.css) ;;
    *) continue ;;
  esac

  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    oversized+=("$file: $lines lines (limit $MAX_LINES)")
  fi
done

if [ "${#oversized[@]}" -gt 0 ]; then
  echo "The following frontend files exceed the ${MAX_LINES} line limit:"
  for item in "${oversized[@]}"; do
    echo "  - $item"
  done
  echo
  echo "Please break these files into smaller modules before committing."
  echo "(Set KLYNT_MAX_FILE_LINES to override the limit for local testing.)"
  exit 1
fi

echo "All checked frontend files are within the ${MAX_LINES} line limit."
