import { useState, useEffect, useCallback } from 'react';
import { LikeUser } from '@/components/ui/native-likes-counter';

interface UseLikesOptions {
  entityType: 'activity' | 'organization';
  entityId: string;
  userId?: string | null;
  initialCount?: number;
}

interface UseLikesReturn {
  count: number;
  users: LikeUser[];
  isLiked: boolean;
  hasMore: boolean;
  isLoading: boolean;
  isToggling: boolean;
  toggleLike: () => Promise<void>;
  loadMore: () => Promise<LikeUser[]>;
}

export function useEntityLikes({
  entityType,
  entityId,
  userId,
  initialCount = 0,
}: UseLikesOptions): UseLikesReturn {
  const [count, setCount] = useState(initialCount);
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [offset, setOffset] = useState(0);

  const apiBasePath = entityType === 'activity'
    ? `/api/activities/${entityId}/likes`
    : `/api/organizations/${entityId}/likes`;

  // Fetch initial likes data
  const fetchLikes = useCallback(async () => {
    if (!entityId) return;

    try {
      setIsLoading(true);
      const url = new URL(apiBasePath, window.location.origin);
      if (userId) {
        url.searchParams.set('userId', userId);
      }
      url.searchParams.set('limit', '5');
      url.searchParams.set('offset', '0');

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setCount(data.count);
        setUsers(data.users);
        setIsLiked(data.isLiked);
        setHasMore(data.hasMore);
        setOffset(data.users.length);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiBasePath, entityId, userId]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!userId || isToggling) return;

    // Optimistic update
    const previousCount = count;
    const previousIsLiked = isLiked;

    setIsLiked(!isLiked);
    setCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsToggling(true);

    try {
      const response = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        // Rollback on error
        setIsLiked(previousIsLiked);
        setCount(previousCount);
        console.error('Failed to toggle like');
      } else {
        const data = await response.json();
        setCount(data.likesCount);
        setIsLiked(data.isLiked);
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(previousIsLiked);
      setCount(previousCount);
      console.error('Error toggling like:', error);
    } finally {
      setIsToggling(false);
    }
  }, [apiBasePath, userId, isLiked, count, isToggling]);

  // Load more users
  const loadMore = useCallback(async (): Promise<LikeUser[]> => {
    if (!hasMore) return [];

    try {
      const url = new URL(apiBasePath, window.location.origin);
      if (userId) {
        url.searchParams.set('userId', userId);
      }
      url.searchParams.set('limit', '10');
      url.searchParams.set('offset', offset.toString());

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const newUsers = data.users;
        setUsers(prev => [...prev, ...newUsers]);
        setHasMore(data.hasMore);
        setOffset(prev => prev + newUsers.length);
        return newUsers;
      }
    } catch (error) {
      console.error('Error loading more users:', error);
    }
    return [];
  }, [apiBasePath, userId, offset, hasMore]);

  return {
    count,
    users,
    isLiked,
    hasMore,
    isLoading,
    isToggling,
    toggleLike,
    loadMore,
  };
}
