#!/usr/bin/env bash
# Move a Portfolio issue into a board lane.
#   ./lane.sh <issue-number> <Todo|Blocked|"In Progress"|Testing|"Ready to Deploy"|Done>
set -euo pipefail
PROJECT_ID="PVT_kwHOApfWf84AcifZ"
FIELD_ID="PVTSSF_lAHOApfWf84AcifZzgScrIo"
declare -A OPT=( [Todo]=f75ad846 [Blocked]=b271b237 ["In Progress"]=47fc9ee4 [Testing]=d99e5244 ["Ready to Deploy"]=5cdea11f [Done]=98236657 )

issue="$1"; lane="$2"
opt="${OPT[$lane]:-}"
[ -z "$opt" ] && { echo "unknown lane: $lane" >&2; exit 1; }

item=$(gh project item-list 2 --owner alcash55 --format json --limit 100 \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for i in d['items']:
    c=i.get('content',{})
    if c.get('number')==$issue and i.get('repository','').endswith('/Portfolio'):
        print(i['id']); break
")
[ -z "$item" ] && { echo "issue #$issue not on the board" >&2; exit 1; }

gh project item-edit --id "$item" --project-id "$PROJECT_ID" \
  --field-id "$FIELD_ID" --single-select-option-id "$opt" >/dev/null
echo "#$issue -> $lane"
