"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Size thresholds and multipliers for responsive calculations
const SIZE_THRESHOLD_SMALL = 50;
const SIZE_THRESHOLD_TINY = 30;
const SIZE_THRESHOLD_MEDIUM = 100;

export interface UserOrbAvatarProps {
  /** User identifier (ID, email, or name) - used to generate consistent colors */
  seed: string;
  /** Size in pixels or CSS value */
  size?: number | string;
  /** Optional additional class names */
  className?: string;
  /** Animation duration in seconds (set to 0 to disable) */
  animationDuration?: number;
  /** Optional initials to overlay on the orb */
  initials?: string;
}

/**
 * Generate a seeded random number between 0 and 1
 */
function seededRandom(seed: string, index: number = 0): number {
  let hash = 0;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

/**
 * Generate colors from the custom palette based on a seed string
 * Returns consistent colors for the same seed
 */
function generateOrbColors(seed: string): {
  bg: string;
  c1: string;
  c2: string;
  c3: string;
} {
  // Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
  const palette = [
    "#dc2625", // Primary Scarlet (always included)
    "#cfd0d5", // Pale Slate
    "#4c5568", // Blue Slate
    "#7b95a7", // Cool Steel
    "#f1f4f8", // Platinum
  ];
  
  // Use Platinum as the background color
  const bg = palette[4]; // Platinum
  
  // Always include Primary Scarlet (red), then select 2 more colors from the remaining palette
  // Use seeded random to ensure consistency for the same seed
  const gradientColors = palette.slice(1, 4); // Exclude Platinum and Primary Scarlet
  const indices = [
    Math.floor(seededRandom(seed, 0) * gradientColors.length),
    Math.floor(seededRandom(seed, 1) * gradientColors.length),
  ];

  return {
    bg,
    c1: palette[0], // Always Primary Scarlet (red)
    c2: gradientColors[indices[0]],
    c3: gradientColors[indices[1]],
  };
}

const UserOrbAvatar: React.FC<UserOrbAvatarProps> = ({
  seed,
  size = 40,
  className,
  animationDuration = 20,
  initials,
}) => {
  const colors = React.useMemo(() => generateOrbColors(seed), [seed]);
  
  // Handle both number and string sizes
  const sizeStr = typeof size === "number" ? `${size}px` : size;
  const sizeValue = typeof size === "number" ? size : parseInt(size.replace("px", ""), 10) || 40;

  // Responsive calculations based on size
  const blurAmount = sizeValue < SIZE_THRESHOLD_SMALL
    ? Math.max(sizeValue * 0.008, 1)
    : Math.max(sizeValue * 0.015, 4);

  const contrastAmount = sizeValue < SIZE_THRESHOLD_SMALL
    ? Math.max(sizeValue * 0.004, 1.2)
    : Math.max(sizeValue * 0.008, 1.5);

  const dotSize = sizeValue < SIZE_THRESHOLD_SMALL
    ? Math.max(sizeValue * 0.004, 0.05)
    : Math.max(sizeValue * 0.008, 0.1);

  const shadowSpread = sizeValue < SIZE_THRESHOLD_SMALL
    ? Math.max(sizeValue * 0.004, 0.5)
    : Math.max(sizeValue * 0.008, 2);

  const getMaskRadius = (value: number) => {
    if (value < SIZE_THRESHOLD_TINY) return "0%";
    if (value < SIZE_THRESHOLD_SMALL) return "5%";
    if (value < SIZE_THRESHOLD_MEDIUM) return "15%";
    return "25%";
  };

  const getFinalContrast = (value: number) => {
    if (value < SIZE_THRESHOLD_TINY) return 1.1;
    if (value < SIZE_THRESHOLD_SMALL) return Math.max(contrastAmount * 1.2, 1.3);
    return contrastAmount;
  };

  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <div
      className={cn("user-orb-avatar relative", className)}
      style={{
        width: sizeStr,
        height: sizeStr,
        ["--orb-bg" as string]: colors.bg,
        ["--orb-c1" as string]: colors.c1,
        ["--orb-c2" as string]: colors.c2,
        ["--orb-c3" as string]: colors.c3,
        ["--orb-animation-duration" as string]: `${animationDuration}s`,
        ["--orb-blur-amount" as string]: `${blurAmount}px`,
        ["--orb-contrast-amount" as string]: getFinalContrast(sizeValue),
        ["--orb-dot-size" as string]: `${dotSize}px`,
        ["--orb-shadow-spread" as string]: `${shadowSpread}px`,
        ["--orb-mask-radius" as string]: getMaskRadius(sizeValue),
      } as React.CSSProperties}
    >
      <style>{`
        @property --orb-angle-${uniqueId} {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .user-orb-avatar {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
        }

        .user-orb-avatar > * {
          grid-area: stack;
        }

        .orb-gradient-${uniqueId} {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * 2) at 25% 70%,
              var(--orb-c3),
              transparent 20% 80%,
              var(--orb-c3)
            ),
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * 2) at 45% 75%,
              var(--orb-c2),
              transparent 30% 60%,
              var(--orb-c2)
            ),
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * -3) at 80% 20%,
              var(--orb-c1),
              transparent 40% 60%,
              var(--orb-c1)
            ),
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * 2) at 15% 5%,
              var(--orb-c2),
              transparent 10% 90%,
              var(--orb-c2)
            ),
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * 1) at 20% 80%,
              var(--orb-c1),
              transparent 10% 90%,
              var(--orb-c1)
            ),
            conic-gradient(
              from calc(var(--orb-angle-${uniqueId}) * -2) at 85% 10%,
              var(--orb-c3),
              transparent 20% 80%,
              var(--orb-c3)
            );
          box-shadow: inset var(--orb-bg) 0 0 var(--orb-shadow-spread)
            calc(var(--orb-shadow-spread) * 0.2);
          filter: blur(var(--orb-blur-amount)) contrast(var(--orb-contrast-amount));
          animation: orb-rotate-${uniqueId} var(--orb-animation-duration) linear infinite;
          animation-play-state: paused;
        }

        .user-orb-avatar:hover .orb-gradient-${uniqueId} {
          animation-play-state: running;
        }

        .orb-overlay-${uniqueId} {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-image: radial-gradient(
            circle at center,
            var(--orb-bg) var(--orb-dot-size),
            transparent var(--orb-dot-size)
          );
          background-size: calc(var(--orb-dot-size) * 2) calc(var(--orb-dot-size) * 2);
          backdrop-filter: blur(calc(var(--orb-blur-amount) * 2))
            contrast(calc(var(--orb-contrast-amount) * 2));
          mix-blend-mode: overlay;
          mask-image: radial-gradient(
            black var(--orb-mask-radius),
            transparent 75%
          );
        }

        @keyframes orb-rotate-${uniqueId} {
          to {
            --orb-angle-${uniqueId}: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-gradient-${uniqueId} {
            animation: none;
          }
        }
      `}</style>
      
      <div className={`orb-gradient-${uniqueId}`} />
      <div className={`orb-overlay-${uniqueId}`} />
      
      {/* Optional initials overlay */}
      {initials && (
        <div 
          className="flex items-center justify-center text-white font-semibold"
          style={{ 
            fontSize: `${Math.max(sizeValue * 0.35, 10)}px`
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
};

export { UserOrbAvatar, generateOrbColors };
