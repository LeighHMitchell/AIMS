/**
 * React hook for managing activity cache
 * Provides a clean interface for components to use cached activity data
 */

import { useCallback, useEffect } from 'react';
import { fetchActivityWithCache, invalidateActivityCache, activityCache } from '@/lib/activity-cache';

export function useActivityCache(activityId?: string) {
  // Preload activity data into cache
  const preloadActivity = useCallback(async (id: string) => {
    try {
      await fetchActivityWithCache(id);
      console.log('[Activity Cache Hook] Preloaded activity:', id);
    } catch (error) {
      console.warn('[Activity Cache Hook] Failed to preload activity:', id, error);
    }
  }, []);

  // Get cached activity data
  const getCachedActivity = useCallback((id: string) => {
    return activityCache.get(`activity:${id}`);
  }, []);

  // Invalidate activity cache
  const invalidateActivity = useCallback((id: string) => {
    invalidateActivityCache(id);
  }, []);

  // Check if activity is cached
  const isActivityCached = useCallback((id: string) => {
    return activityCache.has(`activity:${id}`);
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return activityCache.getStats();
  }, []);

  // Auto-preload current activity if provided
  useEffect(() => {
    if (activityId && !isActivityCached(activityId)) {
      preloadActivity(activityId);
    }
  }, [activityId, preloadActivity, isActivityCached]);

  return {
    fetchWithCache: fetchActivityWithCache,
    preloadActivity,
    getCachedActivity,
    invalidateActivity,
    isActivityCached,
    getCacheStats
  };
}

// Hook for batch cache operations
export function useActivityCacheBatch() {
  // Preload multiple activities
  const preloadActivities = useCallback(async (activityIds: string[]) => {
    console.log('[Activity Cache Batch] Preloading', activityIds.length, 'activities');
    
    const promises = activityIds.map(id => 
      fetchActivityWithCache(id).catch(error => {
        console.warn('[Activity Cache Batch] Failed to preload activity:', id, error);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r !== null).length;
    
    console.log('[Activity Cache Batch] Successfully preloaded', successful, 'of', activityIds.length, 'activities');
    return successful;
  }, []);

  // Invalidate multiple activities
  const invalidateActivities = useCallback((activityIds: string[]) => {
    activityIds.forEach(id => invalidateActivityCache(id));
    console.log('[Activity Cache Batch] Invalidated', activityIds.length, 'activities');
  }, []);

  return {
    preloadActivities,
    invalidateActivities
  };
}
