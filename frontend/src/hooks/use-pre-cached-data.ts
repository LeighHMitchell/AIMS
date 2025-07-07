/**
 * Hook for accessing pre-cached data with fallback to regular fetch
 */

import { useState, useEffect, useCallback } from 'react'
import { preCacheManager } from '@/lib/pre-cache'

interface UseCachedDataOptions {
  enabled?: boolean
  fallbackToFetch?: boolean
  backgroundRefresh?: boolean
}

interface CachedDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isFromCache: boolean
  lastUpdated: Date | null
}

export function usePreCachedData<T = any>(
  url: string, 
  options: UseCachedDataOptions = {}
) {
  const { 
    enabled = true, 
    fallbackToFetch = true, 
    backgroundRefresh = true 
  } = options

  const [state, setState] = useState<CachedDataState<T>>({
    data: null,
    loading: true,
    error: null,
    isFromCache: false,
    lastUpdated: null,
  })

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !url) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Try to get from cache first
      let data: T
      let isFromCache = false

      try {
        data = await preCacheManager.preCacheAPI(url, { force: forceRefresh })
        isFromCache = !forceRefresh
        console.log(`[PreCachedData] ${isFromCache ? 'Cache hit' : 'Fresh fetch'} for: ${url}`)
      } catch (cacheError) {
        if (!fallbackToFetch) {
          throw cacheError
        }

        // Fallback to regular fetch
        console.log(`[PreCachedData] Cache failed, falling back to fetch: ${url}`)
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        data = await response.json()
        isFromCache = false
      }

      setState({
        data,
        loading: false,
        error: null,
        isFromCache,
        lastUpdated: new Date(),
      })

      return data
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
      }))
      throw err
    }
  }, [url, enabled, fallbackToFetch])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Background refresh
  useEffect(() => {
    if (!backgroundRefresh || !enabled || !url) return

    const interval = setInterval(() => {
      fetchData(true).catch(console.warn)
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [fetchData, backgroundRefresh, enabled, url])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  return {
    ...state,
    refresh,
  }
}

/**
 * Hook for pre-caching common IATI reference values
 */
export function useIATIReferenceCache() {
  return usePreCachedData('/api/iati-reference-values', {
    backgroundRefresh: true,
  })
}

/**
 * Hook for pre-caching organizations
 */
export function useOrganizationsCache() {
  return usePreCachedData('/api/organizations', {
    backgroundRefresh: true,
  })
}

/**
 * Hook for pre-caching organization types
 */
export function useOrganizationTypesCache() {
  return usePreCachedData('/api/organization-types', {
    backgroundRefresh: true,
  })
}

/**
 * Hook for pre-caching activities
 */
export function useActivitiesCache(limit = 100) {
  return usePreCachedData(`/api/activities-simple?limit=${limit}`, {
    backgroundRefresh: true,
  })
}

/**
 * Hook for accessing pre-cache manager methods
 */
export function usePreCache() {
  return {
    preCacheAPI: preCacheManager.preCacheAPI.bind(preCacheManager),
    preloadResources: preCacheManager.preloadResources.bind(preCacheManager),
    preCacheActivityEditor: preCacheManager.preCacheActivityEditor.bind(preCacheManager),
    preCacheOrganizations: preCacheManager.preCacheOrganizations.bind(preCacheManager),
    preCacheActivityList: preCacheManager.preCacheActivityList.bind(preCacheManager),
    smartPreCache: preCacheManager.smartPreCache.bind(preCacheManager),
    clearCache: preCacheManager.clearCache.bind(preCacheManager),
    getCacheStats: preCacheManager.getCacheStats.bind(preCacheManager),
  }
}

/**
 * Hook for smart pre-caching based on page context
 */
export function useSmartPreCache(currentPath?: string) {
  useEffect(() => {
    if (!currentPath) return

    // Debounce to avoid excessive pre-caching
    const timer = setTimeout(() => {
      preCacheManager.smartPreCache(currentPath).catch(console.warn)
    }, 500)

    return () => clearTimeout(timer)
  }, [currentPath])

  return {
    preCacheStats: preCacheManager.getCacheStats(),
    clearCache: preCacheManager.clearCache.bind(preCacheManager),
  }
}