"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { Burrito } from "@/data/burritos";
import BurritoImage from "./BurritoImage";

const SPRING = { type: "spring" as const, stiffness: 150, damping: 20 };
const DEG_PER_PX = 0.35;
const TAP_SLOP_PX = 6;

/** Wrap an index into [0, n) */
const mod = (v: number, n: number) => ((v % n) + n) % n;

/**
 * The lazy Susan. One motion value (degrees) drives everything; each
 * burrito derives its position on a flattened ellipse from it. Front of
 * the wheel (theta = 0) is the bottom of the container.
 *
 * All pointer handling lives on the container: it takes pointer capture,
 * so per-item handlers would never see move/up events anyway. A release
 * with < TAP_SLOP_PX of travel counts as a tap on the item under the
 * initial press.
 */
export default function LazySusan({
  burritos,
  activeIndex,
  onActiveChange,
  interactive,
}: {
  burritos: Burrito[];
  activeIndex: number;
  onActiveChange: (i: number) => void;
  interactive: boolean;
}) {
  const n = burritos.length;
  const step = 360 / n;
  const rotation = useMotionValue(0);
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  // null until measured: items don't render on the server, which avoids
  // hydration mismatches from SSR-computed transforms
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // wheel geometry follows the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // big round table, center below the viewport: only the top arc shows.
  // burritos orbit OUTSIDE the table edge (itemR > tableR) so they sit on
  // the rim and spill toward the viewer, larger than the table surface.
  const baseR = dims ? Math.min(dims.w * 0.52, dims.h * 0.72) : 0;
  const tableR = baseR * 1.05;
  const R = baseR * 1.32; // item orbit radius (beyond the table edge)
  const cy = dims ? dims.h * 1.16 : 0;
  const itemW = dims
    ? Math.max(120, Math.min(260, ((2 * Math.PI * R) / n) * 0.9))
    : 0;

  // report the burrito nearest the front as rotation changes
  const activeIndexRef = useRef(activeIndex);
  useMotionValueEvent(rotation, "change", (r) => {
    const idx = mod(Math.round(-r / step), n);
    if (idx !== activeIndexRef.current) {
      activeIndexRef.current = idx;
      onActiveChange(idx);
    }
  });

  const snapTo = (targetRotation: number, velocity = 0) => {
    if (reduced) {
      rotation.set(targetRotation);
      return;
    }
    animate(rotation, targetRotation, { ...SPRING, velocity });
  };

  /** Rotate so burrito i sits at the front, via the shortest path. */
  const goTo = (i: number) => {
    const current = rotation.get();
    let target = -i * step;
    target += Math.round((current - target) / 360) * 360;
    snapTo(target);
  };

  // drag physics: track pointer, then release into an inertial snap
  const drag = useRef({
    dragging: false,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    travel: 0,
    tapIndex: null as number | null,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    rotation.stop();
    const hit = (e.target as HTMLElement).closest("[data-susan-index]");
    drag.current = {
      dragging: true,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      travel: 0,
      tapIndex: hit ? Number(hit.getAttribute("data-susan-index")) : null,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.lastX;
    const dt = Math.max(e.timeStamp - d.lastT, 1);
    d.travel += Math.abs(dx);
    rotation.set(rotation.get() + dx * DEG_PER_PX);
    // smoothed angular velocity in deg/s
    d.velocity = d.velocity * 0.6 + ((dx * DEG_PER_PX) / dt) * 1000 * 0.4;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.dragging) return;
    d.dragging = false;
    if (d.travel < TAP_SLOP_PX) {
      if (d.tapIndex !== null) goTo(d.tapIndex);
      return;
    }
    // project momentum forward, then settle on the nearest burrito
    const projected = rotation.get() + d.velocity * 0.18;
    snapTo(Math.round(projected / step) * step, d.velocity);
  };

  // arrow keys step the wheel
  useEffect(() => {
    if (!interactive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const dir = e.key === "ArrowLeft" ? 1 : -1;
      snapTo((Math.round(rotation.get() / step) + dir) * step);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, step, reduced]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      style={{ background: "#9BB7D4" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="listbox"
      aria-label="Burrito wheel. Use left and right arrow keys to spin."
      aria-activedescendant={`susan-${burritos[activeIndex]?.id}`}
    >
      {/* the table: a full disc whose top arc pokes into view */}
      {dims && (
        <TableDisc rotation={rotation} R={tableR} cy={cy} />
      )}

      {dims && burritos.map((b, i) => (
        <SusanItem
          key={b.id}
          burrito={b}
          index={i}
          isActive={i === activeIndex}
          step={step}
          rotation={rotation}
          R={R}
          cy={cy}
          itemW={itemW}
        />
      ))}
    </div>
  );
}

function TableDisc({
  rotation,
  R,
  cy,
}: {
  rotation: MotionValue<number>;
  R: number;
  cy: number;
}) {
  const Rt = R;
  // the real wood top spins with the burritos, like a true lazy Susan
  const transform = useTransform(
    rotation,
    (r) => `translate(-50%, -50%) rotate(${r}deg)`
  );
  return (
    <motion.img
      src="/images/table.png"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute left-1/2 rounded-full"
      style={{
        top: cy,
        width: Rt * 2,
        height: Rt * 2,
        transform,
      }}
    />
  );
}

function SusanItem({
  burrito,
  index,
  isActive,
  step,
  rotation,
  R,
  cy,
  itemW,
}: {
  burrito: Burrito;
  index: number;
  isActive: boolean;
  step: number;
  rotation: MotionValue<number>;
  R: number;
  cy: number;
  itemW: number;
}) {
  // t = 0 puts this burrito at the table's apex (12 o'clock, front-center)
  const theta = (r: number) => ((r + index * step) * Math.PI) / 180;
  const transform = useTransform(rotation, (r) => {
    const t = theta(r);
    // sharp gaussian bump so the apex plate clearly leads even with
    // 30+ items packed 11 degrees apart
    const bump = Math.exp(-((t / 0.35) ** 2));
    const lift = R + 30 * bump; // apex eases outward off the rim
    const x = Math.sin(t) * lift;
    const y = -Math.cos(t) * lift;
    const scale = 0.64 + 0.58 * bump;
    // plates rotate WITH the table, like objects on a real lazy Susan,
    // except near the apex where the hero straightens up to face you.
    // normalize to [-180, 180) so damping doesn't jump after full spins
    // (the seam at 180 sits at the table's hidden back edge)
    const raw = r + index * step;
    const spin = ((((raw + 180) % 360) + 360) % 360) - 180;
    return `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${spin * (1 - bump)}deg) scale(${scale})`;
    return `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${spin}deg) scale(${scale})`;
  });
  const filter = useTransform(rotation, (r) => {
    const c = Math.cos(theta(r));
    const dim = 0.66 + Math.max(c, 0) * 0.34;
    return `brightness(${dim.toFixed(2)})`;
  });
  const opacity = useTransform(rotation, (r) =>
    Math.min(Math.max(Math.cos(theta(r)) * 2.2 + 0.9, 0), 1)
  );
  const zIndex = useTransform(rotation, (r) =>
    Math.round(Math.cos(theta(r)) * 50 + 50)
  );

  return (
    <motion.div
      id={`susan-${burrito.id}`}
      data-susan-index={index}
      role="option"
      aria-selected={isActive}
      aria-label={`${burrito.name}, ${burrito.taqueria}`}
      className="absolute left-1/2"
      style={{ top: cy, width: itemW, transform, filter, opacity, zIndex }}
    >
      {/* one-time entrance: each burrito pops onto the table, staggered
          around the wheel so they cascade in */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 18,
          delay: Math.min(index * 0.05, 1.3),
        }}
      >
        <BurritoImage
          src={burrito.imgUrl}
          alt={burrito.taqueria}
          variant={index}
          className="relative w-full"
        />
      </motion.div>
    </motion.div>
  );
}
