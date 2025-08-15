'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { getOptimizedApiClient } from '@/lib/optimized-api-client';
import ActivityCardWithSDG from './ActivityCardWithSDG';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
  sdg_goals?: Array<{ goal_number: number; goal_title: string }>;
  organizations?: Array<{ name: string; acronym?: string }>;
}

interface OptimizedActivityListProps {
  initialPageSize?: number;
  maxItems?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
}

const ITEM_HEIGHT = 200; // Approximate height of each activity card
const CONTAINER_HEIGHT = 600; // Height of the scrollable container

export function OptimizedActivityList({
  initialPageSize = 20,
  maxItems = 1000,
  showSearch = true,
  showFilters = true,
  className = '',
}: OptimizedActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    organization: '',
    dateRange: '',
  });

  const apiClient = getOptimizedApiClient();

  // Optimized search function
  const searchActivities = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const result = await apiClient.fetchList<Activity>('activities', {
        page: 1,
        pageSize: initialPageSize,
        filters: {
          ...filters,
          search: query,
        },
        orderBy: { column: 'created_at', ascending: false },
        select: 'id,title,description,status,start_date,end_date,budget,currency,sdg_goals,organizations',
      });

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }, [apiClient, initialPageSize, filters]);

  // Enhanced search hook
  const {
    query,
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    updateQuery,
    clearSearch,
  } = useOptimizedSearch(searchActivities, {
    debounceMs: 300,
    minSearchLength: 2,
    enableCache: true,
  });

  // Load initial activities
  const loadActivities = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await apiClient.fetchList<Activity>('activities', {
        page,
        pageSize: initialPageSize,
        filters,
        orderBy: { column: 'created_at', ascending: false },
        select: 'id,title,description,status,start_date,end_date,budget,currency,sdg_goals,organizations',
      });

      if (append) {
        setActivities(prev => [...prev, ...result.data]);
      } else {
        setActivities(result.data);
      }

      setTotalCount(result.total);
      setHasMore(result.hasMore && activities.length < maxItems);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [apiClient, initialPageSize, filters, isLoadingMore, activities.length, maxItems]);

  // Load more activities
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadActivities(currentPage + 1, true);
    }
  }, [hasMore, isLoadingMore, currentPage, loadActivities]);

  // Virtual scroll setup
  const displayActivities = searchResults?.data || activities;
  const virtualScroll = useVirtualScroll(displayActivities, {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 3,
  });

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    clearSearch();
    loadActivities(1, false);
  }, [clearSearch, loadActivities]);

  // Load initial data
  useEffect(() => {
    loadActivities(1, false);
  }, [loadActivities]);

  // Reload when filters change
  useEffect(() => {
    if (currentPage === 1) {
      loadActivities(1, false);
    }
  }, [filters, loadActivities, currentPage]);

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const { scrollTop, totalHeight } = virtualScroll;
    const scrollPercentage = scrollTop / (totalHeight - CONTAINER_HEIGHT);
    
    if (scrollPercentage > 0.8 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [virtualScroll.scrollTop, virtualScroll.totalHeight, hasMore, isLoadingMore, loadMore]);

  // Render activity card
  const renderActivityCard = useCallback((activity: Activity, index: number) => (
    <div
      key={activity.id}
      className="mb-4"
      style={{
        height: ITEM_HEIGHT,
        transform: `translateY(${index * ITEM_HEIGHT}px)`,
      }}
    >
      <ActivityCardWithSDG 
        activity={activity} 
        showSDGs={true}
        maxSDGDisplay={3}
      />
    </div>
  ), []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search activities..."
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {showFilters && (
          <div className="flex gap-2">
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoadingMore}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {searchResults ? (
          `Found ${searchResults.total} activities`
        ) : (
          `Showing ${activities.length} of ${totalCount} activities`
        )}
        {hasMore && !searchResults && ` (scroll to load more)`}
      </div>

      {/* Error Display */}
      {searchError && (
        <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
          {searchError}
        </div>
      )}

      {/* Virtual Scrolled List */}
      <div
        ref={virtualScroll.containerRef}
        className="border rounded-lg overflow-auto"
        style={{ height: CONTAINER_HEIGHT }}
      >
        <div style={{ height: virtualScroll.totalHeight, position: 'relative' }}>
          {virtualScroll.virtualItems.map((virtualItem) => {
            const activity = displayActivities[virtualItem.index];
            if (!activity) return null;

            return (
              <div
                key={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: virtualItem.offsetTop,
                  height: virtualItem.size,
                  width: '100%',
                }}
              >
                {renderActivityCard(activity, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading States */}
      {(isSearching || isLoadingMore) && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button (fallback) */}
      {hasMore && !isLoadingMore && !searchResults && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline">
            Load More Activities
          </Button>
        </div>
      )}
    </div>
  );
} 