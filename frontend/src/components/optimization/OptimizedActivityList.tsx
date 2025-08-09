import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useOptimizedActivities } from '@/hooks/use-optimized-activities';

/**
 * Optimized Activity List Component
 * 
 * Performance improvements:
 * 1. React.memo for preventing unnecessary re-renders
 * 2. useMemo for expensive calculations
 * 3. useCallback for event handlers
 * 4. Optional virtualization for large datasets
 * 5. Optimized search with debouncing
 * 
 * Backward compatible with existing Activity List UI
 */

interface OptimizedActivityListProps {
  children: (props: {
    activities: any[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filters: any;
    pagination: {
      currentPage: number;
      totalPages: number;
      setPage: (page: number) => void;
    };
  }) => React.ReactNode;
  enableVirtualization?: boolean;
  pageSize?: number;
  enableOptimization?: boolean;
  onError?: (error: string) => void;
}

// Memoized Activity Item Component
const ActivityItem = memo(({ activity, style, onClick }: {
  activity: any;
  style?: React.CSSProperties;
  onClick?: (activity: any) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick?.(activity);
  }, [activity, onClick]);

  return (
    <div style={style} onClick={handleClick}>
      {/* Activity item content */}
      <div className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
        <h3 className="font-medium text-gray-900 line-clamp-2">
          {activity.title}
        </h3>
        {activity.partnerId && (
          <p className="text-sm text-gray-500 mt-1">
            {activity.partnerId}
          </p>
        )}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            {activity.created_by_org_acronym || activity.created_by_org_name}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(activity.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

// Virtualized List Component
const VirtualizedActivityList = memo(({ 
  activities, 
  itemHeight = 120,
  height = 600,
  onItemClick 
}: {
  activities: any[];
  itemHeight?: number;
  height?: number;
  onItemClick?: (activity: any) => void;
}) => {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const activity = activities[index];
    return (
      <ActivityItem
        activity={activity}
        style={style}
        onClick={onItemClick}
      />
    );
  }, [activities, onItemClick]);

  return (
    <List
      height={height}
      itemCount={activities.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
});

VirtualizedActivityList.displayName = 'VirtualizedActivityList';

// Main Optimized Activity List Component
export const OptimizedActivityList = memo<OptimizedActivityListProps>(({
  children,
  enableVirtualization = false,
  pageSize = 20,
  enableOptimization = true,
  onError
}) => {
  const {
    activities,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    currentPage,
    totalPages,
    setPage,
    filters
  } = useOptimizedActivities({
    pageSize,
    enableOptimization,
    onError
  });

  // Memoize pagination object to prevent unnecessary re-renders
  const pagination = useMemo(() => ({
    currentPage,
    totalPages,
    setPage
  }), [currentPage, totalPages, setPage]);

  // Memoize the props object to prevent unnecessary re-renders
  const childProps = useMemo(() => ({
    activities,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    pagination
  }), [
    activities,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    pagination
  ]);

  return <>{children(childProps)}</>;
});

OptimizedActivityList.displayName = 'OptimizedActivityList';

// Performance Metrics Display Component
export const PerformanceMetrics = memo(({ 
  metrics 
}: { 
  metrics?: { lastQueryTime: number; averageQueryTime: number } 
}) => {
  if (!metrics || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">
      <div>Last query: {metrics.lastQueryTime}ms</div>
      <div>Average: {Math.round(metrics.averageQueryTime)}ms</div>
    </div>
  );
});

PerformanceMetrics.displayName = 'PerformanceMetrics';

// HOC for easy integration with existing components
export function withOptimizedActivities<P extends object>(
  Component: React.ComponentType<P & {
    activities: any[];
    loading: boolean;
    error: string | null;
  }>
) {
  const WrappedComponent = memo((props: P & {
    enableOptimization?: boolean;
    pageSize?: number;
  }) => {
    const { enableOptimization = true, pageSize = 20, ...restProps } = props;

    return (
      <OptimizedActivityList
        enableOptimization={enableOptimization}
        pageSize={pageSize}
      >
        {({ activities, loading, error }) => (
          <Component
            {...(restProps as P)}
            activities={activities}
            loading={loading}
            error={error}
          />
        )}
      </OptimizedActivityList>
    );
  });

  WrappedComponent.displayName = `withOptimizedActivities(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default OptimizedActivityList;