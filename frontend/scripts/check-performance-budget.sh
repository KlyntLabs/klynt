#!/usr/bin/env bash
set -euo pipefail

# Performance budget gate for the frontend.
# Run after a production build to ensure the app stays fast.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${FRONTEND_DIR}/dist"
PUBLIC_DIR="${FRONTEND_DIR}/public"

if [ ! -d "${DIST_DIR}" ]; then
  echo "❌ Performance budget check requires a production build first."
  echo "   Run: cd frontend && bun run build"
  exit 1
fi

# Budgets (gzipped bytes)
MAX_INITIAL_JS_BYTES=307200   # 300 KB
MAX_INITIAL_CSS_BYTES=30720   # 30 KB
MAX_IMAGE_BYTES=512000        # 500 KB — modern WebP/AVIF hero assets should fit here

format_kb() {
  awk "BEGIN { printf \"%.1f kB\", $1 / 1024 }"
}

gzipped_size() {
  gzip -9 -c "$1" | wc -c | tr -d ' '
}

# ---------------------------------------------------------------------------
# Initial JS budget: all <script type="module"> and <link rel="modulepreload">
# tags in index.html are fetched before first paint.
# ---------------------------------------------------------------------------
INITIAL_JS_BYTES=0
JS_ASSETS=$(grep -oE '/assets/[^"'"'"']+\.js' "${DIST_DIR}/index.html" | sort -u)
for asset in ${JS_ASSETS}; do
  path="${DIST_DIR}${asset}"
  if [ -f "${path}" ]; then
    INITIAL_JS_BYTES=$((INITIAL_JS_BYTES + $(gzipped_size "${path}")))
  fi
done

INITIAL_CSS_BYTES=0
CSS_ASSETS=$(grep -oE '/assets/[^"'"'"']+\.css' "${DIST_DIR}/index.html" | sort -u)
for asset in ${CSS_ASSETS}; do
  path="${DIST_DIR}${asset}"
  if [ -f "${path}" ]; then
    INITIAL_CSS_BYTES=$((INITIAL_CSS_BYTES + $(gzipped_size "${path}")))
  fi
done

echo "Performance budget check"
echo "------------------------"
echo "Initial JS (gzipped): $(format_kb ${INITIAL_JS_BYTES}) / $(format_kb ${MAX_INITIAL_JS_BYTES})"
echo "Initial CSS (gzipped): $(format_kb ${INITIAL_CSS_BYTES}) / $(format_kb ${MAX_INITIAL_CSS_BYTES})"

FAIL=0

if [ "${INITIAL_JS_BYTES}" -gt "${MAX_INITIAL_JS_BYTES}" ]; then
  echo "❌ Initial JS budget exceeded. Reduce bundle size or add code-splitting."
  FAIL=1
fi

if [ "${INITIAL_CSS_BYTES}" -gt "${MAX_INITIAL_CSS_BYTES}" ]; then
  echo "❌ Initial CSS budget exceeded."
  FAIL=1
fi

# ---------------------------------------------------------------------------
# Public image budget: unoptimized raster assets kill LCP and bandwidth.
# ---------------------------------------------------------------------------
if [ -d "${PUBLIC_DIR}" ]; then
  LARGEST_IMAGE_LINE=$(
    find "${PUBLIC_DIR}" -type f \( \
      -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o \
      -iname '*.webp' -o -iname '*.avif' -o -iname '*.gif' \
    \) -exec sh -c 'for f; do printf "%s %s\n" "$(wc -c < "$f")" "$f"; done' sh {} + 2>/dev/null | sort -rn | head -n1 || true
  )

  if [ -n "${LARGEST_IMAGE_LINE}" ]; then
    LARGEST_BYTES=$(echo "${LARGEST_IMAGE_LINE}" | awk '{print $1}')
    LARGEST_PATH=$(echo "${LARGEST_IMAGE_LINE}" | cut -d' ' -f2-)
    echo "Largest public image: ${LARGEST_PATH} ($(format_kb ${LARGEST_BYTES}) / $(format_kb ${MAX_IMAGE_BYTES}))"

    if [ "${LARGEST_BYTES}" -gt "${MAX_IMAGE_BYTES}" ]; then
      echo "❌ Largest public image exceeds budget. Convert to WebP/AVIF and/or resize."
      FAIL=1
    fi
  else
    echo "No raster images found in public/."
  fi
fi

if [ "${FAIL}" -eq 0 ]; then
  echo "✅ Performance budget passed."
  exit 0
else
  echo "💡 Tip: run 'cd frontend && ANALYZE=true bun run build' to inspect the bundle."
  exit 1
fi
