"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import BurritoSprite, { FoilWrap } from "./BurritoSprite";
import { initAudio, play, playMunch } from "@/lib/audio";

const PROMPTS = [
  "tap to unwrap",
  "tap to take a bite",
  "keep going",
  "one more",
];

/**
 * Foil peel & munch intro. stage 0 = wrapped, 1-3 = bites taken,
 * 4 = eaten (exit). Skippable, and page.tsx never mounts this again
 * within a session (sessionStorage flag).
 */
export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const reduced = useReducedMotion();

  const advance = () => {
    if (stage >= 4) return;
    initAudio(); // no-op after first call; first call unlocks + preloads
    if (stage === 0) play("foil-peel");
    else playMunch();
    const next = stage + 1;
    setStage(next);
    if (next === 4) {
      try {
        sessionStorage.setItem("bbc-fed", "1");
      } catch {}
      // let the last munch land before the scale-out
      setTimeout(onDone, reduced ? 100 : 420);
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
        aria-label={PROMPTS[Math.min(stage, 3)]}
        className="pressable relative w-[min(72vw,380px)] cursor-pointer select-none focus-visible:outline-none"
      >
        <motion.div
          animate={
            stage === 4
              ? { scale: 0.9, opacity: 0 }
              : { scale: 1, opacity: 1, y: reduced ? 0 : [0, -6, 0] }
          }
          transition={
            stage === 4
              ? { type: "spring", duration: 0.5, bounce: 0 }
              : { y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }
          }
        >
          {/* per-bite squish: keyed remount is fine, it's a rare animation */}
          <motion.div
            key={stage}
            initial={stage > 0 && stage < 4 ? { scale: 0.96 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.35 }}
          >
            <BurritoSprite
              bites={Math.min(Math.max(stage - 1, 0), 3) as 0 | 1 | 2 | 3}
              className="w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]"
            />
          </motion.div>

          {/* foil peels up and away on first tap */}
          <AnimatePresence>
            {stage === 0 && (
              <motion.div
                className="absolute inset-0"
                exit={{
                  clipPath: "inset(0 0 100% 0)",
                  y: -34,
                  rotate: -5,
                  opacity: 0.4,
                }}
                initial={{ clipPath: "inset(0 0 0% 0)" }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
              >
                <FoilWrap className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>

      <div className="mt-10 h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={Math.min(stage, 3)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: stage >= 4 ? 0 : 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="font-hand text-2xl text-(--ink-dim)"
          >
            {PROMPTS[Math.min(stage, 3)]}
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
