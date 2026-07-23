"use client";

import BurritoSprite from "./BurritoSprite";

/**
 * Real burrito photo cropped to a circular plate, with the illustrated
 * sprite as fallback until a place has a picked frame.
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
    <div className={`relative aspect-square ${className ?? ""}`}>
      <div className="absolute inset-0 overflow-hidden rounded-full">
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
