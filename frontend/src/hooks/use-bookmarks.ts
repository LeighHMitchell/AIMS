"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './useUser';

interface UseBookmarksReturn {
  bookmarkedIds: Set<string>;
  isBookmarked: (activityId: string) => boolean;
  toggleBookmark: (activityId: string) => Promise<void>;
  addBookmark: (activityId: string) => Promise<void>;
  removeBookmark: (activityId: string) => Promise<void>;
  isLoading: boolean;
  isToggling: boolean;
}

export function useBookmarks(): UseBookmarksReturn {
  const { user } = useUser();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch bookmarks on mount and when user changes
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user?.id) {
        setBookmarkedIds(new Set());
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/bookmarks?userId=${user.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setBookmarkedIds(new Set(data.activityIds || []));
        } else {
          console.error('[useBookmarks] Failed to fetch bookmarks');
          setBookmarkedIds(new Set());
        }
      } catch (error) {
        console.error('[useBookmarks] Error fetching bookmarks:', error);
        setBookmarkedIds(new Set());
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user?.id]);

  const isBookmarked = useCallback(
    (activityId: string): boolean => {
      return bookmarkedIds.has(activityId);
    },
    [bookmarkedIds]
  );

  const addBookmark = useCallback(
    async (activityId: string): Promise<void> => {
      if (!user?.id) {
        console.error('[useBookmarks] Cannot add bookmark: user not logged in');
        return;
      }

      // Optimistic update
      setBookmarkedIds((prev) => new Set([...prev, activityId]));

      try {
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, activityId }),
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            next.delete(activityId);
            return next;
          });
          console.error('[useBookmarks] Failed to add bookmark');
        }
      } catch (error) {
        // Revert optimistic update on error
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
        console.error('[useBookmarks] Error adding bookmark:', error);
      }
    },
    [user?.id]
  );

  const removeBookmark = useCallback(
    async (activityId: string): Promise<void> => {
      if (!user?.id) {
        console.error('[useBookmarks] Cannot remove bookmark: user not logged in');
        return;
      }

      // Optimistic update
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });

      try {
        const response = await fetch(
          `/api/bookmarks/${activityId}?userId=${user.id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          // Revert optimistic update on failure
          setBookmarkedIds((prev) => new Set([...prev, activityId]));
          console.error('[useBookmarks] Failed to remove bookmark');
        }
      } catch (error) {
        // Revert optimistic update on error
        setBookmarkedIds((prev) => new Set([...prev, activityId]));
        console.error('[useBookmarks] Error removing bookmark:', error);
      }
    },
    [user?.id]
  );

  const toggleBookmark = useCallback(
    async (activityId: string): Promise<void> => {
      setIsToggling(true);
      try {
        if (isBookmarked(activityId)) {
          await removeBookmark(activityId);
        } else {
          await addBookmark(activityId);
        }
      } finally {
        setIsToggling(false);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  return {
    bookmarkedIds,
    isBookmarked,
    toggleBookmark,
    addBookmark,
    removeBookmark,
    isLoading,
    isToggling,
  };
}
