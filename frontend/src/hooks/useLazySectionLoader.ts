"use client"

import { useEffect, useState, useCallback, useRef, RefObject } from 'react'

export interface LazySection {
  id: string
  ref: RefObject<HTMLElement>
}

interface UseLazySectionLoaderOptions {
  /** 
   * Root margin for intersection observer. 
   * Uses larger margin to preload sections before they're visible.
   * Default: '200px 0px 200px 0px' (200px above and below viewport)
   */
  rootMargin?: string
  /** The scrollable container element. Defaults to null (uses viewport) */
  root?: Element | null
  /** Initial sections to mark as active (e.g., for SSR or initial load) */
  initialActiveSections?: string[]
}

interface UseLazySectionLoaderReturn {
  /** Set of section IDs that have been activated (scrolled into view) */
  activeSections: Set<string>
  /** Check if a specific section is active */
  isSectionActive: (sectionId: string) => boolean
  /** Manually activate a section (useful for initial load or programmatic activation) */
  activateSection: (sectionId: string) => void
  /** Manually activate multiple sections at once */
  activateSections: (sectionIds: string[]) => void
}

/**
 * Hook that manages lazy loading of sections by tracking which sections
 * have scrolled into (or near) the viewport.
 * 
 * Unlike useScrollSpy, this hook:
 * - Uses a larger rootMargin to trigger loading BEFORE sections are visible
 * - Once a section is activated, it stays activated (no unloading)
 * - Designed for controlling data loading, not highlighting
 */
export function useLazySectionLoader(
  sections: LazySection[],
  options: UseLazySectionLoaderOptions = {}
): UseLazySectionLoaderReturn {
  const {
    rootMargin = '200px 0px 200px 0px', // Preload 200px before visible
    root = null,
    initialActiveSections = [],
  } = options

  const [activeSections, setActiveSections] = useState<Set<string>>(
    () => new Set(initialActiveSections)
  )
  
  // Track which sections we've already set up observers for
  const observedSections = useRef<Set<string>>(new Set())

  // Activate a single section
  const activateSection = useCallback((sectionId: string) => {
    setActiveSections(prev => {
      if (prev.has(sectionId)) {
        return prev // No change needed
      }
      const next = new Set(prev)
      next.add(sectionId)
      return next
    })
  }, [])

  // Activate multiple sections at once
  const activateSections = useCallback((sectionIds: string[]) => {
    setActiveSections(prev => {
      const newIds = sectionIds.filter(id => !prev.has(id))
      if (newIds.length === 0) {
        return prev // No change needed
      }
      const next = new Set(prev)
      newIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  // Check if a section is active
  const isSectionActive = useCallback((sectionId: string) => {
    return activeSections.has(sectionId)
  }, [activeSections])

  // Set up Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id
            activateSection(sectionId)
            
            // Once activated, we can stop observing this section
            observer.unobserve(entry.target)
            observedSections.current.delete(sectionId)
          }
        })
      },
      {
        root,
        rootMargin,
        threshold: 0,
      }
    )

    // Observe all section elements that haven't been activated yet
    sections.forEach(({ id, ref }) => {
      // Skip if already active or already being observed
      if (activeSections.has(id) || observedSections.current.has(id)) {
        return
      }
      
      if (ref.current) {
        observer.observe(ref.current)
        observedSections.current.add(id)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [sections, root, rootMargin, activateSection, activeSections])

  return {
    activeSections,
    isSectionActive,
    activateSection,
    activateSections,
  }
}

/**
 * Simplified version that just accepts section IDs and returns activation state.
 * Useful when you don't need ref-based observation (e.g., when using a parent observer).
 */
export function useManualLazyLoader(
  initialActiveSections: string[] = []
): Omit<UseLazySectionLoaderReturn, 'activeSections'> & { activeSections: Set<string> } {
  const [activeSections, setActiveSections] = useState<Set<string>>(
    () => new Set(initialActiveSections)
  )

  const activateSection = useCallback((sectionId: string) => {
    setActiveSections(prev => {
      if (prev.has(sectionId)) return prev
      const next = new Set(prev)
      next.add(sectionId)
      return next
    })
  }, [])

  const activateSections = useCallback((sectionIds: string[]) => {
    setActiveSections(prev => {
      const newIds = sectionIds.filter(id => !prev.has(id))
      if (newIds.length === 0) return prev
      const next = new Set(prev)
      newIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  const isSectionActive = useCallback((sectionId: string) => {
    return activeSections.has(sectionId)
  }, [activeSections])

  return {
    activeSections,
    isSectionActive,
    activateSection,
    activateSections,
  }
}
