"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './useUser';
import { apiFetch } from '@/lib/api-fetch';

interface UseOrganizationBookmarksReturn {
  bookmarkedIds: Set<string>;
  isBookmarked: (organizationId: string) => boolean;
  toggleBookmark: (organizationId: string) => Promise<void>;
  addBookmark: (organizationId: string) => Promise<void>;
  removeBookmark: (organizationId: string) => Promise<void>;
  isLoading: boolean;
  isToggling: boolean;
}

export function useOrganizationBookmarks(): UseOrganizationBookmarksReturn {
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
        const response = await apiFetch(`/api/organization-bookmarks?userId=${user.id}`);

        if (response.ok) {
          const data = await response.json();
          setBookmarkedIds(new Set(data.organizationIds || []));
        } else {
          console.error('[useOrganizationBookmarks] Failed to fetch bookmarks');
          setBookmarkedIds(new Set());
        }
      } catch (error) {
        console.error('[useOrganizationBookmarks] Error fetching bookmarks:', error);
        setBookmarkedIds(new Set());
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user?.id]);

  const isBookmarked = useCallback(
    (organizationId: string): boolean => {
      return bookmarkedIds.has(organizationId);
    },
    [bookmarkedIds]
  );

  const addBookmark = useCallback(
    async (organizationId: string): Promise<void> => {
      if (!user?.id) {
        console.error('[useOrganizationBookmarks] Cannot add bookmark: user not logged in');
        return;
      }

      // Optimistic update
      setBookmarkedIds((prev) => new Set(Array.from(prev).concat(organizationId)));

      try {
        const response = await apiFetch('/api/organization-bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, organizationId }),
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            next.delete(organizationId);
            return next;
          });
          console.error('[useOrganizationBookmarks] Failed to add bookmark');
        }
      } catch (error) {
        // Revert optimistic update on error
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(organizationId);
          return next;
        });
        console.error('[useOrganizationBookmarks] Error adding bookmark:', error);
      }
    },
    [user?.id]
  );

  const removeBookmark = useCallback(
    async (organizationId: string): Promise<void> => {
      if (!user?.id) {
        console.error('[useOrganizationBookmarks] Cannot remove bookmark: user not logged in');
        return;
      }

      // Optimistic update
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(organizationId);
        return next;
      });

      try {
        const response = await apiFetch(`/api/organization-bookmarks/${organizationId}?userId=${user.id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          // Revert optimistic update on failure
          setBookmarkedIds((prev) => new Set(Array.from(prev).concat(organizationId)));
          console.error('[useOrganizationBookmarks] Failed to remove bookmark');
        }
      } catch (error) {
        // Revert optimistic update on error
        setBookmarkedIds((prev) => new Set(Array.from(prev).concat(organizationId)));
        console.error('[useOrganizationBookmarks] Error removing bookmark:', error);
      }
    },
    [user?.id]
  );

  const toggleBookmark = useCallback(
    async (organizationId: string): Promise<void> => {
      setIsToggling(true);
      try {
        if (isBookmarked(organizationId)) {
          await removeBookmark(organizationId);
        } else {
          await addBookmark(organizationId);
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
