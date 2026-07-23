"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Burrito } from "@/data/burritos";
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
    <div className="paper relative h-full overflow-hidden shadow-[inset_0_-14px_24px_rgba(43,36,26,0.12)]">
      {/* red margin line */}
      <div className="absolute inset-y-0 left-10 w-px bg-(--paper-red)/50 md:left-16" />

      {/* concurrent crossfade (no mode="wait"): the wheel sweeps through
          several burritos per spin and interrupted waits never resolve */}
      <AnimatePresence initial={false}>
        <motion.div
          key={burrito.id}
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 flex flex-col gap-1 overflow-y-auto py-4 pl-14 pr-5 md:py-6 md:pl-24 md:pr-10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-hand text-3xl leading-tight text-(--paper-ink) md:text-5xl">
                {burrito.taqueria}
              </h2>
              <p className="font-hand text-xl text-(--paper-ink)/60 md:text-2xl">
                {burrito.neighborhood} &middot; {burrito.name}
              </p>
            </div>
            {burrito.beliRating !== undefined && (
              <BeliStamp score={burrito.beliRating} />
            )}
          </div>

          <p className="mt-2 max-w-xl font-hand text-2xl leading-8 text-(--paper-ink)/85 md:text-[1.7rem]">
            &ldquo;{burrito.fluffieNotes}&rdquo;
          </p>
          <p className="font-hand text-lg text-(--paper-ink)/45">
            @fluffie.donut
            {burrito.videoUrl && (
              <>
                {" "}&middot;{" "}
                <a
                  href={burrito.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-(--paper-ink)/30 underline-offset-2 transition-colors duration-150 hover:text-(--salsa)"
                >
                  watch the review
                </a>
              </>
            )}
          </p>

          <div className="mt-auto flex flex-col gap-3 pt-3 md:flex-row md:items-end md:gap-10">
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
    <div className="w-full md:max-w-60">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-(--paper-ink)/50">
          Your rating
        </span>
        <span className="font-hand text-2xl leading-none text-(--salsa)">
          {value === null ? "?" : value}/10
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Your rating"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        tabIndex={0}
        className="relative h-4 cursor-pointer touch-none overflow-hidden rounded-sm border border-(--paper-ink)/25 bg-(--paper-shade)"
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
        <div
          className="absolute inset-0 origin-left bg-(--salsa) transition-transform duration-150"
          style={{
            transform: `scaleX(${(value ?? 0) / 10})`,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
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
      <div className="flex items-center gap-2 border-b border-(--paper-ink)/30">
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
          className="pressable pb-1 text-[10px] font-medium uppercase tracking-[0.25em] text-(--paper-ink)/50 transition-colors duration-150 hover:text-(--salsa)"
        >
          Post
        </button>
      </div>
    </div>
  );
}
