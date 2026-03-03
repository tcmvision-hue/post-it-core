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

json_get_field() {
  local file="$1"
  local field="$2"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const field = process.argv[2];
    const raw = fs.readFileSync(file, "utf8");
    try {
      const data = JSON.parse(raw);
      const value = data?.[field];
      process.stdout.write(String(value ?? ""));
      process.exit(0);
    } catch {
      process.exit(2);
    }
  ' "$file" "$field"
}

fail_non_json() {
  local label="$1"
  local file="$2"
  echo "[canon] FAIL - $label returned non-JSON"
  echo "[canon] raw response from $label:"
  cat "$file"
  echo
  echo "[canon] tip: je test waarschijnlijk een Vercel URL zonder API routes voor dit project."
  exit 1
}

echo "[canon] base=$BASE user=$USER_ID"

json_post "/api/profile/bootstrap" "{\"profileId\":\"$USER_ID\",\"language\":\"nl\"}" "$TMP_DIR/bootstrap.json"
json_post "/api/phase4/start" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/start.json"

if ! CYCLE_ID=$(json_get_field "$TMP_DIR/start.json" "cycleId"); then
  fail_non_json "/api/phase4/start" "$TMP_DIR/start.json"
fi
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

if ! POST_ID=$(json_get_field "$TMP_DIR/g3.json" "postId"); then
  fail_non_json "/api/generate (g3)" "$TMP_DIR/g3.json"
fi
if ! POST_TEXT=$(json_get_field "$TMP_DIR/g3.json" "post"); then
  fail_non_json "/api/generate (g3)" "$TMP_DIR/g3.json"
fi

json_post "/api/phase4/confirm" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$POST_ID\"}" "$TMP_DIR/confirm.json"
json_post "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/status.json"
json_post "/api/phase4/download-variant" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"confirmedPostId\":\"$POST_ID\"}" "$TMP_DIR/download.json"

if ! COINS_BEFORE_OPTIONS=$(node -e "const fs=require('fs');const raw=fs.readFileSync(process.argv[1],'utf8');let d;try{d=JSON.parse(raw);}catch{process.exit(2)};process.stdout.write(String(Number(d.coinsRemaining ?? d.coinsLeft ?? d.coins ?? 0)));" "$TMP_DIR/status.json"); then
  fail_non_json "/api/phase4/status" "$TMP_DIR/status.json"
fi

json_post "/api/phase4/translate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$POST_ID\",\"post\":$(node -e "process.stdout.write(JSON.stringify(process.argv[1]))" "$POST_TEXT"),\"targetLanguage\":\"en\",\"actionId\":\"canon-translate\"}" "$TMP_DIR/translate.json"

if ! TRANSLATED_POST_ID=$(json_get_field "$TMP_DIR/translate.json" "postId"); then
  fail_non_json "/api/phase4/translate" "$TMP_DIR/translate.json"
fi
if ! TRANSLATED_TEXT=$(json_get_field "$TMP_DIR/translate.json" "post"); then
  fail_non_json "/api/phase4/translate" "$TMP_DIR/translate.json"
fi

json_post "/api/phase4/option" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$TRANSLATED_POST_ID\",\"optionKey\":\"tone\",\"post\":$(node -e "process.stdout.write(JSON.stringify(process.argv[1]))" "$TRANSLATED_TEXT"),\"tone\":\"zakelijk\",\"actionId\":\"canon-tone\"}" "$TMP_DIR/tone.json"

json_post "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP_DIR/status-after-options.json"

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

if node -e 'const fs=require("fs");const base=Number(process.argv[1]);const tr=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const tone=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));const st=JSON.parse(fs.readFileSync(process.argv[4],"utf8"));const trCoins=Number(tr.coinsLeft ?? tr.coinsRemaining ?? NaN);const toneCoins=Number(tone.coinsLeft ?? tone.coinsRemaining ?? NaN);const trPostId=String(tr.postId||"");const tonePostId=String(tone.postId||"");const stActive=String(st.activePostId||"");const trActive=String(tr.activePostId||"");const toneActive=String(tone.activePostId||"");const ok=tr.ok===true && tone.ok===true && trPostId!=="" && tonePostId!=="" && trPostId!==tonePostId && trActive===trPostId && toneActive===tonePostId && stActive===tonePostId && Number.isFinite(base) && Number.isFinite(trCoins) && Number.isFinite(toneCoins) && trCoins===base-3 && toneCoins===base-5;process.exit(ok?0:1)' "$COINS_BEFORE_OPTIONS" "$TMP_DIR/translate.json" "$TMP_DIR/tone.json" "$TMP_DIR/status-after-options.json"; then
  echo "PASS6"
else
  echo "FAIL6"
  echo "-- translate --"
  jq . "$TMP_DIR/translate.json" 2>/dev/null || cat "$TMP_DIR/translate.json"
  echo "-- tone --"
  jq . "$TMP_DIR/tone.json" 2>/dev/null || cat "$TMP_DIR/tone.json"
  echo "-- status-after-options --"
  jq . "$TMP_DIR/status-after-options.json" 2>/dev/null || cat "$TMP_DIR/status-after-options.json"
  pass=0
fi

echo "[canon] artifacts: $TMP_DIR"

if [[ "$pass" -eq 1 ]]; then
  echo "[canon] ALL PASS"
  exit 0
fi

echo "[canon] FAIL - inspect JSON artifacts"
exit 1
