"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BURRITOS } from "@/data/burritos";
import LoadingScreen from "@/components/LoadingScreen";
import LazySusan from "@/components/LazySusan";
import Notebook from "@/components/Notebook";
import TierList from "@/components/TierList";
import BayMap from "@/components/BayMap";
import SegmentedControl, { type ViewKey } from "@/components/SegmentedControl";
import { initAudio } from "@/lib/audio";

export default function Home() {
  // null = not yet known (avoids a hydration flash), then true/false
  const [fed, setFed] = useState<boolean | null>(null);
  const [view, setView] = useState<ViewKey>("susan");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let already = false;
    try {
      already = sessionStorage.getItem("bbc-fed") === "1";
    } catch {}
    setFed(already);
    // any first gesture anywhere unlocks + preloads audio
    window.addEventListener("pointerdown", initAudio, { once: true });
    return () => window.removeEventListener("pointerdown", initAudio);
  }, []);

  const active = BURRITOS[activeIndex] ?? BURRITOS[0];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AnimatePresence>
        {fed === false && <LoadingScreen onDone={() => setFed(true)} />}
      </AnimatePresence>

      <motion.main
        className="flex min-h-0 flex-1 flex-col"
        initial={false}
        animate={{
          y: fed ? 0 : 24,
          opacity: fed ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-(--line) px-5 py-3 md:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate font-serif text-lg tracking-wide text-(--ink) md:text-2xl">
              The Bay Area Burrito Challenge
            </h1>
            <span className="hidden shrink-0 font-hand text-lg text-(--accent) sm:block">
              eaten by hand, est. 2026
            </span>
          </div>
          <SegmentedControl value={view} onChange={setView} />
        </header>

        {/* all three views stay mounted in absolute layers: zero layout shift */}
        <div className="relative min-h-0 flex-1">
          <ViewLayer active={view === "susan"}>
            <div className="flex h-full flex-col">
              <div className="h-[42%] min-h-0 md:h-1/2">
                <Notebook burrito={active} />
              </div>
              <div className="min-h-0 flex-1">
                <LazySusan
                  burritos={BURRITOS}
                  activeIndex={activeIndex}
                  onActiveChange={setActiveIndex}
                  interactive={view === "susan" && fed === true}
                />
              </div>
            </div>
          </ViewLayer>

          <ViewLayer active={view === "tiers"}>
            <TierList />
          </ViewLayer>

          <ViewLayer active={view === "map"}>
            <BayMap />
          </ViewLayer>
        </div>
      </motion.main>
    </div>
  );
}

function ViewLayer({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "scale(1)" : "scale(0.985)",
        transition:
          "opacity 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1)",
        pointerEvents: active ? "auto" : "none",
      }}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
