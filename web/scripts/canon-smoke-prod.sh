#!/usr/bin/env bash
# filepath: /workspaces/post-it-core/web/scripts/canon-smoke-prod.sh
set -euo pipefail

BASE="${BASE_URL:-${1:-https://post-it-core.vercel.app}}"
USER_ID="${3:-canon-$(date +%s)}"
TMP="/tmp/postit-canon-$USER_ID"
COOKIE_JAR="$TMP/cookies.txt"
mkdir -p "$TMP"

echo "[canon] base=$BASE user=$USER_ID"

json_get_field() {
  local file="$1"
  local field="$2"
  node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(process.argv[1], "utf8");
    const field = process.argv[2];
    let data;
    try { data = JSON.parse(raw); } catch { process.exit(2); }
    const value = data?.[field];
    process.stdout.write(String(value ?? ""));
  ' "$file" "$field"
}

json_encode() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

fail_non_json() {
  local label="$1"
  local file="$2"
  echo "[canon] FAIL - $label returned non-JSON"
  echo "[canon] raw response from $label:"
  cat "$file"
  echo
  exit 1
}

post_json() {
  local path="$1"
  local data="$2"
  local out="$3"
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "$BASE$path" > "$out"
}

GEN_BODY_BASE='{"kladblok":"Korte update voor klanten over samenwerking en vervolgstappen.","doelgroep":"Klanten","intentie":"Informeren","context":"Actualiteit"}'

post_json "/api/profile/bootstrap" "{\"profileId\":\"$USER_ID\",\"language\":\"nl\"}" "$TMP/bootstrap.json"
post_json "/api/phase4/start" "{\"userId\":\"$USER_ID\"}" "$TMP/start.json"

if ! CYCLE_ID=$(json_get_field "$TMP/start.json" "cycleId"); then
  fail_non_json "/api/phase4/start" "$TMP/start.json"
fi
if [[ -z "$CYCLE_ID" ]]; then
  echo "[canon] FAIL - missing cycleId in start response"
  cat "$TMP/start.json"
  exit 1
fi

post_json "/api/generate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"actionId\":\"canon-g1\",${GEN_BODY_BASE:1}" "$TMP/g1.json"
post_json "/api/generate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"actionId\":\"canon-g2\",${GEN_BODY_BASE:1}" "$TMP/g2.json"
post_json "/api/generate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"actionId\":\"canon-g3\",${GEN_BODY_BASE:1}" "$TMP/g3.json"
post_json "/api/generate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"actionId\":\"canon-g4\",${GEN_BODY_BASE:1}" "$TMP/g4.json"

if ! POST_ID=$(json_get_field "$TMP/g3.json" "postId"); then
  fail_non_json "/api/generate (g3)" "$TMP/g3.json"
fi
if ! POST_TEXT=$(json_get_field "$TMP/g3.json" "post"); then
  fail_non_json "/api/generate (g3)" "$TMP/g3.json"
fi

post_json "/api/phase4/confirm" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$POST_ID\"}" "$TMP/confirm.json"
post_json "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP/status.json"
post_json "/api/phase4/download-variant" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"confirmedPostId\":\"$POST_ID\"}" "$TMP/download.json"

