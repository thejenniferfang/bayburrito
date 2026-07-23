"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BURRITOS, TIER_COLORS, type Burrito } from "@/data/burritos";

// map projection bounds (roughly Marin down to Santa Cruz)
const MIN_LNG = -122.75;
const MAX_LNG = -121.65;
const MIN_LAT = 36.9;
const MAX_LAT = 38.05;
const W = 440;
const H = 560;

const px = (lng: number) => ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * W;
const py = (lat: number) => ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * H;

/** Hand-sketched Bay Area with taqueria pins and a notes drawer. */
export default function BayMap() {
  const [open, setOpen] = useState<Burrito | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative h-full max-h-full" style={{ aspectRatio: `${W}/${H}` }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            aria-label="Hand-drawn map of the San Francisco Bay Area"
          >
            {/* the bay */}
            <path
              d="M118 158
                 Q140 148 158 138
                 Q150 108 162 84 Q178 62 204 58 Q232 56 244 74 Q252 90 240 102
                 Q222 96 210 108 Q200 122 208 142
                 Q218 168 224 196 Q232 232 250 266 Q270 302 292 338
                 Q314 372 334 410 Q348 438 352 462
                 Q346 478 330 470 Q314 452 298 424
                 Q276 388 254 352 Q232 316 214 278 Q198 242 184 210
                 Q170 182 148 170 Q130 164 118 158 Z"
              fill="var(--bg-raised)"
              stroke="var(--ink-dim)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* pacific coastline */}
            <path
              d="M96 0 Q104 28 96 54 Q86 84 98 112 Q108 134 104 152
                 M96 178 Q84 210 92 244 Q102 274 92 306 Q80 342 90 378 Q100 410 92 444 Q84 480 94 516 Q100 538 96 560"
              fill="none"
              stroke="var(--ink-dim)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.65"
            />
            {/* golden gate */}
            <path
              d="M104 152 Q112 156 118 158 M148 170 Q142 176 138 184"
              fill="none"
              stroke="var(--ink-dim)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M108 154 L146 168"
              stroke="var(--salsa)"
              strokeWidth="2"
              strokeDasharray="4 3"
              opacity="0.7"
            />
            {/* hand labels */}
            <g
              className="font-hand"
              fill="var(--ink-dim)"
              fontSize="17"
              opacity="0.8"
            >
              <text x="24" y="230" transform="rotate(-78 24 230)">
                the pacific
              </text>
              <text x="124" y="204">SF</text>
              <text x="238" y="140">Berkeley</text>
              <text x="252" y="222">Oakland</text>
              <text x="330" y="500">San Jose</text>
              <text x="236" y="300" transform="rotate(48 236 300)" opacity="0.5">
                the bay
              </text>
            </g>
          </svg>

          {/* pins as HTML so hit targets are honest */}
          {BURRITOS.map((b) => (
            <button
              key={b.id}
              onClick={() => setOpen(b)}
              aria-label={`${b.taqueria}, ${b.neighborhood}`}
              className="pressable group absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(px(b.lng) / W) * 100}%`,
                top: `${(py(b.lat) / H) * 100}%`,
              }}
            >
              <span
                className="block h-3.5 w-3.5 rounded-full border-2 border-(--bg) transition-transform duration-150 group-hover:scale-125"
                style={{
                  background: TIER_COLORS[b.tier],
                  transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                  boxShadow: "0 0 0 1px var(--ink-dim)",
                }}
              />
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-hand text-lg text-(--ink) opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {b.taqueria}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              aria-label="Close drawer"
              className="absolute inset-0 z-10 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(null)}
            />
            <motion.aside
              className="paper absolute inset-y-0 right-0 z-20 w-[min(85vw,320px)] p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.45)]"
              initial={{ transform: "translateX(100%)" }}
              animate={{ transform: "translateX(0%)" }}
              exit={{ transform: "translateX(100%)" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              role="dialog"
              aria-label={open.taqueria}
            >
              <span
                className="font-serif text-4xl"
                style={{ color: TIER_COLORS[open.tier] }}
              >
                {open.tier}
              </span>
              <h3 className="mt-2 font-hand text-4xl text-(--paper-ink)">
                {open.taqueria}
              </h3>
              <p className="font-hand text-xl text-(--paper-ink)/60">
                {open.neighborhood} &middot; {open.name}
              </p>
              <p className="mt-4 font-hand text-2xl leading-8 text-(--paper-ink)/85">
                &ldquo;{open.fluffieNotes}&rdquo;
              </p>
              {open.beliRating !== undefined && (
                <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-(--salsa)">
                  Beli {open.beliRating.toFixed(1)} / 10
                </p>
              )}
              <button
                onClick={() => setOpen(null)}
                className="pressable absolute right-4 top-4 text-[11px] uppercase tracking-[0.2em] text-(--paper-ink)/50 transition-colors duration-150 hover:text-(--paper-ink)"
              >
                Close
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
