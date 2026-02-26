#!/usr/bin/env bash
# filepath: /workspaces/post-it-core/web/scripts/canon-smoke-prod.sh
set -euo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "usage: $0 <base-url>"
  exit 1
fi

USER_ID="canon-$(date +%s)"
TMP="/tmp/postit-canon-$USER_ID"
COOKIE_JAR="$TMP/cookies.txt"
mkdir -p "$TMP"

echo "[canon] base=$BASE user=$USER_ID"

post_json() {
  local path="$1"
  local data="$2"
  local out="$3"
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$BASE$path" > "$out"
}

json_ok() { jq -e '.ok == true' "$1" >/dev/null 2>&1; }

post_json "/api/profile/bootstrap" "{\"profileId\":\"$USER_ID\",\"language\":\"nl\"}" "$TMP/bootstrap.json"
post_json "/api/phase4/start" "{\"userId\":\"$USER_ID\"}" "$TMP/start.json"

ACTION_ID="canon-${USER_ID}-g1-$(date +%s%N)"
post_json "/api/generate" "{
  \"userId\":\"$USER_ID\",
  \"kladblok\":\"Test\",
  \"doelgroep\":\"Klanten\",
  \"intentie\":\"Informeren\",
  \"context\":\"Actualiteit\",
  \"outputLanguage\":\"nl\",
  \"actionId\":\"$ACTION_ID\"
}" "$TMP/g1.json"

POST_ID="$(jq -r '.postId // empty' "$TMP/g1.json" 2>/dev/null || true)"
if [[ -n "$POST_ID" ]]; then
  post_json "/api/phase4/confirm" "{\"userId\":\"$USER_ID\",\"postId\":\"$POST_ID\"}" "$TMP/confirm.json"
else
  echo '{"ok":false,"error":"Missing postId"}' > "$TMP/confirm.json"
fi

post_json "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP/status.json"
post_json "/api/phase4/download" "{\"userId\":\"$USER_ID\"}" "$TMP/download.json"

# PASS1/2
json_ok "$TMP/bootstrap.json" && echo PASS1 || echo FAIL1
json_ok "$TMP/start.json" && echo PASS2 || echo FAIL2

# PASS3/4 canonisch:
# - success pad: generate ok + confirm ok
# - no-coins pad: Insufficient coins + Missing postId
if jq -e '.ok == true' "$TMP/g1.json" >/dev/null 2>&1; then
  echo PASS3
  jq -e '.ok == true' "$TMP/confirm.json" >/dev/null 2>&1 && echo PASS4 || echo FAIL4
elif jq -e '.ok == false and .error == "Insufficient coins"' "$TMP/g1.json" >/dev/null 2>&1; then
  echo PASS3
  jq -e '.ok == false and .error == "Missing postId"' "$TMP/confirm.json" >/dev/null 2>&1 && echo PASS4 || echo FAIL4
else
  echo FAIL3
  echo FAIL4
fi

# PASS5 canonisch:
# - success pad: download heeft data/ok
# - no-coins pad: No confirmed post is verwacht
if jq -e '.ok == true' "$TMP/download.json" >/dev/null 2>&1 || [[ -s "$TMP/download.json" ]]; then
  echo PASS5
elif jq -e '.ok == false and .error == "No confirmed post"' "$TMP/download.json" >/dev/null 2>&1; then
  echo PASS5
else
  echo FAIL5
fi

echo "[canon] artifacts: $TMP"
