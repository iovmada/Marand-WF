#!/bin/bash
#
# Runs everything that can be checked without a deploy.
#
#   bash scripts/test.sh                        # unit tests + local endpoint suite
#   bash scripts/test.sh https://marand-print.ro  # unit tests + live endpoint suite
#
# No root package.json on purpose: this repo deploys as a STATIC component on
# App Platform, and a package.json at the root can flip the buildpack detection
# to Node and change how the site is built.

set -uo pipefail

NODE="${NODE:-/usr/local/opt/node@20/bin/node}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"
status=0

command -v "$NODE" >/dev/null 2>&1 || { echo "node 20 not found at $NODE (override with NODE=...)"; exit 1; }

echo "== unit: Accept negotiation =="
if [ -d "$ROOT/backend/forms-api/node_modules" ]; then
  "$NODE" --test "$ROOT/backend/forms-api/" || status=1
else
  # negotiate.test.js imports only negotiate.js, which has no dependencies.
  "$NODE" --test "$ROOT/backend/forms-api/negotiate.test.js" || status=1
fi

echo
echo "== generators are idempotent =="
# Compare the generated files before and after a re-run. Deliberately NOT a
# git diff: uncommitted work in progress is normal and is not drift. What we
# are asserting is that running the generators twice is a no-op.
generated() {
  find "$ROOT" -maxdepth 2 \
       \( -name "*.md" -o -name "*.html" -o -name "llms*.txt" \) \
       -not -path "*/node_modules/*" -not -path "$ROOT/wp-*" \
       -exec md5 -q {} \; 2>/dev/null | sort
}
before="$(generated)"
"$NODE" "$ROOT/scripts/build-trust-pages.mjs" >/dev/null || status=1
"$NODE" "$ROOT/scripts/build-shell.mjs" >/dev/null || status=1
"$NODE" "$ROOT/scripts/build-agent-files.mjs" >/dev/null || status=1
after="$(generated)"
if [ "$before" = "$after" ]; then
  echo "  ok    re-running the generators changed nothing"
else
  echo "  FAIL  generators are not idempotent — a second run rewrote output"
  status=1
fi

echo
echo "== endpoints =="
if [ -n "$TARGET" ]; then
  "$NODE" "$ROOT/scripts/verify-agent-readiness.mjs" "$TARGET" || status=1
else
  if curl -s -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
    "$NODE" "$ROOT/scripts/verify-agent-readiness.mjs" http://127.0.0.1:8080 || status=1
  else
    echo "  SKIP  no local server on :8080."
    echo "        Start one:  node scripts/serve-local.mjs"
    echo "        Or test live: bash scripts/test.sh https://marand-print.ro"
  fi
fi

echo
[ $status -eq 0 ] && echo "ALL GREEN" || echo "FAILURES — see above"
exit $status
