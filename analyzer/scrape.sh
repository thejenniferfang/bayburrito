#!/bin/zsh
# Scrape fluffie.donut TikTok video pages into data/videos.jsonl.
# Usage: ./scrape.sh <video_id> [<video_id> ...]
#        ./scrape.sh --file ids.txt
# Requires the gstack browse daemon (~/.claude/skills/gstack/browse).
# Video pages render for anonymous headless sessions; the profile grid
# does not (TikTok blocks item_list for unauthenticated bots), so IDs
# come from search engines, cookies-authed sessions, or Apify.
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
OUT="$(dirname "$0")/data/videos.jsonl"
mkdir -p "$(dirname "$OUT")"
touch "$OUT"

ids=("$@")
if [[ "${1:-}" == "--file" ]]; then
  ids=($(cat "$2"))
fi

"$B" useragent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36" >/dev/null

for id in "${ids[@]}"; do
  if grep -q "\"id\":\"$id\"" "$OUT"; then
    echo "skip $id (already scraped)"
    continue
  fi
  "$B" goto "https://www.tiktok.com/@fluffie.donut/video/$id" >/dev/null 2>&1
  row=$("$B" js "(() => { try { const s = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__'); const it = JSON.parse(s.textContent)['__DEFAULT_SCOPE__']['webapp.video-detail']?.itemInfo?.itemStruct; if (!it) return 'MISS'; return JSON.stringify({ id: it.id, desc: it.desc, createTime: Number(it.createTime), plays: it.stats?.playCount, likes: it.stats?.diggCount, comments: it.stats?.commentCount, shares: it.stats?.shareCount, saves: Number(it.stats?.collectCount ?? 0), duration: it.video?.duration, poi: it.poi ? { name: it.poi.name, address: it.poi.address, city: it.poi.city, category: it.poi.ttTypeNameMedium } : null }); } catch (e) { return 'ERR ' + e.message; } })()" 2>/dev/null | tail -1)
  case "$row" in
    '{'*) echo "$row" >> "$OUT"; echo "ok   $id" ;;
    *) echo "fail $id: $row" ;;
  esac
done
