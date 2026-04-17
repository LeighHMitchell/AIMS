"use client"

import { useEffect, useState, useCallback, useRef, RefObject, useTransition } from 'react'

export interface SectionRef {
  id: string
  ref: RefObject<HTMLElement>
}

interface UseScrollSpyOptions {
  /** Root margin for intersection observer. Default triggers when section enters upper 30% of viewport */
  rootMargin?: string
  /** Threshold for intersection. Default is 0 (any intersection triggers) */
  threshold?: number | number[]
  /** Debounce delay in ms to prevent rapid updates during fast scroll */
  debounceMs?: number
  /** The scrollable container element. Defaults to null (uses viewport) */
  root?: Element | null
  /** Initial active section ID. Defaults to sections[0].id. Set this to avoid
   *  an extra state update when the desired initial section isn't the first one. */
  initialSection?: string | null
}

interface UseScrollSpyReturn {
  /** Currently active section ID */
  activeSection: string | null
  /** Function to scroll to a specific section with smooth animation */
  scrollToSection: (sectionId: string) => void
  /** Manually set the active section (useful for initial load) */
  setActiveSection: (sectionId: string) => void
  /** Lock scroll spy for a given duration (prevents auto-updates during content loading) */
  lockScrollSpy: (durationMs: number) => void
}

/**
 * Hook that tracks which section is currently visible in the viewport
 * and provides smooth scroll functionality to navigate between sections.
 *
 * Uses Intersection Observer to detect when sections enter the "active zone"
 * (upper portion of the viewport by default).
 */
