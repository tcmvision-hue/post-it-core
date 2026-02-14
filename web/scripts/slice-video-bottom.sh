#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "$0")/../public/video" && pwd)"
BOTTOM_CUT_PERCENT="${1:-10}"

if ! [[ "$BOTTOM_CUT_PERCENT" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "Usage: $(basename "$0") [BOTTOM_CUT_PERCENT]"
  echo "Example: $(basename "$0") 10"
  exit 1
fi

if awk "BEGIN { exit !($BOTTOM_CUT_PERCENT <= 0 || $BOTTOM_CUT_PERCENT >= 50) }"; then
  echo "BOTTOM_CUT_PERCENT must be > 0 and < 50"
  exit 1
fi

echo "Processing videos in: $VIDEO_DIR"
echo "Bottom cut: ${BOTTOM_CUT_PERCENT}%"

find "$VIDEO_DIR" -maxdepth 1 -type f -name '*.mp4' -print0 | while IFS= read -r -d '' file; do
  echo "\n→ Processing: $(basename "$file")"
  tmp="${file%.mp4}.tmp.mp4"

  ffmpeg -y -i "$file" \
    -vf "crop=iw:ih-trunc((ih*${BOTTOM_CUT_PERCENT}/100)/2)*2:0:0,pad=iw:trunc(ih/(1-${BOTTOM_CUT_PERCENT}/100)/2)*2:0:0:black" \
    -c:v libx264 -preset medium -crf 18 \
    -c:a copy \
    -movflags +faststart \
    "$tmp"

  mv "$tmp" "$file"
done

echo "\nDone. All mp4 files are physically cut by ${BOTTOM_CUT_PERCENT}% at the bottom and padded back to original ratio."