"use client";

import { motion } from "motion/react";

export type ViewKey = "susan" | "tiers" | "map";

// "Bay Burrito" is the lazy-susan view. (Nobody here is named Susan.)
const OPTIONS: { key: ViewKey; label: string }[] = [
  { key: "susan", label: "Bay Burrito" },
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
      className="flex rounded-full bg-(--surface) p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            style={{ fontFamily: "var(--font-bitcount)" }}
            className={`pressable relative rounded-full px-4 py-1 text-sm leading-none transition-colors duration-200 md:px-5 ${
              active ? "text-(--bg)" : "text-(--ink-dim) hover:text-(--ink)"
            }`}
          >
            {active && (
              <motion.span
                layoutId="segment-pill"
                className="absolute inset-0 rounded-full bg-(--salsa)"
                transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
              />
            )}
            <span className="relative whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
