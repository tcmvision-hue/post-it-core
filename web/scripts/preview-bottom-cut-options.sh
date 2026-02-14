#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "$0")/../public/video" && pwd)"
PREVIEW_DIR="$VIDEO_DIR/_cut-previews"
PERCENTS=(8 10 12)

mkdir -p "$PREVIEW_DIR"

echo "Preview generatie in: $PREVIEW_DIR"
echo "Bronmap: $VIDEO_DIR"

find "$VIDEO_DIR" -maxdepth 1 -type f -name '*.mp4' -print0 | while IFS= read -r -d '' file; do
  base="$(basename "$file" .mp4)"
  echo "\n→ $base"

  for p in "${PERCENTS[@]}"; do
    out="$PREVIEW_DIR/${base}.cut-${p}.mp4"

    ffmpeg -y -i "$file" \
      -vf "crop=iw:ih-trunc((ih*${p}/100)/2)*2:0:0,pad=iw:trunc(ih/(1-${p}/100)/2)*2:0:0:black" \
      -c:v libx264 -preset medium -crf 20 \
      -c:a copy \
      -movflags +faststart \
      "$out"

    echo "  - preview: $(basename "$out")"
  done
done

echo "\nKlaar. Bekijk _cut-previews en kies per video 8, 10 of 12."