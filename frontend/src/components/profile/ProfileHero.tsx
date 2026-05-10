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
  logoUrl?: string | null
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
  /** Shrink-on-scroll progress in `[0, 1]`. 0 = full hero, 1 = invisible.
   *  Drives a fade + slight upward translate so the hero glides under the
   *  sticky compact strip. */
  shrinkProgress?: number
}

export function ProfileHero({
  prefix,
  title,
  subtitle,
  badges = [],
  accent = "teal",
  imageUrl,
  imagePosition = 50,
  logoUrl,
  actions,
  breadcrumb,
  className,
  shrinkProgress = 0,
}: ProfileHeroProps) {
  const hasImage = !!imageUrl
  const heightClass = hasImage ? "h-[360px]" : "h-[260px]"
  // Subtle parallax — content fades and slides up as the user scrolls. The
  // hero stays in flow (its full height still occupies space) so the ramp
  // mirrors actual scroll distance.
  const contentStyle: React.CSSProperties = {
    transform: `translateY(${-shrinkProgress * 40}px)`,
    opacity: 1 - shrinkProgress,
    pointerEvents: shrinkProgress > 0.6 ? "none" : undefined,
  }

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
            style={{ objectPosition: `center ${imagePosition}%`, opacity: 1 - shrinkProgress }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/30 to-transparent pointer-events-none"
            style={{ opacity: 1 - shrinkProgress }}
          />
        </>
      )}

      {/* Top bar — breadcrumb left, actions right */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4" style={contentStyle}>
        <div className="text-white/90 text-[13px]">{breadcrumb}</div>
        <div className="flex items-center gap-1 text-white">{actions}</div>
      </div>

      {/* Bottom-left — prefix + title + subtitle */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-4" style={contentStyle}>
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
            <div className="flex items-center gap-3">
              {logoUrl && (
                <span className="inline-flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-md bg-white/95 p-1.5 shadow-sm">
                  <img
                    src={logoUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
              )}
              <h1 className="text-[34px] md:text-[40px] font-semibold text-white leading-[1.05] tracking-tight">
                {title}
              </h1>
            </div>
            {subtitle && <div className="mt-3 text-body-lg text-white">{subtitle}</div>}
          </div>
        </div>
      </div>
    </section>
  )
}

const ACCENT_LINE: Record<HeroAccent, string> = {
  teal: "bg-gradient-to-r from-teal-500/30 via-teal-600 to-teal-500/30",
  blue: "bg-gradient-to-r from-blue-500/30 via-blue-600 to-blue-500/30",
  coral: "bg-gradient-to-r from-rose-500/30 via-rose-600 to-rose-500/30",
  amber: "bg-gradient-to-r from-amber-500/30 via-amber-600 to-amber-500/30",
  grey: "bg-gradient-to-r from-slate-500/30 via-slate-600 to-slate-500/30",
  purple: "bg-gradient-to-r from-purple-500/30 via-purple-600 to-purple-500/30",
  rose: "bg-gradient-to-r from-rose-500/30 via-rose-600 to-rose-500/30",
  sky: "bg-gradient-to-r from-sky-500/30 via-sky-600 to-sky-500/30",
}

interface ProfileHeroCompactStripProps {
  /** Required identity — keeps the user oriented while scrolled. */
  title: React.ReactNode
  /** Optional secondary line (reporting org / org country / IATI ref etc.). */
  subtitle?: React.ReactNode
  /** Inline IDs (Activity ID pill, IATI badge…). Rendered between the
   *  subtitle and the actions cluster. */
  ids?: React.ReactNode
  /** Right-aligned action cluster — bookmark, vote, More menu, Edit pill. */
  actions?: React.ReactNode
  /** Optional left-side back button. */
  breadcrumb?: React.ReactNode
  /** Same accent palette as the full hero — coloured underline beneath the
   *  strip echoes the original banner gradient. */
  accent?: HeroAccent
  /** Shrink-on-scroll progress in `[0, 1]`. 0 → strip is invisible / 0px
   *  tall; 1 → strip is fully visible at ~60px. */
  progress?: number
  /** Strip height at full visibility (px). Defaults to 60. */
  height?: number
  className?: string
}

export function ProfileHeroCompactStrip({
  title,
  subtitle,
  ids,
  actions,
  breadcrumb,
  accent = "teal",
  progress = 0,
  height = 60,
  className,
}: ProfileHeroCompactStripProps) {
  // The strip exists in the DOM at all times so its sticky offset doesn't
  // shift mid-scroll; height + opacity ramp with progress.
  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{
        height: Math.round(height * progress),
        opacity: progress,
        pointerEvents: progress > 0.5 ? "auto" : "none",
        transition: "height 100ms linear, opacity 100ms linear",
      }}
    >
      <div className="flex items-center gap-3 px-6 h-[calc(100%-3px)] min-w-0">
        {breadcrumb && <div className="flex-shrink-0">{breadcrumb}</div>}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="text-base font-semibold text-foreground whitespace-nowrap">{title}</span>
          {subtitle && (
            <span className="hidden md:inline text-body text-foreground truncate before:content-['·'] before:mx-2 before:text-muted-foreground/50">
              {subtitle}
            </span>
          )}
          {ids && <div className="flex items-center gap-1.5 ml-auto md:ml-2 flex-shrink-0">{ids}</div>}
        </div>
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>
        )}
      </div>
      <div className={cn("h-[3px] w-full", ACCENT_LINE[accent])} />
    </div>
  )
}
