"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BURRITOS, TIERS, TIER_COLORS, type Burrito } from "@/data/burritos";
import BurritoImage from "./BurritoImage";

/** Editorial tier board, S down to F, with a custom detail modal. */
export default function TierList() {
  const [open, setOpen] = useState<Burrito | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="h-full overflow-y-auto px-5 py-6 md:px-12">
      <div className="mx-auto max-w-4xl">
        {TIERS.map((tier) => {
          const entries = BURRITOS.filter((b) => b.tier === tier);
          return (
            <section
              key={tier}
              className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-(--line) py-5 md:grid-cols-[6rem_1fr] md:gap-8"
            >
              <div className="flex flex-col items-start">
                <span
                  className="text-5xl font-bold leading-none md:text-7xl"
                  style={{ color: TIER_COLORS[tier], fontFamily: "var(--font-display)" }}
                >
                  {tier}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-(--ink-dim)">
                  {entries.length || "no"}{" "}
                  {entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {entries.length === 0 ? (
                <p className="self-center font-hand text-xl text-(--ink-dim)/60">
                  nothing here yet...
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {entries.map((b, i) => (
                    <button
                      key={b.id}
                      onClick={() => setOpen(b)}
                      className="pressable group flex flex-col items-start rounded-md border border-(--line) bg-(--surface) p-3 text-left transition-colors duration-200 hover:border-(--salsa)"
                    >
                      <BurritoImage
                        src={b.imgUrl}
                        alt={b.taqueria}
                        variant={i}
                        className="mb-2 w-20 opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                      />
                      <span className="text-sm text-(--ink)">
                        {b.taqueria}
                      </span>
                      <span className="text-xs text-(--ink-dim)">
                        {b.neighborhood}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {open && <DetailModal burrito={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}

function DetailModal({
  burrito,
  onClose,
}: {
  burrito: Burrito;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal
        aria-label={burrito.name}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-md rounded-lg border border-(--line) bg-(--surface) p-6 shadow-[0_30px_80px_rgba(40,28,16,0.35)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className="text-4xl font-bold"
              style={{ color: TIER_COLORS[burrito.tier], fontFamily: "var(--font-display)" }}
            >
              {burrito.tier}
            </span>
            <h3
              className="mt-1 text-2xl font-bold text-(--ink)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {burrito.taqueria}
            </h3>
            <p className="text-sm text-(--ink-dim)">
              {burrito.name} &middot; {burrito.neighborhood}
            </p>
          </div>
          <BurritoImage src={burrito.imgUrl} alt={burrito.taqueria} className="w-24 shrink-0" />
        </div>
        <p className="mt-4 font-hand text-2xl leading-8 text-(--ink)/85">
          &ldquo;{burrito.fluffieNotes}&rdquo;
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-(--salsa)">
          {burrito.beliRating !== undefined && (
            <>Beli {burrito.beliRating.toFixed(1)} / 10 &middot; </>
          )}
          {burrito.videoUrl && (
            <a
              href={burrito.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-colors duration-150 hover:text-(--ink)"
            >
              Watch on TikTok
            </a>
          )}
        </p>
        <button
          onClick={onClose}
          className="pressable mt-5 w-full rounded-sm border border-(--line) py-2 text-[11px] uppercase tracking-[0.25em] text-(--ink-dim) transition-colors duration-150 hover:text-(--ink)"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
