/**
 * Enhanced in-memory cache for search results with hit/miss tracking
 * This can be easily extended to use Redis or other caching solutions
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  accessCount: number // Track how often this entry is accessed
}

interface SearchCacheOptions {
  ttl?: number // Default TTL in milliseconds (5 minutes)
  maxEntries?: number // Maximum number of cache entries
}

interface CacheStats {
  size: number
  maxEntries: number
  hits: number
  misses: number
  hitRatio: number
  avgAccessCount: number
  oldestEntry: number | null
  newestEntry: number | null
}

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>()
  private options: Required<SearchCacheOptions>
  private hits = 0
  private misses = 0

  constructor(options: SearchCacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxEntries: 100, // Max 100 entries
      ...options
    }
  }

  /**
   * Generate a cache key from query and options
   */
  private generateKey(query: string, options: Record<string, any> = {}): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((result, key) => {
        result[key] = options[key]
        return result
      }, {} as Record<string, any>)

    return `${query}:${JSON.stringify(sortedOptions)}`
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Clean up expired entries using LRU-style eviction
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))

    // If still over max entries, remove least recently used entries
    // (entries with lowest access count and oldest timestamp)
    if (this.cache.size > this.options.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => {
          // Primary sort by access count (ascending)
          if (a.accessCount !== b.accessCount) {
            return a.accessCount - b.accessCount
          }
          // Secondary sort by timestamp (ascending - oldest first)
          return a.timestamp - b.timestamp
        })

      const keysToRemove = entries
        .slice(0, this.cache.size - this.options.maxEntries)
        .map(([key]) => key)
      
      keysToRemove.forEach(key => this.cache.delete(key))
    }
  }

  /**
   * Get cached data with hit/miss tracking
   */
  get<T>(query: string, options: Record<string, any> = {}): T | null {
    const key = this.generateKey(query, options)
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Update access count for LRU tracking
    entry.accessCount++
    this.hits++
    
    return entry.data
  }

  /**
   * Set cached data
   */
  set<T>(query: string, data: T, options: Record<string, any> = {}, customTtl?: number): void {
    this.cleanup()

    const key = this.generateKey(query, options)
    const ttl = customTtl ?? this.options.ttl

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1
    })
  }

  /**
   * Delete specific cache entry
   */
  delete(query: string, options: Record<string, any> = {}): void {
    const key = this.generateKey(query, options)
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries and reset stats
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    let totalAccessCount = 0
    let oldestEntry: number | null = null
    let newestEntry: number | null = null

    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp
      }
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      maxEntries: this.options.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? this.hits / total : 0,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Reset hit/miss counters
   */
  resetStats(): void {
    this.hits = 0
    this.misses = 0
  }

  /**
   * Log cache statistics to console
   */
  logStats(): void {
    const stats = this.getStats()
    console.log('[Search Cache Stats]', {
      size: `${stats.size}/${stats.maxEntries}`,
      hitRatio: `${(stats.hitRatio * 100).toFixed(1)}%`,
      hits: stats.hits,
      misses: stats.misses,
      avgAccess: stats.avgAccessCount.toFixed(1)
    })
  }

  /**
   * Warm the cache with pre-fetched queries
   * Useful for popular searches
   */
  async warmCache<T>(
    queries: string[],
    fetchFn: (query: string) => Promise<T>,
    options: Record<string, any> = {}
  ): Promise<void> {
    const promises = queries.map(async (query) => {
      try {
        const data = await fetchFn(query)
        this.set(query, data, options)
      } catch (error) {
        console.warn(`[Search Cache] Failed to warm cache for query: ${query}`, error)
      }
    })

    await Promise.allSettled(promises)
  }
}

// Create a singleton instance with increased capacity
export const searchCache = new SearchCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 500 // Increased for better cache performance
})

// Export for testing or advanced usage
export { SearchCache, type SearchCacheOptions, type CacheEntry, type CacheStats }

// Cache key generators for common search types
export const cacheKeys = {
  search: (query: string, page: number = 1, limit: number = 20) =>
    `search:${query}:${page}:${limit}`,

  suggestions: (query: string, limit: number = 10) =>
    `suggestions:${query}:${limit}`,

  popularSearches: (limit: number = 5) =>
    `popular:${limit}`,
  
  searchCount: (query: string) =>
    `count:${query}`
}
