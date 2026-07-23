"use client";

import BurritoSprite from "./BurritoSprite";

/**
 * Real burrito photo shown as a rounded portrait card (the frames are 9:16,
 * so a rectangle shows far more than a circular crop). Falls back to the
 * illustrated sprite until a place has a picked frame.
 */
export default function BurritoImage({
  src,
  alt,
  variant = 0,
  className,
}: {
  src?: string;
  alt: string;
  variant?: number;
  className?: string;
}) {
  if (!src) {
    return <BurritoSprite variant={variant} className={className} />;
  }
  return (
    <div className={`relative aspect-[4/5] ${className ?? ""}`}>
      <div className="absolute inset-0 overflow-hidden rounded-2xl ring-1 ring-black/10">
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
