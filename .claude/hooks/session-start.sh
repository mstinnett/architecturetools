#!/usr/bin/env bash
# SessionStart hook — active briefing for the autonomous work system.
#
# Reads the decision queue and prints a "needs your attention" block, but
# ONLY when there is something to say, so unrelated sessions stay silent.
# Must never error or hang: every probe is guarded.

set -u

QUEUE="docs/decisions/queue.md"
BACKLOG="docs/decisions/backlog.md"

# Not this repo, or system not installed yet -> stay silent.
[ -f "$QUEUE" ] || exit 0

# Count "### " item headings inside a "## <name>" section of the queue.
section_count() {
  awk -v want="$1" '
    /^## / { ins = (index($0, want) > 0); next }
    ins && /^### / { n++ }
    END { print n + 0 }
  ' "$QUEUE" 2>/dev/null
}

# Print "### " item titles inside a section, each with a prefix.
section_titles() {
  awk -v want="$1" -v pfx="$2" '
    /^## / { ins = (index($0, want) > 0); next }
    ins && /^### / { t = $0; sub(/^### +/, "", t); print pfx t }
  ' "$QUEUE" 2>/dev/null
}

awaiting=$(section_count "Awaiting your decision"); awaiting=${awaiting:-0}
queued=$(section_count "Queued"); queued=${queued:-0}

backlog_open=0
if [ -f "$BACKLOG" ]; then
  backlog_open=$(grep -c '^- \[ \]' "$BACKLOG" 2>/dev/null) || backlog_open=0
fi
backlog_open=${backlog_open:-0}

# Nothing pending for the human -> stay silent.
if [ "$awaiting" -eq 0 ] && [ "$queued" -eq 0 ]; then
  exit 0
fi

echo "=============================================="
echo " Autonomous Work System - needs your attention"
echo "=============================================="
if [ "$awaiting" -gt 0 ]; then
  echo " * $awaiting decision(s) AWAITING YOU:"
  section_titles "Awaiting your decision" "     - "
fi
if [ "$queued" -gt 0 ]; then
  echo " * $queued fork(s) queued for the RFC pipeline  ->  run /rfc-run"
fi
echo " * $backlog_open open backlog item(s)  ->  run /work-next"
echo "=============================================="
exit 0
