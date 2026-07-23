"use client";

import { motion } from "motion/react";

export type ViewKey = "susan" | "tiers" | "map";

const OPTIONS: { key: ViewKey; label: string }[] = [
  { key: "susan", label: "Susan" },
  { key: "tiers", label: "Tiers" },
  { key: "map", label: "Map" },
];

export default function SegmentedControl({
  value,
  onChange,
}: {
  value: ViewKey;
  onChange: (v: ViewKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="flex rounded-full border border-(--line) bg-(--bg-raised) p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={`pressable relative rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-200 md:px-5 ${
              active ? "text-(--bg)" : "text-(--ink-dim) hover:text-(--ink)"
            }`}
          >
            {active && (
              <motion.span
                layoutId="segment-pill"
                className="absolute inset-0 rounded-full bg-(--ink)"
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