export function useScrollSpy(
  sections: SectionRef[],
  options: UseScrollSpyOptions = {}
): UseScrollSpyReturn {
  const {
    rootMargin = '-10% 0px -60% 0px', // Triggers when section is in upper 40% of viewport
    threshold = 0,
    debounceMs = 150,
    root = null,
    initialSection = null,
  } = options

  const [activeSection, setActiveSection] = useState<string | null>(
    initialSection || (sections.length > 0 ? sections[0].id : null)
  )

  // Use transition for scroll-spy-driven updates so they don't block scrolling
  const [, startTransition] = useTransition()

  // Track which sections are currently intersecting and their ratios
  const intersectingMap = useRef<Map<string, number>>(new Map())
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const isScrollingProgrammatically = useRef(false)
  const lockTimeout = useRef<NodeJS.Timeout | null>(null)

  /**
   * Lock scroll spy updates for a given duration.
   * Use this during programmatic navigation or content loading to prevent
   * the active section from flickering due to layout shifts.
   */
  const lockScrollSpy = useCallback((durationMs: number) => {
    isScrollingProgrammatically.current = true
    // Clear any existing unlock timeout
    if (lockTimeout.current) {
      clearTimeout(lockTimeout.current)
    }
    lockTimeout.current = setTimeout(() => {
      isScrollingProgrammatically.current = false
      lockTimeout.current = null
    }, durationMs)
  }, [])

  // Listen for global scroll events to pause scroll spy during programmatic scrolls
  useEffect(() => {
    const handleGlobalScroll = (event: CustomEvent<string>) => {
      // When any section is being scrolled to, pause this scroll spy
      lockScrollSpy(2000) // Extended from 1200ms to cover content loading + scroll animation
    }

    window.addEventListener('scrollToSection', handleGlobalScroll as EventListener)
    return () => {
      window.removeEventListener('scrollToSection', handleGlobalScroll as EventListener)
      if (lockTimeout.current) {
        clearTimeout(lockTimeout.current)
      }
    }
  }, [lockScrollSpy])

  // Use a ref to track current active section so updateActiveSection doesn't need
  // activeSection in its dependency array (which would recreate the observer on every change)
  const activeSectionRef = useRef(activeSection)
  activeSectionRef.current = activeSection

  // Debounced function to update active section based on intersections
  const updateActiveSection = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      // Skip update if we're programmatically scrolling or externally locked
      if (isScrollingProgrammatically.current) {
        return
      }

      const intersecting = Array.from(intersectingMap.current.entries())
        .filter(([_, ratio]) => ratio > 0)

      if (intersecting.length === 0) {
        // Bottom-of-scroll fallback: if the scroll container is at (or very near)
        // its bottom, the last section may be unable to enter the intersection
        // active band (upper portion of viewport) because the browser can't scroll
        // further. In that case, force-activate the last section that is visible
        // in the viewport at all. Without this, activeSection stays stale and
        // "Next" navigation skips the last section.
        const scrollEl: Element | Window =
          root || (typeof document !== 'undefined' ? document.scrollingElement || document.documentElement : null as any)
        if (!scrollEl) return
        const scrollTop = 'scrollTop' in scrollEl ? (scrollEl as Element).scrollTop : 0
        const scrollHeight = 'scrollHeight' in scrollEl ? (scrollEl as Element).scrollHeight : 0
        const clientHeight = 'clientHeight' in scrollEl ? (scrollEl as Element).clientHeight : 0
        const nearBottom = scrollHeight - (scrollTop + clientHeight) < 4
        if (!nearBottom) return

        // Pick the last section (in declared order) whose element is currently
        // within the viewport at all (top above viewport bottom, bottom below top).
        let fallback: string | null = null
        for (const { id, ref } of sections) {
          const el = ref.current
          if (!el) continue
          const rect = el.getBoundingClientRect()
          const rootRect =
            root instanceof Element
              ? root.getBoundingClientRect()
              : { top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight : 0 }
          if (rect.top < rootRect.bottom && rect.bottom > rootRect.top) {
            fallback = id
          }
        }
        if (fallback && fallback !== activeSectionRef.current) {
          startTransition(() => {
            setActiveSection(fallback!)
          })
        }
        return
      }

      // Find the section with highest position (closest to top of viewport)
      // by checking the order in our sections array
      const sectionOrder = sections.map(s => s.id)
      let topMostSection: string | null = null
      let topMostIndex = Infinity

      for (const [id] of intersecting) {
        const index = sectionOrder.indexOf(id)
        if (index !== -1 && index < topMostIndex) {
          topMostIndex = index
          topMostSection = id
        }
      }

      if (topMostSection && topMostSection !== activeSectionRef.current) {
        // Use startTransition so this non-urgent sidebar highlight update
        // doesn't block the browser from rendering smooth scroll frames
        startTransition(() => {
          setActiveSection(topMostSection)
        })
      }
    }, debounceMs)
  }, [sections, debounceMs, root])

  // Set up Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.id
          if (entry.isIntersecting) {
            intersectingMap.current.set(sectionId, entry.intersectionRatio)
          } else {
            intersectingMap.current.delete(sectionId)
          }
        })
        updateActiveSection()
      },
      {
        root,
        rootMargin,
        threshold,
      }
    )

    // Observe all section elements
    sections.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    // Also listen for scroll on the root so the bottom-of-scroll fallback fires
    // even when no section is intersecting (so no observer callback runs).
    const scrollTarget: EventTarget | null =
      root ||
      (typeof document !== 'undefined'
        ? (document.scrollingElement || document.documentElement || window)
        : null)
    const handleScroll = () => updateActiveSection()
    if (scrollTarget) {
      scrollTarget.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      observer.disconnect()
      if (scrollTarget) {
        scrollTarget.removeEventListener('scroll', handleScroll)
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [sections, root, rootMargin, threshold, updateActiveSection])

  // Scroll to a specific section with smooth animation
  const scrollToSection = useCallback((sectionId: string) => {
    // First try to find in our sections array (for refs)
    const section = sections.find(s => s.id === sectionId)
    let element = section?.ref.current

    // Fallback: use document.getElementById if ref not available
    // This is more reliable during re-renders when refs might not be attached yet
    if (!element) {
      element = document.getElementById(sectionId)
    }

    if (!element) {
      console.warn(`[useScrollSpy] Could not find element for section: ${sectionId}`)
      return
    }

    // Lock scroll spy during programmatic scroll + content loading settle time
    lockScrollSpy(2000)

    // Update active section immediately for responsive UI
    setActiveSection(sectionId)

    // Use requestAnimationFrame to ensure DOM has settled before scrolling.
    // Single smooth scroll, no follow-up retry — late lazy-load layout
    // shifts can leave the target slightly misaligned, but the competing
    // retry attempts we tried caused worse flicker, so we accept the
    // occasional drift.
    requestAnimationFrame(() => {
      const targetElement = document.getElementById(sectionId)
      if (!targetElement) return
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [sections, lockScrollSpy])

  return {
    activeSection,
    scrollToSection,
    setActiveSection,
    lockScrollSpy,
  }
}

/**
 * Helper hook to create refs for multiple sections
 */
export function useSectionRefs(sectionIds: string[]): SectionRef[] {
  const refs = useRef<Map<string, RefObject<HTMLElement>>>(new Map())

  // Initialize refs for any new section IDs
  sectionIds.forEach(id => {
    if (!refs.current.has(id)) {
      refs.current.set(id, { current: null } as RefObject<HTMLElement>)
    }
  })

  return sectionIds.map(id => ({
    id,
    ref: refs.current.get(id)!,
  }))
}
