#!/usr/bin/env node
/**
 * Build assets/contact-sheet.html: every extracted frame grouped by
 * taqueria, with the video's caption + stats. Open it, skim, and note
 * the winning frame per place (e.g. "los-gallos f3").
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const framesDir = join(root, "../assets/frames");
const videos = Object.fromEntries(
  readFileSync(join(root, "data/videos.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .map((v) => [v.id, v])
);

const groups = readdirSync(framesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const id = d.name.split("-").at(-1);
    return { dir: d.name, id, video: videos[id] };
  })
  .sort((a, b) => (b.video?.plays ?? 0) - (a.video?.plays ?? 0));

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<!doctype html><meta charset="utf-8"><title>fluffie burrito frames</title>
<style>
  body { font: 14px system-ui; background: #131110; color: #ede5d8; margin: 2rem; }
  h2 { margin: 2.2rem 0 0.2rem; font-size: 18px; }
  .meta { color: #9b917f; margin: 0 0 0.6rem; max-width: 80ch; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .row figure { margin: 0; }
  .row img { height: 240px; border-radius: 4px; display: block; }
  figcaption { color: #9b917f; font-size: 11px; text-align: center; padding-top: 2px; }
</style>
<h1>fluffie.donut burrito frames (${groups.length} places)</h1>
<p class="meta">Sorted by plays. Tell Claude which frame wins per place, e.g. "los-gallos f3".</p>
${groups
  .map(({ dir, id, video }) => {
    const frames = readdirSync(join(framesDir, dir)).filter((f) => f.endsWith(".jpg"));
    return `<h2>${esc(video?.poi?.name ?? dir)} <small style="color:#9b917f">${
      video ? `${video.plays.toLocaleString()} plays` : ""
    }</small></h2>
<p class="meta">${esc(video?.desc)} &middot; <a style="color:#c0803a" href="https://www.tiktok.com/@fluffie.donut/video/${id}">video</a></p>
<div class="row">${frames
      .map(
        (f) =>
          `<figure><img loading="lazy" src="frames/${dir}/${f}" alt=""><figcaption>${dir} ${f.replace(".jpg", "")}</figcaption></figure>`
      )
      .join("")}</div>`;
  })
  .join("\n")}`;

const out = join(root, "../assets/contact-sheet.html");
writeFileSync(out, html);
console.log(`wrote ${out} (${groups.length} places)`);
if (!existsSync(framesDir)) console.error("frames dir missing!");
