"use client"

import { useEffect, useState } from "react"

/**
 * Tracks how far the page has been scrolled and returns a ramp value in
 * `[0, 1]` — 0 at the page top, 1 once the user passes `threshold` pixels.
 * Drives the shrink-on-scroll animation on `ProfileHero` / `ProfileLayout`.
 *
 * Auto-detects the actual scroll container: the app's `MainLayout` wraps
 * page content in a `<main>` with `overflow-y-auto`, so the window itself
 * never scrolls. The hook checks the first `<main>`'s computed style and
 * falls back to the window when no inner scroll root exists.
 *
 * Scroll handlers are coalesced into `requestAnimationFrame`, so the value
 * updates at most once per paint and the chart-heavy profile pages don't
 * thrash on every wheel event.
 */
export function useShrinkOnScroll(threshold: number = 200): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    let frame = 0

    // The first `<main>` in the document is the MainLayout's scroll root
    // when it has overflow-y: auto/scroll; otherwise the window scrolls.
    const findScrollRoot = (): HTMLElement | Window => {
      const main = document.querySelector("main")
      if (main) {
        const overflowY = window.getComputedStyle(main).overflowY
        if (overflowY === "auto" || overflowY === "scroll") return main as HTMLElement
      }
      return window
    }
    const container = findScrollRoot()

    const readY = () =>
      container === window
        ? (window.scrollY || window.pageYOffset || 0)
        : (container as HTMLElement).scrollTop

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = readY()
        const next = Math.max(0, Math.min(1, y / threshold))
        // Only commit if it changes meaningfully — avoids React re-renders on
        // sub-pixel jitter while the user is paused mid-scroll.
        setProgress((prev) => (Math.abs(prev - next) < 0.001 ? prev : next))
      })
    }
    onScroll()
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      container.removeEventListener("scroll", onScroll)
    }
  }, [threshold])

  return progress
}
