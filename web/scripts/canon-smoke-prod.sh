#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://post-it-core.vercel.app}"
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

GEN_BODY="{\"userId\":\"$USER_ID\",\"kladblok\":\"Korte update voor klanten over samenwerking en vervolgstappen.\",\"doelgroep\":\"Klanten\",\"intentie\":\"Informeren\",\"context\":\"Actualiteit\"}"

json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g1.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g2.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g3.json"
json_post "/api/generate" "$GEN_BODY" "$TMP_DIR/g4.json"

POST_ID=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(d.postId||''));" "$TMP_DIR/g3.json")

json_post "/api/phase4/confirm" "{\"userId\":\"$USER_ID\",\"postId\":\"$POST_ID\"}" "$TMP_DIR/confirm.json"
json_post "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/status.json"
json_post "/api/phase4/download-variant" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/download.json"

pass=1

if grep -q '"ok":true' "$TMP_DIR/g1.json"; then echo "PASS1"; else echo "FAIL1"; pass=0; fi
if grep -Eq '"postId":"[^"]*-p2"' "$TMP_DIR/g2.json"; then echo "PASS2"; else echo "FAIL2"; pass=0; fi
if grep -Eq '"postId":"[^"]*-p3"' "$TMP_DIR/g3.json"; then echo "PASS3"; else echo "FAIL3"; pass=0; fi
if grep -q '"ok":false' "$TMP_DIR/g4.json" && grep -q '"error":"Regenerate limit reached"' "$TMP_DIR/g4.json"; then echo "PASS4"; else echo "FAIL4"; pass=0; fi
if grep -q '"ok":true' "$TMP_DIR/confirm.json" && grep -q '"confirmed":true' "$TMP_DIR/confirm.json" && grep -q '"confirmed":true' "$TMP_DIR/status.json" && grep -q '"ok":true' "$TMP_DIR/download.json"; then echo "PASS5"; else echo "FAIL5"; pass=0; fi

echo "[canon] artifacts: $TMP_DIR"

if [[ "$pass" -eq 1 ]]; then
  echo "[canon] ALL PASS"
  exit 0
fi

echo "[canon] FAIL - inspect JSON artifacts"
exit 1
