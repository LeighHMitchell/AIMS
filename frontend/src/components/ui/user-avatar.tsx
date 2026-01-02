"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserOrbAvatar } from "@/components/ui/user-orb-avatar";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  /** User's profile picture URL */
  src?: string | null;
  /** User identifier for generating orb colors (email, id, or name) */
  seed: string;
  /** Display name for alt text */
  name?: string;
  /** Size class or pixel size */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  /** Optional initials to show on orb (if not provided, derived from name) */
  initials?: string;
  /** Additional class names */
  className?: string;
  /** Animation duration in seconds (default: 20) */
  animationDuration?: number;
}

const sizeMap: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 96,
  "2xl": 128,
};

const sizeClasses: Record<string, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-24 w-24",
  "2xl": "h-32 w-32",
};

/**
 * Get initials from person name
 */
function getInitials(name?: string): string {
  if (!name) return "";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Smart avatar component that displays a user's profile picture
 * or a beautiful animated orb with their initials as fallback.
 */
export function UserAvatar({
  src,
  seed,
  name,
  size = "md",
  initials,
  className,
  animationDuration = 20,
}: UserAvatarProps) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size];
  const sizeClass = typeof size === "number" ? undefined : sizeClasses[size];
  const displayInitials = initials || getInitials(name);

  // If there's a valid image source, use the standard Avatar with orb fallback
  if (src) {
    return (
      <Avatar 
        className={cn(sizeClass, className)} 
        style={typeof size === "number" ? { width: pixelSize, height: pixelSize } : undefined}
      >
        <AvatarImage src={src} alt={name || "User avatar"} />
        <AvatarFallback className="p-0 bg-transparent">
          <UserOrbAvatar
            seed={seed}
            size={pixelSize}
            initials={displayInitials}
            animationDuration={animationDuration}
          />
        </AvatarFallback>
      </Avatar>
    );
  }

  // No image - show the orb directly
  return (
    <UserOrbAvatar
      seed={seed}
      size={pixelSize}
      initials={displayInitials}
      animationDuration={animationDuration}
      className={className}
    />
  );
}

export { getInitials };
