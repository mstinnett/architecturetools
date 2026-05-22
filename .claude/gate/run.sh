#!/usr/bin/env bash
# Rung 0 verification gate for the autonomous work system.
#
# Runs HTML, CSS, and internal-link checks against the repo. This is a
# dependency carve-out: the linters live under .claude/gate/ and never
# ship with the site. Exits non-zero if any check fails.
#
# Usage:  bash .claude/gate/run.sh

set -uo pipefail

GATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$GATE_DIR/../.." && pwd)"
cd "$REPO_ROOT"

fail=0

if [ ! -x "$GATE_DIR/node_modules/.bin/htmlhint" ]; then
  echo "gate: installing gate dependencies (one-time)..."
  if ! (cd "$GATE_DIR" && npm install --silent --no-audit --no-fund); then
    echo "gate: ERROR - npm install failed. Install Node.js/npm, then retry."
    exit 2
  fi
fi

HTMLHINT="$GATE_DIR/node_modules/.bin/htmlhint"
STYLELINT="$GATE_DIR/node_modules/.bin/stylelint"

echo "gate: htmlhint ..."
mapfile -t html_files < <(find . -name '*.html' \
  -not -path './.git/*' -not -path './.claude/*' -not -path './node_modules/*')
if [ "${#html_files[@]}" -gt 0 ]; then
  "$HTMLHINT" --config "$GATE_DIR/.htmlhintrc" "${html_files[@]}" || fail=1
fi

echo "gate: stylelint ..."
if compgen -G "assets/**/*.css" > /dev/null 2>&1 || compgen -G "assets/*.css" > /dev/null 2>&1; then
  "$STYLELINT" --config "$GATE_DIR/.stylelintrc.json" "assets/**/*.css" || fail=1
else
  echo "  (no CSS files found)"
fi

echo "gate: internal links ..."
node "$GATE_DIR/check-links.mjs" || fail=1

echo "------------------------------------------"
if [ "$fail" -ne 0 ]; then
  echo "gate: FAIL"
  exit 1
fi
echo "gate: PASS"
