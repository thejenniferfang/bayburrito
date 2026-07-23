#!/bin/zsh
# Download fluffie.donut videos and auto-extract candidate frames.
# Reads data/burrito-ids.txt lines of "<video_id>|<place-slug>".
# Videos land in ../assets/video/, frames in ../assets/frames/<slug>-<id>/.
# Frames are taken at 20/35/50/65/80% of duration to skip intros/outros.
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
VID="$DIR/../assets/video"
FRAMES="$DIR/../assets/frames"
mkdir -p "$VID" "$FRAMES"

while IFS='|' read -r id slug; do
  [ -z "$id" ] && continue
  out="$FRAMES/${slug}-${id}"
  # frames-exist check BEFORE download, or reruns re-fetch every mp4
  if [ -d "$out" ] && [ -n "$(ls "$out" 2>/dev/null)" ]; then
    echo "skip $slug (frames exist)"
    continue
  fi
  mp4="$VID/$id.mp4"
  if [ ! -s "$mp4" ]; then
    python3 -m yt_dlp -q -f "mp4" -o "$mp4" "https://www.tiktok.com/@fluffie.donut/video/$id" \
      || { echo "download fail $id"; continue; }
  fi
  mkdir -p "$out"
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$mp4")
  i=1
  for p in 0.20 0.35 0.50 0.65 0.80; do
    t=$(printf '%.2f' "$(echo "$dur * $p" | bc)")
    ffmpeg -v quiet -ss "$t" -i "$mp4" -frames:v 1 -q:v 2 "$out/f$i.jpg" -y
    i=$((i+1))
  done
  rm -f "$mp4" # keep frames only; mp4s are re-downloadable and disk is tight
  echo "ok $slug ($id)"
done < "$DIR/data/burrito-ids.txt"

echo "frames in $FRAMES"
