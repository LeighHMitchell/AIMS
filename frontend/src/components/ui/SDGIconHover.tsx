import React from "react";
import { cn } from "@/lib/utils";

interface SDGIconHoverProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  selected?: boolean;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
  xl: "w-24 h-24",
} as const;

/**
 * SDG icon with a circular colour-reveal hover effect.
 *
 * Two identical images are stacked via CSS Grid in the same cell:
 *   - Bottom: greyscale (always visible)
 *   - Top: full colour, clipped to circle(0%) by default
 *
 * On hover / focus-visible the clip-path expands to circle(75%),
 * producing a smooth radial colour burst from the centre outward.
 *
 * When `selected` is true the colour image is fully revealed (no clip).
 */
export default function SDGIconHover({
  src,
  alt,
  size = "md",
  className,
  selected = false,
}: SDGIconHoverProps) {
  return (
    <div
      className={cn(
        "sdg-icon-hover group grid rounded-lg overflow-hidden",
        sizeClasses[size],
        className,
      )}
    >
      {/* Bottom layer — greyscale */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="col-start-1 row-start-1 w-full h-full object-cover grayscale"
      />

      {/* Top layer — full colour, clip-path animated */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          "sdg-icon-colour col-start-1 row-start-1 w-full h-full object-cover",
          selected && "sdg-icon-selected",
        )}
      />
    </div>
  );
}
