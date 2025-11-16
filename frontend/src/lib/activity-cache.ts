/**
 * Simple in-memory cache for activity data to prevent redundant API calls
 * This provides immediate performance improvement without external dependencies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ActivityCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ACTIVITY_TTL = 30 * 1000; // 30 seconds for activity data (shorter for editing)

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    // Use shorter TTL for activity data to ensure freshness during editing
    const actualTTL = ttl || (key.includes('activity:') ? this.ACTIVITY_TTL : this.DEFAULT_TTL);
    const expiresAt = now + actualTTL;
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });

    const ttlType = key.includes('activity:') ? 'activity' : 'general';
    console.log('[Activity Cache] Cached data for key:', key, 'expires at:', new Date(expiresAt).toISOString(), `(TTL: ${ttlType})`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      console.log('[Activity Cache] Cache expired for key:', key);
      this.cache.delete(key);
      return null;
    }

    console.log('[Activity Cache] Cache hit for key:', key);
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    console.log('[Activity Cache] Deleted cache for key:', key);
  }

  clear(): void {
    this.cache.clear();
    console.log('[Activity Cache] Cache cleared');
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log('[Activity Cache] Cleaned up', cleaned, 'expired entries');
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: new Date(entry.timestamp).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        isExpired: Date.now() > entry.expiresAt
      }))
    };
  }
}

// Global cache instance
export const activityCache = new ActivityCache();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    activityCache.cleanup();
  }, 5 * 60 * 1000);
}

// Helper function to create cache keys
export const createActivityCacheKey = (activityId: string, endpoint?: string) => {
  return endpoint ? `activity:${activityId}:${endpoint}` : `activity:${activityId}`;
};

// Cached fetch function for activities
export async function fetchActivityWithCache(activityId: string, useBasic: boolean = false): Promise<any> {
  const endpoint = useBasic ? 'basic' : '';
  const cacheKey = createActivityCacheKey(activityId, endpoint);
  
  // Check cache first
  const cached = activityCache.get(cacheKey);
  if (cached) {
    console.log('[Activity Cache] Returning cached activity:', activityId, useBasic ? '(basic)' : '(full)');
    return cached;
  }

  // Fetch from API with retry (handles brief post-write consistency windows)
  const apiUrl = useBasic ? `/api/activities/${activityId}/basic` : `/api/activities/${activityId}`;
  console.log('[Activity Cache] Fetching activity from API:', apiUrl);
  const maxRetries = 3;
  let attempt = 0;
  let lastError: any = null;
  let data: any = null;
  while (attempt < maxRetries) {
    const response = await fetch(apiUrl);
    if (response.ok) {
      data = await response.json();
      break;
    }
    lastError = new Error(`Failed to fetch activity: ${response.status}`);
    // Only retry on 404/5xx which are likely transient right after writes
    if (response.status === 404 || response.status >= 500) {
      const backoff = 200 * Math.pow(2, attempt); // 200ms, 400ms, 800ms
      await new Promise(res => setTimeout(res, backoff));
      attempt++;
      continue;
    }
    // Other statuses: do not retry
    break;
  }
  if (data == null) {
    throw lastError || new Error('Failed to fetch activity');
  }
  
  // Cache the result
  activityCache.set(cacheKey, data);
  
  return data;
}

// Cached fetch function for basic activity data only
export async function fetchBasicActivityWithCache(activityId: string): Promise<any> {
  return fetchActivityWithCache(activityId, true);
}

// Invalidate cache when activity is updated
export function invalidateActivityCache(activityId: string): void {
  // Clear both the full and basic cache keys to prevent stale data
  const fullCacheKey = createActivityCacheKey(activityId);
  const basicCacheKey = createActivityCacheKey(activityId, 'basic');

  // Delete both cache entries
  activityCache.delete(fullCacheKey);
  activityCache.delete(basicCacheKey);

  console.log('[Activity Cache] Invalidated both full and basic cache for activity:', activityId);
}

// Force immediate cache refresh by clearing all activity-related cache entries
export function forceActivityCacheRefresh(activityId?: string): void {
  if (activityId) {
    // Clear specific activity cache
    invalidateActivityCache(activityId);
  } else {
    // Clear all activity caches (use with caution)
    const cacheStats = activityCache.getStats();
    const activityKeys = cacheStats.keys.filter(key => key.includes('activity:'));

    activityKeys.forEach(key => {
      activityCache.delete(key);
    });

    console.log('[Activity Cache] Force refreshed all activity cache entries');
  }
}
