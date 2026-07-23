#!/usr/bin/env node
/**
 * Build assets/picker.html: interactive frame + tier picker.
 * Click one frame per place, tap a tier chip (pre-suggested from his X/10
 * caption rating when present), toggle skip for non-burrito places.
 * "Export picks" downloads picks.json; feed that to apply-picks.mjs.
 * Selections persist in localStorage so you can close and resume.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const suggestTier = (desc) => {
  const m = desc?.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!m) return null;
  const r = parseFloat(m[1]);
  if (r >= 9) return "S";
  if (r >= 8) return "A";
  if (r >= 7) return "B";
  if (r >= 6) return "C";
  if (r >= 5) return "D";
  return "F";
};

const places = readdirSync(framesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const id = d.name.split("-").at(-1);
    const v = videos[id];
    return {
      dir: d.name,
      id,
      frames: readdirSync(join(framesDir, d.name)).filter((f) => f.endsWith(".jpg")),
      place: v?.poi?.name ?? d.name,
      city: v?.poi?.city ?? "",
      desc: v?.desc ?? "",
      plays: v?.plays ?? 0,
      suggestedTier: suggestTier(v?.desc),
    };
  })
  .sort((a, b) => b.plays - a.plays);

const html = `<!doctype html><meta charset="utf-8"><title>BBC frame picker</title>
<style>
  :root { --bg:#131110; --raised:#1b1815; --ink:#ede5d8; --dim:#9b917f; --line:#2a251f; --accent:#c0803a; --salsa:#c23b26; }
  body { font: 14px system-ui; background: var(--bg); color: var(--ink); margin: 0; padding: 5.5rem 2rem 4rem; }
  header { position: fixed; inset: 0 0 auto; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); padding: 0.9rem 2rem; display: flex; align-items: center; gap: 1rem; z-index: 5; }
  h1 { font-size: 16px; margin: 0; flex: 1; }
  #count { color: var(--dim); }
  button.export { background: var(--accent); color: var(--bg); border: 0; border-radius: 999px; padding: 0.55rem 1.2rem; font-weight: 600; cursor: pointer; }
  section { border-top: 1px solid var(--line); padding: 1.1rem 0; }
  section.skipped { opacity: 0.35; }
  .head { display: flex; align-items: baseline; gap: 0.8rem; flex-wrap: wrap; }
  .head b { font-size: 16px; }
  .head .city, .head .plays { color: var(--dim); font-size: 12px; }
  .desc { color: var(--dim); margin: 0.2rem 0 0.7rem; max-width: 90ch; font-size: 12px; }
  .tiers { display: inline-flex; gap: 4px; margin-left: auto; }
  .tiers button { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line); background: var(--raised); color: var(--dim); cursor: pointer; font-weight: 700; }
  .tiers button.on { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .skip { margin-left: 0.6rem; background: none; border: 1px solid var(--line); color: var(--dim); border-radius: 6px; padding: 0.3rem 0.6rem; cursor: pointer; font-size: 11px; }
  .frames { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
  .frames img { height: 210px; border-radius: 6px; cursor: pointer; border: 3px solid transparent; display: block; }
  .frames img.on { border-color: var(--salsa); }
</style>
<header>
  <h1>BBC frame picker</h1>
  <span id="count"></span>
  <button class="export" onclick="exportPicks()">Export picks.json</button>
</header>
<div id="app"></div>
<script>
const PLACES = ${JSON.stringify(places)};
const KEY = "bbc-picks";
const picks = JSON.parse(localStorage.getItem(KEY) || "{}");
const save = () => { localStorage.setItem(KEY, JSON.stringify(picks)); render(); };

function render() {
  const app = document.getElementById("app");
  app.innerHTML = PLACES.map(p => {
    const pk = picks[p.dir] || {};
    const tier = pk.tier ?? p.suggestedTier;
    return \`<section class="\${pk.skip ? "skipped" : ""}" id="s-\${p.dir}">
      <div class="head">
        <b>\${p.place}</b>
        <span class="city">\${p.city}</span>
        <span class="plays">\${p.plays.toLocaleString()} plays</span>
        <span class="tiers">\${["S","A","B","C","D","F"].map(t =>
          \`<button class="\${tier === t ? "on" : ""}" onclick="setTier('\${p.dir}','\${t}')">\${t}</button>\`).join("")}
        </span>
        <button class="skip" onclick="toggleSkip('\${p.dir}')">\${pk.skip ? "include" : "skip"}</button>
      </div>
      <p class="desc">\${p.desc.replace(/</g, "&lt;")}</p>
      <div class="frames">\${p.frames.map(f =>
        \`<img loading="lazy" src="frames/\${p.dir}/\${f}" class="\${pk.frame === f ? "on" : ""}"
          onclick="setFrame('\${p.dir}','\${f}')">\`).join("")}
      </div>
    </section>\`;
  }).join("");
  const done = PLACES.filter(p => picks[p.dir]?.skip || picks[p.dir]?.frame).length;
  document.getElementById("count").textContent = done + " / " + PLACES.length + " decided";
}
function setFrame(dir, f) { picks[dir] = { ...picks[dir], frame: picks[dir]?.frame === f ? undefined : f }; save(); }
function setTier(dir, t) { picks[dir] = { ...picks[dir], tier: t }; save(); }
function toggleSkip(dir) { picks[dir] = { ...picks[dir], skip: !picks[dir]?.skip }; save(); }
function exportPicks() {
  const out = {};
  for (const p of PLACES) {
    const pk = picks[p.dir];
    if (!pk || pk.skip) { if (pk?.skip) out[p.dir] = { skip: true }; continue; }
    if (pk.frame) out[p.dir] = { frame: pk.frame, tier: pk.tier ?? p.suggestedTier ?? "B" };
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
  a.download = "picks.json";
  a.click();
}
render();
</script>`;

writeFileSync(join(root, "../assets/picker.html"), html);
console.log(`wrote assets/picker.html (${places.length} places)`);
