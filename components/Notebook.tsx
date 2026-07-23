"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { TIER_COLORS, type Burrito } from "@/data/burritos";
import {
  addComment,
  clearMyRating,
  getComments,
  getCommunityRating,
  setMyRating,
  type CommunityRating,
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
      {/* no transition: content swaps instantly as the wheel changes */}
      <div className="absolute inset-0 flex gap-6 overflow-hidden px-6 py-3 md:gap-10 md:px-12 md:py-4">
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
      </div>
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

/** Salsa-red fill bar for the user's own rating; shows community average. */
function RatingBar({ burritoId }: { burritoId: string }) {
  const [c, setC] = useState<CommunityRating>({
    avg: null,
    count: 0,
    mine: null,
  });
  const value = c.mine;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let ok = true;
    getCommunityRating(burritoId).then((r) => ok && setC(r));
    return () => {
      ok = false;
    };
  }, [burritoId]);

  const commit = async (v: number) => {
    setC((prev) => ({ ...prev, mine: v })); // optimistic
    await setMyRating(burritoId, v);
    const fresh = await getCommunityRating(burritoId);
    setC(fresh);
  };

  const clear = async () => {
    setC((prev) => ({ ...prev, mine: null })); // optimistic
    await clearMyRating(burritoId);
    const fresh = await getCommunityRating(burritoId);
    setC(fresh);
  };

  const setFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 10;
    const v = Math.round(Math.max(0, Math.min(10, raw)) * 2) / 2;
    setC((prev) => ({ ...prev, mine: v }));
    void commit(v);
  };

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="text-lg text-(--paper-ink)/75"
          style={{ fontFamily: "var(--font-bitcount)" }}
        >
          your rating
        </span>
        <span className="flex items-baseline gap-2">
          {value !== null && (
            <button
              onClick={clear}
              className="pressable font-hand text-base leading-none text-(--paper-ink)/45 transition-colors duration-150 hover:text-(--salsa)"
            >
              clear
            </button>
          )}
          <motion.span
            key={value ?? "none"}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
            className="inline-block font-hand text-2xl leading-none text-(--salsa)"
          >
            {value === null ? "?" : value}/10
          </motion.span>
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
          void commit(next);
        }}
      >
        <motion.div
          className="absolute inset-0 bg-(--salsa)"
          style={{ transformOrigin: "left" }}
          animate={{ transform: `scaleX(${(value ?? 0) / 10})` }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </div>
      <p className="mt-1 font-hand text-base leading-none text-(--paper-ink)/55">
        {c.avg == null
          ? "no ratings yet, be the first"
          : `community ${c.avg.toFixed(1)}/10 · ${c.count} rating${
              c.count === 1 ? "" : "s"
            }`}
      </p>
    </div>
  );
}

function Comments({ burritoId }: { burritoId: string }) {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let ok = true;
    getComments(burritoId).then((cs) => ok && setComments(cs));
    return () => {
      ok = false;
    };
  }, [burritoId]);

  const post = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    const c = await addComment(burritoId, text);
    if (c) setComments((prev) => [...prev, c]);
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
                <span className="shrink-0 font-hand text-base text-(--paper-ink)/45">
                  {timeAgo(c.at)}
                </span>
              </li>
            ))}
        </ul>
      )}
      <div
        className="flex items-center gap-2 rounded-full px-4 py-1"
        style={{
          background: "#6e8c3e",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.22)",
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post()}
          placeholder="leave a note..."
          aria-label="Leave a comment"
          className="paper-input w-full bg-transparent py-1 font-hand text-lg text-white placeholder:text-white/60 focus:outline-none"
        />
        <button
          onClick={post}
          className="pressable font-hand text-lg text-white/90 transition-colors duration-150 hover:text-white"
        >
          post
        </button>
      </div>
    </div>
  );
}
