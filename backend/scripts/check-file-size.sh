#!/usr/bin/env bash
#
# Checks that Rust source and test files do not exceed per-file line limits.
# Intended to be invoked by lefthook with the list of staged files, but can also
# be run manually with explicit paths.
#
# Usage: check-file-size.sh <file>...

set -euo pipefail

MAX_SOURCE_LINES="${KLYNT_MAX_RUST_LINES:-400}"
MAX_TEST_LINES="${KLYNT_MAX_RUST_TEST_LINES:-600}"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <file>..."
  echo "Example: $0 backend/crates/klynt-application/src/users.rs"
  exit 1
fi

oversized=()
for file in "$@"; do
  [ -f "$file" ] || continue

  # Only inspect Rust files inside the workspace crate tree.
  case "$file" in
    backend/crates/*/*.rs) ;;
    *) continue ;;
  esac

  lines=$(wc -l < "$file")

  # Integration tests live under each crate's tests/ directory and are allowed
  # to be longer because they often contain many scenario setups.
  case "$file" in
    backend/crates/*/tests/*.rs)
      if [ "$lines" -gt "$MAX_TEST_LINES" ]; then
        oversized+=("$file: $lines lines (test limit $MAX_TEST_LINES)")
      fi
      ;;
    *)
      if [ "$lines" -gt "$MAX_SOURCE_LINES" ]; then
        oversized+=("$file: $lines lines (source limit $MAX_SOURCE_LINES)")
      fi
      ;;
  esac
done

if [ "${#oversized[@]}" -gt 0 ]; then
  echo "The following Rust files exceed their line limit:"
  for item in "${oversized[@]}"; do
    echo "  - $item"
  done
  echo
  echo "Please break these files into smaller modules before committing."
  echo "(Set KLYNT_MAX_RUST_LINES / KLYNT_MAX_RUST_TEST_LINES to override limits for local testing.)"
  exit 1
fi

echo "All checked Rust files are within their line limits."