if ! COINS_BEFORE_OPTIONS=$(node -e '
  const fs = require("fs");
  let data;
  try { data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { process.exit(2); }
  process.stdout.write(String(Number(data.coinsRemaining ?? data.coinsLeft ?? data.coins ?? 0)));
' "$TMP/status.json"); then
  fail_non_json "/api/phase4/status" "$TMP/status.json"
fi

post_json "/api/phase4/translate" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$POST_ID\",\"post\":$(json_encode "$POST_TEXT"),\"targetLanguage\":\"en\",\"actionId\":\"canon-translate\"}" "$TMP/translate.json"

if ! TRANSLATED_POST_ID=$(json_get_field "$TMP/translate.json" "postId"); then
  fail_non_json "/api/phase4/translate" "$TMP/translate.json"
fi
if ! TRANSLATED_TEXT=$(json_get_field "$TMP/translate.json" "post"); then
  fail_non_json "/api/phase4/translate" "$TMP/translate.json"
fi

post_json "/api/phase4/option" "{\"userId\":\"$USER_ID\",\"cycleId\":\"$CYCLE_ID\",\"postId\":\"$TRANSLATED_POST_ID\",\"optionKey\":\"tone\",\"post\":$(json_encode "$TRANSLATED_TEXT"),\"tone\":\"zakelijk\",\"actionId\":\"canon-tone\"}" "$TMP/tone.json"
post_json "/api/phase4/status" "{\"userId\":\"$USER_ID\"}" "$TMP/status-after-options.json"

pass=1

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true?0:1)' "$TMP/g1.json"; then
  echo "PASS1"
else
  echo "FAIL1"
  jq . "$TMP/g1.json" 2>/dev/null || cat "$TMP/g1.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true && /-p2$/.test(String(d.postId||""))?0:1)' "$TMP/g2.json"; then
  echo "PASS2"
else
  echo "FAIL2"
  jq . "$TMP/g2.json" 2>/dev/null || cat "$TMP/g2.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(d.ok===true && /-p3$/.test(String(d.postId||""))?0:1)' "$TMP/g3.json"; then
  echo "PASS3"
else
  echo "FAIL3"
  jq . "$TMP/g3.json" 2>/dev/null || cat "$TMP/g3.json"
  pass=0
fi

if node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(String(d.error||"")==="Regenerate limit reached"?0:1)' "$TMP/g4.json"; then
  echo "PASS4"
else
  echo "FAIL4"
  jq . "$TMP/g4.json" 2>/dev/null || cat "$TMP/g4.json"
  pass=0
fi

if node -e 'const fs=require("fs");const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const s=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const d=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));process.exit(c.ok===true && c.confirmed===true && s.confirmed===true && d.ok===true?0:1)' "$TMP/confirm.json" "$TMP/status.json" "$TMP/download.json"; then
  echo "PASS5"
else
  echo "FAIL5"
  echo "-- confirm --"
  jq . "$TMP/confirm.json" 2>/dev/null || cat "$TMP/confirm.json"
  echo "-- status --"
  jq . "$TMP/status.json" 2>/dev/null || cat "$TMP/status.json"
  echo "-- download --"
  jq . "$TMP/download.json" 2>/dev/null || cat "$TMP/download.json"
  pass=0
fi

if node -e 'const fs=require("fs");const base=Number(process.argv[1]);const tr=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const tone=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));const st=JSON.parse(fs.readFileSync(process.argv[4],"utf8"));const trCoins=Number(tr.coinsLeft ?? tr.coinsRemaining ?? NaN);const toneCoins=Number(tone.coinsLeft ?? tone.coinsRemaining ?? NaN);const trPostId=String(tr.postId||"");const tonePostId=String(tone.postId||"");const stActive=String(st.activePostId||"");const trActive=String(tr.activePostId||"");const toneActive=String(tone.activePostId||"");const ok=tr.ok===true && tone.ok===true && trPostId!=="" && tonePostId!=="" && trPostId!==tonePostId && trActive===trPostId && toneActive===tonePostId && stActive===tonePostId && Number.isFinite(base) && Number.isFinite(trCoins) && Number.isFinite(toneCoins) && trCoins===base-3 && toneCoins===base-5;process.exit(ok?0:1)' "$COINS_BEFORE_OPTIONS" "$TMP/translate.json" "$TMP/tone.json" "$TMP/status-after-options.json"; then
  echo "PASS6"
else
  echo "FAIL6"
  echo "-- translate --"
  jq . "$TMP/translate.json" 2>/dev/null || cat "$TMP/translate.json"
  echo "-- tone --"
  jq . "$TMP/tone.json" 2>/dev/null || cat "$TMP/tone.json"
  echo "-- status-after-options --"
  jq . "$TMP/status-after-options.json" 2>/dev/null || cat "$TMP/status-after-options.json"
  pass=0
fi

echo "[canon] artifacts: $TMP"

if [[ "$pass" -eq 1 ]]; then
  echo "[canon] ALL PASS"
  exit 0
fi

exit 1
