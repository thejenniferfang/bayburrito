#!/bin/zsh
# Slice a 6-stage burrito composite (2 rows x 3 cols, numbered 1-6) into
# six transparent cutouts for the loading screen, and apply the 3<->4 swap
# Jen asked for so the burrito shrinks monotonically.
#
# Usage: ./slice-stages.sh <composite.png>
# Output: public/images/loader/stage-1.png ... stage-6.png
#
# Vision cutout binary comes from the chairs project.
set -euo pipefail
SRC="${1:?usage: slice-stages.sh <composite.png>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/public/images/loader"
CUT="$HOME/Desktop/chairs/tools/cutout"
mkdir -p "$OUT"

W=$(sips -g pixelWidth "$SRC" | awk '/pixelWidth/{print $2}')
H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/{print $2}')
# grid cells: 3 columns, 2 rows
CW=$((W / 3)); CH=$((H / 2))

# on-disk order 1..6 -> displayed stage after the 3<->4 swap
#   grid cell 3 becomes stage 4, grid cell 4 becomes stage 3
swap=(1 2 4 3 5 6)

i=1
for row in 0 1; do
  for col in 0 1 2; do
    x=$((col * CW)); y=$((row * CH))
    stage=${swap[$i]}
    "$CUT" --crop "${x},${y},${CW},${CH}" "$SRC" "$OUT/stage-${stage}.png"
    echo "grid cell $i -> stage $stage"
    i=$((i + 1))
  done
done
echo "wrote $OUT/stage-1.png .. stage-6.png"
