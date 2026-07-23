"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { BURRITOS, TIERS, TIER_COLORS } from "@/data/burritos";
import {
  addRequest,
  getRequests,
  removeRequest,
  type SpotRequest,
} from "@/lib/storage";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// a colored pin as an inline SVG divIcon (no marker image assets to 404)
function pinHtml(color: string, requested = false) {
  const ring = requested ? `stroke='#fff' stroke-width='2' stroke-dasharray='3 2'` : "";
  return `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 33C13 33 24 20.5 24 12A11 11 0 1 0 2 12C2 20.5 13 33 13 33Z"
      fill="${color}"/>
    <circle cx="13" cy="12" r="4.5" fill="#fff" ${ring}/>
  </svg>`;
}

export default function BayMap({ active = true }: { active?: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const boundsRef = useRef<[number, number][]>([]);
  const reqLayerRef = useRef<Marker[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<SpotRequest[]>([]);

  // init the map the first time this view opens. Initializing while the
  // container is actually visible avoids Leaflet caching a zero/stale
  // viewport (which paints only the center tiles).
  useEffect(() => {
    if (!active || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(holder.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        // tiles that finish loading while the layer is mid-transition can
        // get stuck at opacity 0; disabling the fade paints them on load
        fadeAnimation: false,
      });
      mapRef.current = map;

      // warm, low-key basemap. no API key needed.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // fluffie's reviewed spots
      const pts: [number, number][] = [];
      for (const b of BURRITOS) {
        if (!b.lat || !b.lng) continue;
        pts.push([b.lat, b.lng]);
        const color = getComputedStyle(document.documentElement)
          .getPropertyValue(TIER_COLORS[b.tier].replace(/var\((.+)\)/, "$1"))
          .trim() || "#d13a24";
        L.marker([b.lat, b.lng], {
          icon: L.divIcon({
            html: pinHtml(color),
            className: "",
            iconSize: [26, 34],
            iconAnchor: [13, 33],
            popupAnchor: [0, -30],
          }),
        })
          .addTo(map)
          .bindPopup(
            `<div>
              <div style="font-family:var(--font-bitcount);font-size:15px;color:${color}">${esc(b.tier)}</div>
              ${
                b.videoUrl
                  ? `<a href="${b.videoUrl}" target="_blank" rel="noreferrer" title="watch the review" style="font-family:var(--font-bitcount);font-size:13px;color:#201a13;text-decoration:none">${esc(b.taqueria)}</a>`
                  : `<div style="font-family:var(--font-bitcount);font-size:13px;color:#201a13">${esc(b.taqueria)}</div>`
              }
              <div style="font-family:var(--font-hand);font-size:15px;opacity:.7">${esc(b.neighborhood)}</div>
            </div>`
          );
      }
      boundsRef.current = pts;

      // Fit only once the container reports real pixel dimensions. A
      // ResizeObserver fires immediately on observe with the laid-out size,
      // which dodges the "measured zero -> street-zoom, center tiles only"
      // failure of fitting synchronously right after L.map().
      // Frame the core Bay Area (SF -> Santa Cruz -> Berkeley); a couple of
      // spots geocode out to Sacramento/Tahoe, and a fixed box keeps those
      // from dragging the view into the Central Valley. Users can pan.
      let fitted = false;
      const ro = new ResizeObserver(() => {
        if (!holder.current) return;
        if (holder.current.clientWidth < 2 || holder.current.clientHeight < 2)
          return;
        map.invalidateSize();
        if (!fitted) {
          fitted = true;
          map.fitBounds(
            [
              [36.9, -122.7],
              [38.05, -121.75],
            ],
            { padding: [20, 20] }
          );
        }
      });
      ro.observe(holder.current!);
      roRef.current = ro;

      // user requests from a prior session
      setRequests(getRequests());
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // when the map view becomes active, recompute size and refit (Leaflet
  // renders a stale/zero viewport if it initialized while its layer was
  // stacked behind another view)
  // Nudge tiles to paint once the view-layer opacity/scale transition
  // (~200ms) settles. invalidateSize alone sizes correctly but tiles only
  // reliably paint after a real resize event fires post-transition.
  useEffect(() => {
    if (!active) return;
    const map = mapRef.current;
    if (!map) return;
    const timers = [250, 600, 1000].map((ms) =>
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        map.invalidateSize();
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  // final teardown on unmount only
  useEffect(
    () => () => {
      roRef.current?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  // render request markers whenever the list changes
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    reqLayerRef.current.forEach((m) => m.remove());
    reqLayerRef.current = requests.map((r) =>
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          html: pinHtml("#e0356b", true),
          className: "",
          iconSize: [26, 34],
          iconAnchor: [13, 33],
          popupAnchor: [0, -30],
        }),
      })
        .addTo(map)
        .bindPopup(
          `<div>
            <div style="font-family:var(--font-bitcount);font-size:13px;color:#e0356b">requested</div>
            <div style="font-family:var(--font-bitcount);font-size:13px;color:#201a13">${esc(r.name)}</div>
            <div style="font-family:var(--font-hand);font-size:15px;opacity:.7">${esc(r.neighborhood)}</div>
            ${r.note ? `<div style="font-family:var(--font-hand);font-size:15px;margin-top:2px;max-width:200px">${esc(r.note)}</div>` : ""}
            <button data-remove-request="${r.id}" style="font-family:var(--font-hand);font-size:14px;color:#d13a24;background:none;border:none;padding:4px 0 0;cursor:pointer">remove</button>
          </div>`
        )
    );
  }, [requests]);

  // delegated: "remove" inside a requested-pin popup deletes that request
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const onClick = (e: Event) => {
      const t = (e.target as HTMLElement).closest("[data-remove-request]");
      if (!t) return;
      const id = t.getAttribute("data-remove-request")!;
      removeRequest(id);
      mapRef.current?.closePopup();
      setRequests(getRequests());
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  // Beli-style: type the place name, we geocode it and drop the pin.
  const search = async () => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Restrict results to the Bay Area: bounded=1 confines Nominatim to
      // the viewbox, and we double-check the returned point is inside it.
      const BAY = { w: -122.75, e: -121.55, s: 36.85, n: 38.1 };
      const base =
        "https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1" +
        `&viewbox=${BAY.w},${BAY.n},${BAY.e},${BAY.s}&bounded=1`;
      type Hit = { lat: string; lon: string; address?: Record<string, string> };
      const inBay = (h: Hit) => {
        const la = +h.lat,
          lo = +h.lon;
        return la >= BAY.s && la <= BAY.n && lo >= BAY.w && lo <= BAY.e;
      };
      let hit: Hit | undefined;
      for (const variant of [q, `${q}, California`]) {
        const res = await fetch(`${base}&q=${encodeURIComponent(variant)}`, {
          headers: { Accept: "application/json" },
        });
        hit = ((await res.json()) as Hit[]).find(inBay);
        if (hit) break;
      }
      if (!hit) {
        setError("couldn't find that in the Bay Area. try adding the city.");
        setBusy(false);
        return;
      }
      const a = hit.address ?? {};
      const neighborhood =
        a.city || a.town || a.suburb || a.neighbourhood || a.county || "";
      const saved = addRequest({
        name: q,
        neighborhood,
        note: note.trim(),
        lat: +(+hit.lat).toFixed(5),
        lng: +(+hit.lon).toFixed(5),
      });
      setRequests((prev) => [...prev, saved]);
      mapRef.current?.setView([+hit.lat, +hit.lon], 14);
      setQuery("");
      setNote("");
      setSearching(false);
    } catch {
      setError("search failed, try again");
    }
    setBusy(false);
  };

  const cancel = () => {
    setSearching(false);
    setQuery("");
    setNote("");
    setError(null);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={holder} className="h-full w-full" />

      {/* request-a-spot: search by name (we geocode it, Beli-style) */}
      {!searching && (
        <button
          onClick={() => setSearching(true)}
          className="pressable absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-(--olive) px-5 py-2 text-xl text-white shadow-[0_8px_24px_rgba(40,28,16,0.3)]"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          + request a spot for fluffie
        </button>
      )}

      {searching && (
        <div
          className="absolute left-1/2 top-4 z-[1000] w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl bg-(--surface) p-4 shadow-[0_16px_48px_rgba(40,28,16,0.35)]"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          <p className="mb-2 text-xl leading-none text-(--olive)">
            request a spot for fluffie
          </p>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="place name, e.g. La Taqueria SF"
            className="mb-2 w-full rounded-lg bg-(--bg) px-3 py-2 text-lg text-(--ink) placeholder:text-(--ink-dim)/60 focus:outline-none focus:ring-2 focus:ring-(--olive)"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="why should he go? (optional)"
            className="mb-2 w-full rounded-lg bg-(--bg) px-3 py-2 text-lg text-(--ink) placeholder:text-(--ink-dim)/60 focus:outline-none focus:ring-2 focus:ring-(--olive)"
          />
          {error && <p className="mb-2 text-base text-(--salsa)">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={search}
              disabled={!query.trim() || busy}
              className="pressable flex-1 rounded-lg bg-(--olive) py-2 text-lg text-white disabled:opacity-40"
            >
              {busy ? "searching..." : "find it & add"}
            </button>
            <button
              onClick={cancel}
              className="pressable rounded-lg px-3 py-2 text-lg text-(--ink-dim) hover:text-(--ink)"
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* tier color key */}
      <div
        className="absolute bottom-6 left-4 z-[900] rounded-lg border border-(--line) bg-(--surface)/95 px-3.5 py-2.5"
        style={{ fontFamily: "var(--font-hand)" }}
      >
        <p
          className="mb-1.5 text-base leading-none text-(--ink)/70"
          style={{ fontFamily: "var(--font-bitcount)" }}
        >
          tiers
        </p>
        <div className="flex items-center gap-2.5">
          {TIERS.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: TIER_COLORS[t] }}
              />
              <span className="text-lg leading-none text-(--ink)">{t}</span>
            </span>
          ))}
        </div>
        <span className="mt-1.5 flex items-center gap-1.5 text-lg leading-none text-(--ink-dim)">
          <span className="inline-block h-3 w-3 rounded-full bg-(--hotpink)" />
          requested {requests.length > 0 ? `(${requests.length})` : ""}
        </span>
      </div>
    </div>
  );
}
