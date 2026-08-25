#!/bin/bash
#
# Normalise Marand Studio scene photographs.
#
#   1. drop your generated images into assets/studio/scenes/
#      named after the scene: living.png, dormitor.jpeg, birou.webp — the
#      extension and the size do not matter, only the name
#   2. run:  bash scripts/studio-scenes.sh
#
# Each one is cropped to 16:10, resized to 2000px wide and saved as <id>.jpg,
# which is exactly what the renderer looks for. Originals are moved to
# scenes/_originals/ rather than deleted, so a bad crop is recoverable.
#
# Uses macOS `sips` only — no ImageMagick, no npm packages.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/assets/studio/scenes"
KEEP="$DIR/_originals"

TARGET_W=2000
TARGET_H=1250          # 16:10, the aspect the stage renders at

IDS=(living dormitor bucatarie birou receptie restaurant hotel comercial)

if ! command -v sips >/dev/null 2>&1; then
  echo "sips not found — this script is macOS only." >&2
  exit 1
fi

mkdir -p "$KEEP"
processed=0
missing=()

for id in "${IDS[@]}"; do
  # accept any extension, any case, but not the already-normalised .jpg
  src=""
  for cand in "$DIR/$id".*; do
    [ -e "$cand" ] || continue
    case "$cand" in
      "$DIR/$id.jpg") continue ;;          # already normalised
    esac
    src="$cand"
    break
  done

  if [ -z "$src" ]; then
    [ -e "$DIR/$id.jpg" ] || missing+=("$id")
    continue
  fi

  w=$(sips -g pixelWidth  "$src" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" 2>/dev/null | awk '/pixelHeight/{print $2}')
  if [ -z "${w:-}" ] || [ -z "${h:-}" ]; then
    echo "  SKIP  $(basename "$src") — not a readable image"
    continue
  fi

  tmp="$DIR/.$id.working.jpg"
  cp "$src" "$tmp"

  # Resample along whichever axis leaves enough pixels to crop the other,
  # so we never upscale past what the source actually has.
  if [ "$((w * TARGET_H))" -gt "$((h * TARGET_W))" ]; then
    # source is wider than 16:10 -> match height, crop width
    sips --resampleHeight "$TARGET_H" "$tmp" >/dev/null 2>&1
  else
    # source is taller than 16:10 -> match width, crop height
    sips --resampleWidth "$TARGET_W" "$tmp" >/dev/null 2>&1
  fi

  # centred crop to the exact frame
  sips -c "$TARGET_H" "$TARGET_W" "$tmp" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 60 "$tmp" --out "$DIR/$id.jpg" >/dev/null 2>&1
  rm -f "$tmp"

  mv "$src" "$KEEP/$(basename "$src")"

  size=$(du -h "$DIR/$id.jpg" | cut -f1 | tr -d ' ')
  echo "  ok    $id.jpg   ${w}x${h} -> ${TARGET_W}x${TARGET_H}   $size"
  processed=$((processed + 1))
done

echo
echo "$processed normalised."

if [ ${#missing[@]} -gt 0 ]; then
  echo "still missing: ${missing[*]}"
  echo "(those scenes keep their drawn fallback until a file shows up)"
fi

echo
echo "Next: open /studio/?calibrate=1 and calibrate wallQuad + wallWidthCm"
echo "for each new photo, then paste the generated objects into scenes.js."
