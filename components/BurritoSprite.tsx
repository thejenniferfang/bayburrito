"use client";

import { useId } from "react";

/**
 * Stylized burrito cutout. Used at large size on the loading screen and
 * small on the lazy Susan. `bites` (0-3) carves scalloped chunks off the
 * right end. `variant` nudges the tortilla toward different toast levels
 * so the wheel doesn't look like clones.
 */
export default function BurritoSprite({
  bites = 0,
  variant = 0,
  className,
}: {
  bites?: 0 | 1 | 2 | 3;
  variant?: number;
  className?: string;
}) {
  const uid = useId();
  const maskId = `bite-${uid}`;
  // each bite moves the scalloped edge further left
  const edgeX = bites === 0 ? 230 : 214 - bites * 46;
  const tortillas = ["#e3c48c", "#dfbd82", "#e7cb96", "#dbb878"];
  const tortilla = tortillas[Math.abs(variant) % tortillas.length];

  return (
    <svg
      viewBox="0 0 220 120"
      className={className}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <mask id={maskId}>
          <rect x="-10" y="-10" width="240" height="140" fill="white" />
          {bites > 0 && (
            <>
              <rect x={edgeX} y="-10" width="120" height="140" fill="black" />
              <circle cx={edgeX} cy="18" r="15" fill="black" />
              <circle cx={edgeX + 4} cy="52" r="18" fill="black" />
              <circle cx={edgeX} cy="88" r="16" fill="black" />
            </>
          )}
        </mask>
      </defs>

      <g mask={maskId}>
        {/* body */}
        <rect x="16" y="18" width="196" height="86" rx="43" fill={tortilla} />
        {/* toast blotches */}
        <ellipse cx="80" cy="46" rx="16" ry="9" fill="#c49b58" opacity="0.55" />
        <ellipse cx="140" cy="72" rx="20" ry="10" fill="#c49b58" opacity="0.4" />
        <ellipse cx="180" cy="44" rx="12" ry="7" fill="#bd9250" opacity="0.5" />
        <ellipse cx="108" cy="90" rx="13" ry="6" fill="#c49b58" opacity="0.35" />
        {/* wrap fold seams */}
        <path
          d="M60 20 Q66 60 58 102"
          stroke="#b89052"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M96 19 Q104 62 94 103"
          stroke="#b89052"
          strokeWidth="2"
          fill="none"
          opacity="0.45"
        />
        {/* open end: fillings */}
        <ellipse cx="26" cy="61" rx="15" ry="40" fill="#d9b273" />
        <ellipse cx="24" cy="61" rx="12" ry="36" fill="#efe3c4" />
        <circle cx="21" cy="42" r="7" fill="#7d9052" />
        <circle cx="28" cy="56" r="8" fill="#5f4331" />
        <circle cx="19" cy="72" r="7" fill="#b54a32" />
        <circle cx="27" cy="86" r="6" fill="#7d9052" />
        <circle cx="21" cy="58" r="4" fill="#efe3c4" />
      </g>
      {/* bite crumbs */}
      {bites > 0 && bites < 3 && (
        <>
          <circle cx={edgeX + 8} cy="108" r="2.5" fill={tortilla} />
          <circle cx={edgeX + 18} cy="112" r="1.8" fill="#b89052" />
        </>
      )}
    </svg>
  );
}

/** Foil wrap layer, same footprint as the burrito body. */
export function FoilWrap({ className }: { className?: string }) {
  const uid = useId();
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden>
      <defs>
        <linearGradient id={`foil-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9d9de" />
          <stop offset="0.35" stopColor="#9fa1a8" />
          <stop offset="0.55" stopColor="#e8e8ec" />
          <stop offset="0.8" stopColor="#8e9097" />
          <stop offset="1" stopColor="#c6c7cc" />
        </linearGradient>
      </defs>
      <rect
        x="10"
        y="14"
        width="204"
        height="94"
        rx="47"
        fill={`url(#foil-${uid})`}
      />
      {/* crinkles */}
      <path
        d="M40 26 L56 44 L38 62 L58 84 L44 100"
        stroke="#f4f4f7"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M92 20 L108 42 L88 66 L110 90"
        stroke="#77797f"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M150 24 L138 48 L160 70 L142 96"
        stroke="#f4f4f7"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M186 32 L172 52 L190 78"
        stroke="#77797f"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* twisted end */}
      <path
        d="M208 46 L219 38 L215 61 L221 82 L206 76"
        fill="#b3b5bb"
        stroke="#8e9097"
        strokeWidth="1"
      />
    </svg>
  );
}
