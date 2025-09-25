/**
 * Simple in-memory cache for search results
 * This can be easily extended to use Redis or other caching solutions
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface SearchCacheOptions {
  ttl?: number // Default TTL in milliseconds (5 minutes)
  maxEntries?: number // Maximum number of cache entries
}

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>()
  private options: Required<SearchCacheOptions>

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
   * Clean up expired entries
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

    // If still over max entries, remove oldest entries
    if (this.cache.size > this.options.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)

      const keysToRemove = entries.slice(0, this.cache.size - this.options.maxEntries).map(([key]) => key)
      keysToRemove.forEach(key => this.cache.delete(key))
    }
  }

  /**
   * Get cached data
   */
  get<T>(query: string, options: Record<string, any> = {}): T | null {
    const key = this.generateKey(query, options)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

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
      ttl
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
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number; hitRatio: number } {
    return {
      size: this.cache.size,
      maxEntries: this.options.maxEntries,
      hitRatio: 0 // Would need hit/miss tracking to calculate this
    }
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }
}

// Create a singleton instance
export const searchCache = new SearchCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 200 // Increased for better cache performance
})

// Export for testing or advanced usage
export { SearchCache, type SearchCacheOptions, type CacheEntry }

// Cache key generators for common search types
export const cacheKeys = {
  search: (query: string, page: number = 1, limit: number = 20) =>
    `search:${query}:${page}:${limit}`,

  suggestions: (query: string, limit: number = 10) =>
    `suggestions:${query}:${limit}`,

  popularSearches: (limit: number = 5) =>
    `popular:${limit}`
}
