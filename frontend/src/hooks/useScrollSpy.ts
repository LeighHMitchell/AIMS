"use client"

import { useEffect, useState, useCallback, useRef, RefObject } from 'react'

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
}

interface UseScrollSpyReturn {
  /** Currently active section ID */
  activeSection: string | null
  /** Function to scroll to a specific section with smooth animation */
  scrollToSection: (sectionId: string) => void
  /** Manually set the active section (useful for initial load) */
  setActiveSection: (sectionId: string) => void
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
    rootMargin = '-10% 0px -70% 0px', // Triggers when section is in upper 30% of viewport
    threshold = 0,
    debounceMs = 100,
    root = null,
  } = options

  const [activeSection, setActiveSection] = useState<string | null>(
    sections.length > 0 ? sections[0].id : null
  )
  
  // Track which sections are currently intersecting and their ratios
  const intersectingMap = useRef<Map<string, number>>(new Map())
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const isScrollingProgrammatically = useRef(false)

  // Debounced function to update active section based on intersections
  const updateActiveSection = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      // Skip update if we're programmatically scrolling
      if (isScrollingProgrammatically.current) {
        return
      }

      const intersecting = Array.from(intersectingMap.current.entries())
        .filter(([_, ratio]) => ratio > 0)
      
      if (intersecting.length === 0) {
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

      if (topMostSection && topMostSection !== activeSection) {
        setActiveSection(topMostSection)
      }
    }, debounceMs)
  }, [sections, activeSection, debounceMs])

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

    return () => {
      observer.disconnect()
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [sections, root, rootMargin, threshold, updateActiveSection])

  // Scroll to a specific section with smooth animation
  const scrollToSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section?.ref.current) {
      return
    }

    // Mark that we're scrolling programmatically to prevent scroll spy updates
    isScrollingProgrammatically.current = true
    
    // Update active section immediately for responsive UI
    setActiveSection(sectionId)

    // Scroll to section
    section.ref.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    // Reset programmatic scroll flag after animation completes
    // Using a timeout since scrollIntoView doesn't have a callback
    setTimeout(() => {
      isScrollingProgrammatically.current = false
    }, 1000) // Conservative estimate for scroll animation duration
  }, [sections])

  return {
    activeSection,
    scrollToSection,
    setActiveSection,
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
