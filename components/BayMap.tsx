"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { BURRITOS, TIERS, TIER_COLORS } from "@/data/burritos";
import { addRequest, getRequests, type SpotRequest } from "@/lib/storage";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// a colored pin as an inline SVG divIcon (no marker image assets to 404)
function pinHtml(color: string, requested = false) {
  const ring = requested ? `stroke='#fff' stroke-width='2' stroke-dasharray='3 2'` : "";
  return `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 33C13 33 24 20.5 24 12A11 11 0 1 0 2 12C2 20.5 13 33 13 33Z"
      fill="${color}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
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
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const pendingMarker = useRef<Marker | null>(null);
  const [form, setForm] = useState({ name: "", neighborhood: "", note: "" });
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
            `<div style="font-family:var(--font-mono)">
              <div style="font-weight:700;color:${color}">${esc(b.tier)} &middot; ${esc(b.taqueria)}</div>
              <div style="font-size:11px;opacity:.7">${esc(b.neighborhood)}</div>
              <div style="font-family:var(--font-hand);font-size:16px;margin-top:4px;max-width:200px">&ldquo;${esc(b.fluffieNotes)}&rdquo;</div>
              ${b.videoUrl ? `<a href="${b.videoUrl}" target="_blank" rel="noreferrer" style="font-size:11px;color:#d13a24">watch the review &rarr;</a>` : ""}
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
          `<div style="font-family:var(--font-mono)">
            <div style="font-weight:700;color:#e0356b">REQUESTED</div>
            <div style="font-weight:700">${esc(r.name)}</div>
            <div style="font-size:11px;opacity:.7">${esc(r.neighborhood)}</div>
            ${r.note ? `<div style="font-family:var(--font-hand);font-size:16px;margin-top:4px;max-width:200px">${esc(r.note)}</div>` : ""}
          </div>`
        )
    );
  }, [requests]);

  // click-to-place while in "request" mode
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const onClick = (e: { latlng: { lat: number; lng: number } }) => {
      if (!placing) return;
      const { lat, lng } = e.latlng;
      setPending({ lat, lng });
      pendingMarker.current?.remove();
      pendingMarker.current = L.marker([lat, lng], {
        icon: L.divIcon({
          html: pinHtml("#e0356b", true),
          className: "",
          iconSize: [26, 34],
          iconAnchor: [13, 33],
        }),
        opacity: 0.7,
      }).addTo(map);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [placing]);

  const submit = () => {
    if (!pending || !form.name.trim()) return;
    const saved = addRequest({
      name: form.name.trim(),
      neighborhood: form.neighborhood.trim(),
      note: form.note.trim(),
      lat: pending.lat,
      lng: pending.lng,
    });
    setRequests((prev) => [...prev, saved]);
    pendingMarker.current?.remove();
    pendingMarker.current = null;
    setPending(null);
    setPlacing(false);
    setForm({ name: "", neighborhood: "", note: "" });
  };

  const cancel = () => {
    pendingMarker.current?.remove();
    pendingMarker.current = null;
    setPending(null);
    setPlacing(false);
    setForm({ name: "", neighborhood: "", note: "" });
  };

  return (
    <div className="relative h-full w-full">
      <div ref={holder} className="h-full w-full" />

      {/* request-a-spot control */}
      {!placing && !pending && (
        <button
          onClick={() => setPlacing(true)}
          className="pressable absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-(--olive) px-5 py-2 text-xl text-white shadow-[0_8px_24px_rgba(40,28,16,0.3)]"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          + request a spot for fluffie
        </button>
      )}

      {placing && !pending && (
        <div className="absolute left-1/2 top-4 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full border border-(--line) bg-(--surface) px-4 py-2.5 shadow-lg">
          <span
            className="text-[12px] font-bold uppercase tracking-[0.1em] text-(--ink)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            tap the map where it is
          </span>
          <button
            onClick={cancel}
            className="pressable text-[11px] uppercase tracking-wider text-(--ink-dim) hover:text-(--salsa)"
          >
            cancel
          </button>
        </div>
      )}

      {/* request form once a location is chosen */}
      {pending && (
        <div
          className="absolute left-1/2 top-4 z-[1000] w-[min(90vw,340px)] -translate-x-1/2 rounded-lg border border-(--line) bg-(--surface) p-4 shadow-[0_16px_48px_rgba(40,28,16,0.35)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-(--hotpink)">
            Request a burrito spot
          </p>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="taqueria name *"
            className="mb-2 w-full rounded-md border border-(--line) bg-(--bg) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim)/60 focus:border-(--salsa) focus:outline-none"
          />
          <input
            value={form.neighborhood}
            onChange={(e) =>
              setForm((f) => ({ ...f, neighborhood: e.target.value }))
            }
            placeholder="neighborhood"
            className="mb-2 w-full rounded-md border border-(--line) bg-(--bg) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim)/60 focus:border-(--salsa) focus:outline-none"
          />
          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="why should he go? (optional)"
            className="mb-3 w-full rounded-md border border-(--line) bg-(--bg) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim)/60 focus:border-(--salsa) focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!form.name.trim()}
              className="pressable flex-1 rounded-md bg-(--salsa) py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40"
            >
              Add to map
            </button>
            <button
              onClick={cancel}
              className="pressable rounded-md border border-(--line) px-3 py-2 text-[11px] uppercase tracking-wider text-(--ink-dim) hover:text-(--ink)"
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
        <p className="mb-1 text-lg leading-none text-(--ink)/70">tiers</p>
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
