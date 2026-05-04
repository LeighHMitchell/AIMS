"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export type HeroAccent =
  | "teal"
  | "blue"
  | "coral"
  | "amber"
  | "grey"
  | "purple"
  | "rose"
  | "sky"

const ACCENT_BG: Record<HeroAccent, string> = {
  teal: "bg-gradient-to-br from-teal-700 to-teal-900",
  blue: "bg-gradient-to-br from-blue-700 to-blue-900",
  coral: "bg-gradient-to-br from-rose-600 to-rose-900",
  amber: "bg-gradient-to-br from-amber-600 to-amber-800",
  grey: "bg-gradient-to-br from-slate-600 to-slate-800",
  purple: "bg-gradient-to-br from-purple-700 to-purple-900",
  rose: "bg-gradient-to-br from-rose-700 to-rose-900",
  sky: "bg-gradient-to-br from-sky-700 to-sky-900",
}

interface HeroBadge {
  label: string
  tone?: "default" | "humanitarian" | "muted"
}

interface ProfileHeroProps {
  prefix?: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  badges?: HeroBadge[]
  accent?: HeroAccent
  imageUrl?: string | null
  imagePosition?: number
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

export function ProfileHero({
  prefix,
  title,
  subtitle,
  badges = [],
  accent = "teal",
  imageUrl,
  imagePosition = 50,
  actions,
  breadcrumb,
  className,
}: ProfileHeroProps) {
  const hasImage = !!imageUrl
  const heightClass = hasImage ? "h-[360px]" : "h-[260px]"

  return (
    <section
      className={cn("relative w-full overflow-hidden", heightClass, ACCENT_BG[accent], className)}
    >
      {hasImage && (
        <>
          <img
            src={imageUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${imagePosition}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/30 to-transparent pointer-events-none" />
        </>
      )}

      {/* Top bar — breadcrumb left, actions right */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4">
        <div className="text-white/90 text-[13px]">{breadcrumb}</div>
        <div className="flex items-center gap-1 text-white">{actions}</div>
      </div>

      {/* Bottom-left — prefix + title + subtitle */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {badges.map((b, i) => (
                  <Badge
                    key={i}
                    className={cn(
                      "inline-flex items-center h-7 px-2.5 text-[11px] tracking-wide rounded font-medium",
                      b.tone === "humanitarian" && "bg-rose-500 text-white hover:bg-rose-500",
                      b.tone === "muted" && "bg-white/20 text-white hover:bg-white/20",
                      (!b.tone || b.tone === "default") && "bg-white/95 text-foreground hover:bg-white",
                    )}
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            )}
            {prefix && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {prefix}
              </div>
            )}
            <h1 className="text-[34px] md:text-[40px] font-semibold text-white leading-[1.05] tracking-tight">
              {title}
            </h1>
            {subtitle && <div className="mt-3 text-body-lg text-white">{subtitle}</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
