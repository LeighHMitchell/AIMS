/**
 * Hook for prefetching Next.js routes (page JavaScript bundles)
 * This is different from data pre-caching - it preloads the code for faster navigation
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from './useUser'

// Routes that are commonly accessed and should be prefetched early
const CORE_ROUTES = [
  '/activities',
  '/dashboard',
  '/organizations',
  '/analytics-dashboard',
]

// Define which routes to prefetch based on current location
const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  '/dashboard': [
    '/activities',
    '/activities/new',
    '/organizations',
    '/analytics-dashboard',
  ],
  '/activities': [
    '/activities/new',
    '/dashboard',
    '/organizations',
  ],
  '/organizations': [
    '/activities',
    '/dashboard',
  ],
  '/analytics-dashboard': [
    '/activities',
    '/dashboard',
    '/aid-effectiveness-dashboard',
  ],
  '/login': [
    '/dashboard',
    '/activities',
  ],
}

interface UseRoutePrefetchOptions {
  enabled?: boolean
  prefetchUserOrg?: boolean
  delay?: number
}

/**
 * Hook to intelligently prefetch routes based on current page and user context
 */
export function useRoutePrefetch(options: UseRoutePrefetchOptions = {}) {
  const { enabled = true, prefetchUserOrg = true, delay = 1000 } = options
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const prefetchedRoutes = useRef<Set<string>>(new Set())

  // Prefetch a single route (with deduplication)
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) {
      return
    }

    try {
      router.prefetch(route)
      prefetchedRoutes.current.add(route)
      console.log(`[RoutePrefetch] Prefetched: ${route}`)
    } catch (error) {
      console.warn(`[RoutePrefetch] Failed to prefetch ${route}:`, error)
    }
  }, [router])

  // Prefetch multiple routes with staggered timing
  const prefetchRoutes = useCallback((routes: string[], staggerMs = 100) => {
    routes.forEach((route, index) => {
      setTimeout(() => {
        prefetchRoute(route)
      }, index * staggerMs)
    })
  }, [prefetchRoute])

  // Prefetch core routes on initial load
  useEffect(() => {
    if (!enabled) return

    const timer = setTimeout(() => {
      prefetchRoutes(CORE_ROUTES)
    }, delay)

    return () => clearTimeout(timer)
  }, [enabled, delay, prefetchRoutes])

  // Prefetch routes based on current page
  useEffect(() => {
    if (!enabled || !pathname) return

    // Find matching route pattern (handles dynamic routes)
    const routeKey = Object.keys(ROUTE_PREFETCH_MAP).find(key => {
      if (pathname === key) return true
      // Handle pattern matching for base paths
      if (key !== '/' && pathname.startsWith(key)) return true
      return false
    })

    if (routeKey) {
      const routesToPrefetch = ROUTE_PREFETCH_MAP[routeKey]

      // Stagger prefetching to avoid overwhelming the network
      const timer = setTimeout(() => {
        prefetchRoutes(routesToPrefetch, 150)
      }, 500) // Short delay after navigation completes

      return () => clearTimeout(timer)
    }
  }, [enabled, pathname, prefetchRoutes])

  // Prefetch user-specific routes (like their organization page)
  useEffect(() => {
    if (!enabled || !prefetchUserOrg || !user) return

    const userRoutes: string[] = []

    // Prefetch user's organization profile page
    if (user.organizationId) {
      userRoutes.push(`/organizations/${user.organizationId}`)
    }

    // Prefetch user's profile page
    if (user.id) {
      userRoutes.push(`/profile`)
    }

    if (userRoutes.length > 0) {
      const timer = setTimeout(() => {
        prefetchRoutes(userRoutes, 200)
      }, delay + 500) // After core routes

      return () => clearTimeout(timer)
    }
  }, [enabled, prefetchUserOrg, user, delay, prefetchRoutes])

  // Return utility functions for manual prefetching
  return {
    prefetchRoute,
    prefetchRoutes,
    prefetchedCount: prefetchedRoutes.current.size,
  }
}

/**
 * Hook for prefetching activity-related routes
 */
export function useActivityPrefetch(activityId?: string) {
  const { prefetchRoute } = useRoutePrefetch()

  useEffect(() => {
    if (activityId) {
      // When viewing an activity, prefetch related pages
      prefetchRoute(`/activities/${activityId}/edit`)
      prefetchRoute('/activities')
    }
  }, [activityId, prefetchRoute])
}

/**
 * Hook for prefetching on hover (for Link components)
 */
export function usePrefetchOnHover(route: string) {
  const { prefetchRoute } = useRoutePrefetch()
  const hasPrefetched = useRef(false)

  const onMouseEnter = useCallback(() => {
    if (!hasPrefetched.current) {
      prefetchRoute(route)
      hasPrefetched.current = true
    }
  }, [route, prefetchRoute])

  return { onMouseEnter }
}
