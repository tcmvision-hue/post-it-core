#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-${1:-https://post-it-core.vercel.app}}"
JAR="${2:-/tmp/postit-canon.jar}"
USER_ID="${3:-canon-$(date +%s)}"

TMP_DIR="/tmp/postit-canon-${USER_ID}"
mkdir -p "$TMP_DIR"
rm -f "$JAR" "$TMP_DIR"/*.json

json_post() {
  local endpoint="$1"
  local body="$2"
  local out="$3"
  curl -sS -c "$JAR" -b "$JAR" \
    -H "Content-Type: application/json" \
    -X POST "$BASE$endpoint" \
    -d "$body" > "$out"
}

echo "[canon] base=$BASE user=$USER_ID"

json_post "/api/profile/bootstrap" "{\"profileId\":\"$USER_ID\",\"language\":\"nl\"}" "$TMP_DIR/bootstrap.json"
json_post "/api/phase4/start" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/start.json"

CYCLE_ID=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(d.cycleId||''));" "$TMP_DIR/start.json")
if [[ -z "$CYCLE_ID" ]]; then
  echo "[canon] FAIL - missing cycleId in start response"
  cat "$TMP_DIR/start.json"
  exit 1
fi

GEN_BODY="{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"kladblok\":\"Korte update voor klanten over samenwerking en vervolgstappen.\",\"doelgroep\":\"Klanten\",\"intentie\":\"Informeren\",\"context\":\"Actualiteit\"}"

json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g1.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g2.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g3.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g4.json"

if ! grep -q '"ok"' "$TMP_DIR/g3.json"; then
  echo "[canon] FAIL - non-JSON or invalid response in g3.json"
  cat "$TMP_DIR/g3.json"
  exit 1
fi

POST_ID=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(d.postId||''));" "$TMP_DIR/g3.json")

json_post "/api/phase4/confirm" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$POST_ID\"}" "$TMP_DIR/confirm.json"
json_post "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/status.json"
json_post "/api/phase4/download-variant" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"confirmedPostId\":\"$POST_ID\"}" "$TMP_DIR/download.json"

pass=1

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true?0:1)' "$TMP_DIR/g1.json"; then
  echo "PASS1"
else
  echo "FAIL1"
  jq . "$TMP_DIR/g1.json" 2>/dev/null || cat "$TMP_DIR/g1.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true && /-p2$/.test(String(d.postId||""))?0:1)' "$TMP_DIR/g2.json"; then
  echo "PASS2"
else
  echo "FAIL2"
  jq . "$TMP_DIR/g2.json" 2>/dev/null || cat "$TMP_DIR/g2.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true && /-p3$/.test(String(d.postId||""))?0:1)' "$TMP_DIR/g3.json"; then
  echo "PASS3"
else
  echo "FAIL3"
  jq . "$TMP_DIR/g3.json" 2>/dev/null || cat "$TMP_DIR/g3.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(String(d.error||"")==="Regenerate limit reached"?0:1)' "$TMP_DIR/g4.json"; then
  echo "PASS4"
else
  echo "FAIL4"
  jq . "$TMP_DIR/g4.json" 2>/dev/null || cat "$TMP_DIR/g4.json"
  pass=0
fi

if node -e 'const fs=require("fs");const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const s=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const d=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));process.exit(c.ok===true && c.confirmed===true && s.confirmed===true && d.ok===true?0:1)' "$TMP_DIR/confirm.json" "$TMP_DIR/status.json" "$TMP_DIR/download.json"; then
  echo "PASS5"
else
  echo "FAIL5"
  echo "-- confirm --"
  jq . "$TMP_DIR/confirm.json" 2>/dev/null || cat "$TMP_DIR/confirm.json"
  echo "-- status --"
  jq . "$TMP_DIR/status.json" 2>/dev/null || cat "$TMP_DIR/status.json"
  echo "-- download --"
  jq . "$TMP_DIR/download.json" 2>/dev/null || cat "$TMP_DIR/download.json"
  pass=0
fi

echo "[canon] artifacts: $TMP_DIR"

if [[ "$pass" -eq 1 ]]; then
  echo "[canon] ALL PASS"
  exit 0
fi

echo "[canon] FAIL - inspect JSON artifacts"
exit 1
