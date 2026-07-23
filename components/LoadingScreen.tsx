"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { initAudio, play, playMunch } from "@/lib/audio";

// Bite line as a fraction eaten from the top. Stage 0 = whole burrito;
// each tap eats further down. The photo is tortilla on top, foil at the
// bottom, so biting from the top keeps the foil until the very end.
const BITES = [0, 0.16, 0.32, 0.46];
const LAST = BITES.length; // the tap that finishes the burrito
const PROMPTS = ["tap to take a bite", "mmm", "keep going", "last bite"];

const clipFor = (stage: number) => {
  const eaten = BITES[Math.min(stage, BITES.length - 1)] ?? 0;
  // round the top corners so the eaten edge reads as a bite, not a cut
  return `inset(${(eaten * 100).toFixed(1)}% 0% 0% 0% round 46% 46% 8% 8%)`;
};

/**
 * Munch intro on a real burrito photo. stage 0 = whole, each tap takes a
 * bite (clip-path eats down from the top), final tap finishes it and the
 * main UI slides up. Skippable; page.tsx gates re-mounts per session.
 */
export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const reduced = useReducedMotion();
  const done = stage >= LAST;

  const advance = () => {
    if (done) return;
    initAudio(); // first call unlocks + preloads audio
    if (stage === 0) play("foil-peel");
    else playMunch();
    const next = stage + 1;
    setStage(next);
    if (next === LAST) {
      playMunch();
      try {
        sessionStorage.setItem("bbc-fed", "1");
      } catch {}
      setTimeout(onDone, reduced ? 100 : 480);
    }
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
        className="pressable relative w-[min(56vw,300px)] cursor-pointer select-none focus-visible:outline-none"
      >
        <motion.div
          animate={
            done
              ? { scale: 0.85, opacity: 0, y: 10 }
              : { scale: 1, opacity: 1, y: reduced ? 0 : [0, -8, 0] }
          }
          transition={
            done
              ? { type: "spring", duration: 0.5, bounce: 0 }
              : { y: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } }
          }
        >
          {/* the burrito being eaten: clip-path bites down from the top */}
          <motion.img
            src="/images/loader/burrito-full.png"
            alt="a foil-wrapped burrito"
            draggable={false}
            className="w-full drop-shadow-[0_22px_30px_rgba(0,0,0,0.5)]"
            initial={false}
            animate={{ clipPath: clipFor(stage), scale: stage > 0 ? [1.04, 1] : 1 }}
            transition={{
              clipPath: { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
              scale: { type: "spring", duration: 0.35, bounce: 0.4 },
            }}
          />
        </motion.div>
      </button>

      <div className="mt-8 h-8">
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
      >
        skip
      </button>
    </motion.div>
  );
}
