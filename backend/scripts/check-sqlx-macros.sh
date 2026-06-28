#!/usr/bin/env bash
# Fail if any staged Rust file uses sqlx's runtime query API instead of the
# compile-time-checked macros. The runtime forms are `sqlx::query(`,
# `sqlx::query_as(`, `sqlx::query_scalar(` (no `!`); the macro forms
# `sqlx::query!(` etc. are NOT matched because the `!` sits before the `(`.
# Escape hatch: append `// allow(non-sqlx-macro)` to a genuine dynamic-SQL line.
set -euo pipefail

status=0
for f in "$@"; do
  case "$f" in
    *.rs) ;;
    *) continue ;;
  esac
  [ -f "$f" ] || continue
  # Match runtime calls; the negative-lookahead-free portable form relies on the
  # fact that `query(` / `query_as(` / `query_scalar(` lack the macro `!`.
  while IFS=: read -r lineno rest; do
    line=$(sed -n "${lineno}p" "$f")
    case "$line" in
      *//\ allow\(non-sqlx-macro\)*) continue ;;
    esac
    echo "error: $f:$lineno uses runtime sqlx API (use query!/query_as!/query_scalar!):" >&2
    echo "  $line" >&2
    status=1
  done < <(grep -nE 'sqlx::query(_as|_scalar)?\(' "$f" || true)
done

exit "$status"
