#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="$(cd "$(dirname "$0")/../public/video" && pwd)"
CONFIG_FILE="${1:-}"

if [[ -z "$CONFIG_FILE" || ! -f "$CONFIG_FILE" ]]; then
  echo "Gebruik: $(basename "$0") <config-bestand>"
  echo "Voorbeeldregel in config: aurora.mp4=10"
  exit 1
fi

echo "Bronmap: $VIDEO_DIR"
echo "Config: $CONFIG_FILE"

while IFS='=' read -r filename percent; do
  [[ -z "${filename// }" ]] && continue
  [[ "$filename" =~ ^# ]] && continue

  filename="${filename//[$'\r\n\t ']}"
  percent="${percent//[$'\r\n\t ']}"

  if ! [[ "$percent" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    echo "Overslaan (ongeldig percentage): $filename=$percent"
    continue
  fi

  if awk "BEGIN { exit !($percent <= 0 || $percent >= 50) }"; then
    echo "Overslaan (percentage buiten range >0 en <50): $filename=$percent"
    continue
  fi

  file="$VIDEO_DIR/$filename"
  if [[ ! -f "$file" ]]; then
    echo "Overslaan (bestand niet gevonden): $filename"
    continue
  fi

  tmp="${file%.mp4}.tmp.mp4"
  echo "\n→ Verwerken: $filename (${percent}%)"

  ffmpeg -y -i "$file" \
    -vf "crop=iw:ih-trunc((ih*${percent}/100)/2)*2:0:0,pad=iw:trunc(ih/(1-${percent}/100)/2)*2:0:0:black" \
    -c:v libx264 -preset medium -crf 18 \
    -c:a copy \
    -movflags +faststart \
    "$tmp"

  mv "$tmp" "$file"
done < "$CONFIG_FILE"

echo "\nKlaar. Geselecteerde video's zijn definitief aangepast."