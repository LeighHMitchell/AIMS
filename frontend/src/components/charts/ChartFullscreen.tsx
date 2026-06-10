"use client"

import React, { ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChartExpansionProvider } from "@/lib/chart-expansion-context"

interface ChartFullscreenProps {
  /** Render-prop receiving fullscreen state + toggle. Use the toggle inside a
   *  CardHeader's controls cluster to position the expand button in the top
   *  right. The wrapper lifts the whole subtree to fullscreen via CSS so the
   *  underlying chart keeps its DOM identity (no remount, no flicker). */
  children: (state: { isFullscreen: boolean; toggle: () => void }) => ReactNode
  className?: string
}

export function ChartFullscreen({ children, className }: ChartFullscreenProps) {
  // `open` is the user intent. `rendering` keeps the overlay mounted through
  // the close animation so it can fade + zoom OUT — Radix Dialog gets this
  // free via presence; here we replicate it with a short timeout so this
  // matches the analytics-dashboard Dialog exactly (open AND close animate).
  const [open, setOpen] = useState(false)
  const [rendering, setRendering] = useState(false)
  const closing = rendering && !open
  const toggle = () => setOpen((v) => !v)

  // Mount immediately on open; on close, stay mounted for the exit animation
  // (220ms ≳ the 200ms animate-out) then drop the overlay.
  useEffect(() => {
    if (open) {
      setRendering(true)
      return
    }
    if (!rendering) return
    const t = setTimeout(() => setRendering(false), 220)
    return () => clearTimeout(t)
  }, [open, rendering])

  // ESC closes fullscreen
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  // Lock body scroll while the overlay is on screen (incl. during close anim)
  useEffect(() => {
    if (!rendering) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [rendering])

  return (
    <>
      {/* Dim backdrop — clicking it closes. Matches the analytics-dashboard
          Dialog overlay exactly (bg-black/50 + blur, fades in AND out). */}
      {rendering && (
        <div
          className={cn(
            "fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm",
            closing
              ? "animate-out fade-out-0 duration-200"
              : "animate-in fade-in-0 duration-200",
          )}
          onClick={toggle}
          aria-hidden
        />
      )}
      {/*
        Outer wrapper centres the panel by LAYOUT while on screen, so the zoom
        is a pure scale with no transform-based centring to fight (no corner
        slide). When inline it is display:contents — it adds no box and the
        chart subtree is NOT remounted on toggle (preserves DOM identity).
      */}
      <div
        className={cn(
          rendering
            ? "fixed inset-0 z-[1000] grid place-items-center p-4 pointer-events-none"
            : "contents",
        )}
      >
        <div
          className={cn(
            rendering
              ? "pointer-events-auto w-[95vw] max-w-[1400px] h-[85vh] overflow-auto bg-background border border-border rounded-lg shadow-2xl ease-out-expo " +
                  (closing
                    ? "animate-out fade-out-0 zoom-out-95 duration-200"
                    : "animate-in fade-in-0 zoom-in-95 duration-300")
              : "",
            className,
          )}
        >
          <ChartExpansionProvider isExpanded={rendering}>
            {children({ isFullscreen: rendering, toggle })}
          </ChartExpansionProvider>
        </div>
      </div>
    </>
  )
}

/** Small icon button matching the analytics dashboard style. Renders a close
 *  (X) affordance when already fullscreen, and an expand affordance otherwise —
 *  so every expanded chart has a visible close control. */
export function ChartExpandIconButton({
  isFullscreen,
  onClick,
}: {
  isFullscreen: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("flex-shrink-0", isFullscreen ? "h-9 w-9" : "h-8 w-8")}
      onClick={onClick}
      title={isFullscreen ? "Close" : "Expand chart"}
      aria-label={isFullscreen ? "Close" : "Expand chart"}
    >
      {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </Button>
  )
}
