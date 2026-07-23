"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { initAudio, play, playMunch } from "@/lib/audio";

// The six real eating stages (frame 6 = just foil). Displayed one after
// another; each tap advances a frame.
const STAGES = [
  "/images/loader/stage-1.png",
  "/images/loader/stage-2.png",
  "/images/loader/stage-3.png",
  "/images/loader/stage-4.png",
  "/images/loader/stage-5.png",
  "/images/loader/stage-6.png",
];
const LAST = STAGES.length - 1;
const PROMPTS = ["tap to eat", "mmm", "keep going", "almost", "last bite", "gone"];

/**
 * Munch intro that plays six real photo frames of a burrito being eaten,
 * one per tap. No shadow, no cropping tricks: just the frames. Skippable;
 * page.tsx gates re-mounts per session.
 */
export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const reduced = useReducedMotion();
  const done = stage >= LAST;

  const finish = () => {
    try {
      sessionStorage.setItem("bbc-fed", "1");
    } catch {}
    setTimeout(onDone, reduced ? 100 : 520);
  };

  const advance = () => {
    if (done) return;
    initAudio(); // first call unlocks + preloads audio
    playMunch();
    const next = stage + 1;
    setStage(next);
    if (next === LAST) finish();
  };

  const skip = () => {
    try {
      sessionStorage.setItem("bbc-fed", "1");
    } catch {}
    onDone();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-(--bg)"
      exit={{ opacity: 0, scale: reduced ? 1 : 1.06 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <button
        onClick={advance}
        aria-label={PROMPTS[Math.min(stage, PROMPTS.length - 1)]}
        className="pressable relative flex h-[min(60vh,540px)] w-[min(60vw,320px)] cursor-pointer select-none items-center justify-center focus-visible:outline-none"
      >
        <motion.div
          className="relative h-full w-full"
          animate={done ? { scale: 0.9, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={
            done ? { type: "spring", duration: 0.5, bounce: 0 } : { duration: 0 }
          }
        >
          {/* frames swap instantly (no float, no crossfade); bottom-anchored
              so the burrito just visibly shrinks as it's eaten */}
          <img
            src={STAGES[stage]}
            alt=""
            draggable={false}
            className="absolute bottom-0 left-1/2 max-h-full w-auto max-w-full -translate-x-1/2 object-contain"
          />
        </motion.div>
      </button>

      <div className="mt-6 h-8">
        <AnimatePresence initial={false}>
          <motion.p
            key={Math.min(stage, PROMPTS.length - 1)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: done ? 0 : 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute font-hand text-2xl text-(--ink-dim)"
          >
            {PROMPTS[Math.min(stage, PROMPTS.length - 1)]}
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        onClick={skip}
        className="pressable absolute bottom-8 right-8 text-xs uppercase tracking-[0.2em] text-(--ink-dim) transition-colors duration-150 hover:text-(--ink)"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        skip
      </button>
    </motion.div>
  );
}
