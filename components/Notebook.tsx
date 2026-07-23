"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TIER_COLORS, type Burrito } from "@/data/burritos";
import {
  addComment,
  addRating,
  getComments,
  getRatings,
  type UserComment,
} from "@/lib/storage";

function timeAgo(at: number) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** The top-half notebook page for the active burrito. */
export default function Notebook({ burrito }: { burrito: Burrito }) {
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ background: "#9BB7D4" }}
    >
      {/* concurrent crossfade (no mode="wait"): the wheel sweeps through
          several burritos per spin and interrupted waits never resolve */}
      <AnimatePresence initial={false}>
        <motion.div
          key={burrito.id}
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 flex gap-6 overflow-hidden px-6 py-3 md:gap-10 md:px-12 md:py-4"
        >
          {/* left: place identity + notes */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  className="text-xl leading-tight text-(--paper-ink) md:text-3xl"
                  style={{ fontFamily: "var(--font-bitcount)" }}
                >
                  <span style={{ color: TIER_COLORS[burrito.tier] }}>
                    {burrito.tier}
                  </span>{" "}
                  {burrito.videoUrl ? (
                    <a
                      href={burrito.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="watch the review"
                      className="transition-colors duration-150 hover:text-(--salsa)"
                    >
                      {burrito.taqueria}
                    </a>
                  ) : (
                    burrito.taqueria
                  )}
                </h2>
                <p className="font-hand text-lg text-(--paper-ink)/60 md:text-xl">
                  {burrito.neighborhood}
                </p>
              </div>
              {burrito.beliRating !== undefined && (
                <BeliStamp score={burrito.beliRating} />
              )}
            </div>

            <p className="mt-1 font-hand text-xl leading-7 text-(--paper-ink)/85 md:text-2xl">
              &ldquo;{burrito.fluffieNotes}&rdquo;
            </p>
          </div>

          {/* right: your rating + comments */}
          <div className="flex w-[240px] shrink-0 flex-col justify-center gap-2 md:w-[300px]">
            <RatingBar burritoId={burrito.id} />
            <Comments burritoId={burrito.id} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BeliStamp({ score }: { score: number }) {
  return (
    <div
      className="flex h-20 w-20 shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border-[2.5px] border-(--salsa)/70 text-(--salsa)/80 md:h-24 md:w-24"
      style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--salsa) 30%, transparent)" }}
      aria-label={`Beli rating ${score} out of 10`}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.25em]">
        Beli
      </span>
      <span className="font-hand text-3xl leading-none md:text-4xl">
        {score.toFixed(1)}
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em] opacity-70">
        / 10
      </span>
    </div>
  );
}

/** Salsa-red fill bar, click or drag to rate 0-10. */
function RatingBar({ burritoId }: { burritoId: string }) {
  const [value, setValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    setValue(getRatings()[burritoId] ?? null);
  }, [burritoId]);

  const setFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 10;
    const v = Math.round(Math.max(0, Math.min(10, raw)) * 2) / 2;
    setValue(v);
    addRating(burritoId, v);
  };

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="text-sm text-(--paper-ink)/70"
          style={{ fontFamily: "var(--font-bitcount)" }}
        >
          your rating
        </span>
        <motion.span
          key={value ?? "none"}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 14 }}
          className="inline-block font-hand text-2xl leading-none text-(--salsa)"
        >
          {value === null ? "?" : value}/10
        </motion.span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Your rating"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        tabIndex={0}
        className="relative h-4 cursor-pointer touch-none overflow-hidden rounded-full border-2 border-black bg-black/10"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromEvent(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && setFromEvent(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          e.stopPropagation();
          const next = Math.max(
            0,
            Math.min(10, (value ?? 5) + (e.key === "ArrowRight" ? 0.5 : -0.5))
          );
          setValue(next);
          addRating(burritoId, next);
        }}
      >
        <motion.div
          className="absolute inset-0 bg-(--salsa)"
          style={{ transformOrigin: "left" }}
          animate={{ transform: `scaleX(${(value ?? 0) / 10})` }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </div>
    </div>
  );
}

function Comments({ burritoId }: { burritoId: string }) {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setComments(getComments(burritoId));
  }, [burritoId]);

  const post = () => {
    if (!draft.trim()) return;
    const c = addComment(burritoId, draft);
    setComments((prev) => [...prev, c]);
    setDraft("");
  };

  return (
    <div className="min-w-0 flex-1">
      {comments.length > 0 && (
        <ul className="mb-2 max-h-20 space-y-1 overflow-y-auto pr-2">
          {comments
            .slice()
            .reverse()
            .map((c) => (
              <li key={c.id} className="flex items-baseline gap-2">
                <span className="min-w-0 truncate font-hand text-xl text-(--paper-ink)/80">
                  {c.text}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-(--paper-ink)/40">
                  {timeAgo(c.at)}
                </span>
              </li>
            ))}
        </ul>
      )}
      <div className="flex items-center gap-2 rounded-lg bg-black/5 px-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post()}
          placeholder="leave a note..."
          aria-label="Leave a comment"
          className="w-full bg-transparent py-1 font-hand text-xl text-(--paper-ink) placeholder:text-(--paper-ink)/35 focus:outline-none"
        />
        <button
          onClick={post}
          className="pressable pb-1 font-hand text-lg text-(--paper-ink)/60 transition-colors duration-150 hover:text-(--salsa)"
        >
          post
        </button>
      </div>
    </div>
  );
}
