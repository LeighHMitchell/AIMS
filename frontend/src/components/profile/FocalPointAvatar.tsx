"use client"

import React from "react"
import { cn } from "@/lib/utils"

const HUE_PALETTE = [200, 220, 260, 290, 320, 0, 25, 45, 145, 175]

function hashToHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const idx = Math.abs(h) % HUE_PALETTE.length
  return HUE_PALETTE[idx]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
}

const SIZE_CLASSES = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-7 h-7 text-[10.5px]",
  lg: "w-9 h-9 text-[12px]",
}

interface FocalPointAvatarProps {
  name: string
  photoUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function FocalPointAvatar({ name, photoUrl, size = "md", className }: FocalPointAvatarProps) {
  const hue = hashToHue(name)
  const bg = `hsl(${hue}, 50%, 88%)`
  const fg = `hsl(${hue}, 60%, 28%)`
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden font-semibold",
        SIZE_CLASSES[size],
        className,
      )}
      style={photoUrl ? undefined : { backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name) || "?"}</span>
      )}
    </div>
  )
}
