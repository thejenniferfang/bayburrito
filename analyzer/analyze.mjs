#!/usr/bin/env node
/**
 * fluffie.donut content analyzer.
 * Reads data/videos.jsonl (one video per line, from scrape.sh) and emits:
 *   data/places.csv   structured place list w/ engagement
 *   data/report.json  per-category + per-city rollups
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const rows = readFileSync(join(root, "data/videos.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));

const ratingRe = /(\d+(?:\.\d+)?)\s*\/\s*10/;

const videos = rows.map((v) => {
  const interactions = (v.likes ?? 0) + (v.comments ?? 0) + (v.shares ?? 0) + (v.saves ?? 0);
  return {
    ...v,
    date: new Date(v.createTime * 1000).toISOString().slice(0, 10),
    hashtags: [...v.desc.matchAll(/#(\w+)/g)].map((m) => m[1]),
    fluffieRating: v.desc.match(ratingRe)?.[1] ?? null,
    interactions,
    engagementRate: v.plays ? interactions / v.plays : 0,
    saveRate: v.plays ? (v.saves ?? 0) / v.plays : 0,
    shareRate: v.plays ? (v.shares ?? 0) / v.plays : 0,
  };
});

videos.sort((a, b) => b.plays - a.plays);

const pct = (x) => (x * 100).toFixed(1) + "%";
const csvEsc = (s) => `"${String(s ?? "").replaceAll('"', '""')}"`;

const csv = [
  "place,address,city,category,video_url,date,plays,likes,comments,shares,saves,engagement_rate,save_rate,fluffie_rating,caption",
  ...videos.map((v) =>
    [
      csvEsc(v.poi?.name),
      csvEsc(v.poi?.address),
      csvEsc(v.poi?.city),
      csvEsc(v.poi?.category),
      `https://www.tiktok.com/@fluffie.donut/video/${v.id}`,
      v.date,
      v.plays,
      v.likes,
      v.comments,
      v.shares,
      v.saves,
      pct(v.engagementRate),
      pct(v.saveRate),
      v.fluffieRating ?? "",
      csvEsc(v.desc),
    ].join(",")
  ),
].join("\n");
writeFileSync(join(root, "data/places.csv"), csv);

function rollup(key) {
  const groups = {};
  for (const v of videos) {
    const k = v.poi?.[key] ?? "untagged";
    (groups[k] ??= []).push(v);
  }
  return Object.entries(groups)
    .map(([k, vs]) => ({
      [key]: k,
      videos: vs.length,
      totalPlays: vs.reduce((s, v) => s + v.plays, 0),
      medianPlays: vs.map((v) => v.plays).sort((a, b) => a - b)[Math.floor(vs.length / 2)],
      avgEngagement: pct(vs.reduce((s, v) => s + v.engagementRate, 0) / vs.length),
      avgSaveRate: pct(vs.reduce((s, v) => s + v.saveRate, 0) / vs.length),
    }))
    .sort((a, b) => b.medianPlays - a.medianPlays);
}

const report = {
  scrapedVideos: videos.length,
  totalCatalog: 276,
  coverage: pct(videos.length / 276),
  byCategory: rollup("category"),
  byCity: rollup("city"),
  topBySaves: videos
    .slice()
    .sort((a, b) => b.saveRate - a.saveRate)
    .slice(0, 5)
    .map((v) => ({ place: v.poi?.name, saveRate: pct(v.saveRate), plays: v.plays })),
};
writeFileSync(join(root, "data/report.json"), JSON.stringify(report, null, 2));

console.log(`${videos.length} videos analyzed`);
console.table(
  videos.map((v) => ({
    place: v.poi?.name,
    city: v.poi?.city,
    plays: v.plays,
    er: pct(v.engagementRate),
    saves: pct(v.saveRate),
  }))
);
console.log(JSON.stringify(report.byCategory, null, 2));
