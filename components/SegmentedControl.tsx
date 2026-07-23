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
      className="flex rounded-full border border-(--ink)/15 bg-(--surface) p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={`pressable relative rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 md:px-4 ${
              active ? "text-(--bg)" : "text-(--ink-dim) hover:text-(--ink)"
            }`}
            style={{ fontFamily: "var(--font-mono)" }}
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
