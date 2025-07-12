/**
 * Pre-caching utility for AIMS application
 * Implements intelligent pre-fetching and caching strategies for faster page loads
 */

import { LRUCache } from 'lru-cache'

// Cache configuration
const CACHE_CONFIG = {
  max: 100, // Maximum number of cached items
  ttl: 1000 * 60 * 15, // 15 minutes TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true,
}

// Global cache instances
const apiCache = new LRUCache<string, any>(CACHE_CONFIG)
const resourceCache = new LRUCache<string, any>({
  ...CACHE_CONFIG,
  ttl: 1000 * 60 * 60, // 1 hour TTL for static resources
})

interface PreCacheOptions {
  priority?: 'high' | 'medium' | 'low'
  ttl?: number
  force?: boolean
  background?: boolean
}

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
  url: string
}

class PreCacheManager {
  private pendingRequests = new Map<string, Promise<any>>()
  private preloadQueue: Array<{ url: string; options: PreCacheOptions }> = []
  private isProcessingQueue = false

  /**
   * Pre-cache API data for faster access
   */
  async preCacheAPI(url: string, options: PreCacheOptions = {}): Promise<any> {
    // Only run on client-side to prevent SSR issues
    if (typeof window === 'undefined') {
      console.log('[PreCache] Skipping server-side pre-cache for:', url)
      return null
    }

    const cacheKey = this.getCacheKey(url)
    const { force = false, background = false, ttl = CACHE_CONFIG.ttl } = options

    // Return cached data if available and not forced
    if (!force && apiCache.has(cacheKey)) {
      console.log(`[PreCache] Cache hit for: ${url}`)
      return apiCache.get(cacheKey)
    }

    // Return pending request if already in progress
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`[PreCache] Waiting for pending request: ${url}`)
      return this.pendingRequests.get(cacheKey)
    }

    // Create new request
    const requestPromise = this.fetchAndCache(url, cacheKey, ttl)
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * Pre-load multiple resources in background
   */
  async preloadResources(urls: string[], options: PreCacheOptions = {}): Promise<void> {
    const { priority = 'medium', background = true } = options

    // Add to queue
    urls.forEach(url => {
      this.preloadQueue.push({ url, options: { ...options, priority, background } })
    })

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processPreloadQueue()
    }
  }

  /**
   * Pre-cache activity editor dependencies
   */
  async preCacheActivityEditor(activityId?: string): Promise<void> {
    console.log('[PreCache] Starting Activity Editor pre-cache...')

    const urls = [
      '/api/iati-reference-values',
      '/api/organizations',
      '/api/organization-types',
      '/api/activities-simple?limit=20', // Recent activities for reference
    ]

    // Add specific activity if provided
    if (activityId) {
      urls.push(`/api/activities/${activityId}`)
    }

    await this.preloadResources(urls, { priority: 'high', background: true })
    console.log('[PreCache] Activity Editor pre-cache completed')
  }

  /**
   * Pre-cache organization pages
   */
  async preCacheOrganizations(): Promise<void> {
    console.log('[PreCache] Starting Organizations pre-cache...')

    const urls = [
      '/api/organizations',
      '/api/organizations/summary',
      '/api/organization-types',
      '/api/custom-groups?includeMembers=true',
    ]

    await this.preloadResources(urls, { priority: 'high', background: true })
    console.log('[PreCache] Organizations pre-cache completed')
  }

  /**
   * Pre-cache activity list
   */
  async preCacheActivityList(): Promise<void> {
    console.log('[PreCache] Starting Activity List pre-cache...')

    const urls = [
      '/api/activities-simple?limit=100',
      '/api/organizations', // For organization lookup
      '/api/iati-reference-values', // For status labels
    ]

    await this.preloadResources(urls, { priority: 'high', background: true })
    console.log('[PreCache] Activity List pre-cache completed')
  }

  /**
   * Intelligent pre-caching based on user navigation patterns
   */
  async smartPreCache(currentPath: string): Promise<void> {
    console.log(`[PreCache] Smart pre-cache for path: ${currentPath}`)

    // Pre-cache based on current path
    if (currentPath.includes('/activities/new')) {
      await this.preCacheActivityEditor()
    } else if (currentPath.includes('/activities/')) {
      // On activity detail page, pre-cache editor and list
      await Promise.all([
        this.preCacheActivityEditor(),
        this.preCacheActivityList(),
      ])
    } else if (currentPath.includes('/organizations')) {
      await this.preCacheOrganizations()
    } else if (currentPath === '/activities') {
      await this.preCacheActivityList()
    }

    // Always pre-cache common resources
    await this.preloadResources([
      '/api/iati-reference-values',
      '/api/organizations',
    ], { priority: 'low', background: true })
  }

  /**
   * Clear cache entries
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear specific pattern
      const keys = Array.from(apiCache.keys()).filter(key => key.includes(pattern))
      keys.forEach(key => apiCache.delete(key))
      console.log(`[PreCache] Cleared ${keys.length} cache entries matching: ${pattern}`)
    } else {
      // Clear all
      apiCache.clear()
      resourceCache.clear()
      console.log('[PreCache] Cleared all cache entries')
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      apiCache: {
        size: apiCache.size,
        max: apiCache.max,
        calculatedSize: apiCache.calculatedSize,
      },
      resourceCache: {
        size: resourceCache.size,
        max: resourceCache.max,
        calculatedSize: resourceCache.calculatedSize,
      },
      pendingRequests: this.pendingRequests.size,
      queueSize: this.preloadQueue.length,
    }
  }

  /**
   * Private methods
   */
  private async fetchAndCache(url: string, cacheKey: string, ttl: number): Promise<any> {
    try {
      console.log(`[PreCache] Fetching: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Cache the result
      apiCache.set(cacheKey, data, { ttl })
      console.log(`[PreCache] Cached: ${url}`)
      
      return data
    } catch (error) {
      console.error(`[PreCache] Failed to fetch ${url}:`, error)
      throw error
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.preloadQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      // Process queue with priority ordering
      const sortedQueue = [...this.preloadQueue].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.options.priority || 'medium'] - priorityOrder[a.options.priority || 'medium']
      })

      // Clear queue
      this.preloadQueue = []

      // Process items with delay to avoid overwhelming the server
      for (const item of sortedQueue) {
        try {
          await this.preCacheAPI(item.url, item.options)
          
          // Small delay between requests
          if (item.options.background) {
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        } catch (error) {
          console.warn(`[PreCache] Failed to preload ${item.url}:`, error)
        }
      }
    } finally {
      this.isProcessingQueue = false
      
      // Process any new items that were added during processing
      if (this.preloadQueue.length > 0) {
        setTimeout(() => this.processPreloadQueue(), 100)
      }
    }
  }

  private getCacheKey(url: string): string {
    // Normalize URL for consistent caching
    try {
      const urlObj = new URL(url, window.location.origin)
      return urlObj.pathname + urlObj.search
    } catch {
      return url
    }
  }
}

// Export singleton instance
export const preCacheManager = new PreCacheManager()

// Export hook for React components
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

// Utility function to wrap fetch with caching
export async function cachedFetch(url: string, options?: RequestInit): Promise<Response> {
  const cacheKey = preCacheManager['getCacheKey'](url)
  
  // Only cache GET requests without custom options
  if (!options || options.method === 'GET') {
    try {
      const cachedData = await preCacheManager.preCacheAPI(url)
      
      // Return a Response-like object with cached data
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      })
    } catch {
      // Fall back to regular fetch if cache fails
      console.log(`[PreCache] Cache miss, falling back to fetch: ${url}`)
    }
  }
  
  return fetch(url, options)
}