"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';

export interface BookmarkEntry {
  id: string;
  document_url: string;
  document_title: string | null;
  document_format: string | null;
  added_by_name?: string | null;
  created_at: string;
}

export function useDocumentBookmarks() {
  const { user } = useUser();
  const [personalBookmarks, setPersonalBookmarks] = useState<BookmarkEntry[]>([]);
  const [readingRoomBookmarks, setReadingRoomBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const personalUrls = new Set(personalBookmarks.map(b => b.document_url));
  const readingRoomUrls = new Set(readingRoomBookmarks.map(b => b.document_url));

  // Get org ID from the user object (could be camelCase or snake_case)
  const organizationId = user?.organizationId || (user as any)?.organization_id || null;
  const userName = user?.name || user?.email || 'Unknown';

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<Response>[] = [
        apiFetch('/api/library/bookmarks?scope=personal'),
      ];
      if (organizationId) {
        promises.push(apiFetch(`/api/library/bookmarks?scope=reading_room&organization_id=${organizationId}`));
      }

      const results = await Promise.all(promises);

      if (results[0].ok) {
        const data = await results[0].json();
        setPersonalBookmarks(data.bookmarks || []);
      }
      if (results[1]?.ok) {
        const data = await results[1].json();
        setReadingRoomBookmarks(data.bookmarks || []);
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const isPersonalBookmarked = useCallback(
    (url: string) => personalUrls.has(url),
    [personalBookmarks]
  );

  const isReadingRoomBookmarked = useCallback(
    (url: string) => readingRoomUrls.has(url),
    [readingRoomBookmarks]
  );

  const togglePersonalBookmark = useCallback(
    async (doc: { url: string; title: string; format: string }) => {
      const isBookmarked = personalUrls.has(doc.url);

      try {
        if (isBookmarked) {
          const res = await apiFetch('/api/library/bookmarks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: 'personal', document_url: doc.url }),
          });
          if (!res.ok) throw new Error('Failed to remove bookmark');
          setPersonalBookmarks(prev => prev.filter(b => b.document_url !== doc.url));
          toast.success('Removed from My Library');
        } else {
          const res = await apiFetch('/api/library/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: 'personal',
              document_url: doc.url,
              document_title: doc.title,
              document_format: doc.format,
            }),
          });
          if (!res.ok) throw new Error('Failed to add bookmark');
          setPersonalBookmarks(prev => [
            {
              id: 'temp-' + Date.now(),
              document_url: doc.url,
              document_title: doc.title,
              document_format: doc.format,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
          toast.success('Saved to My Library');
        }
      } catch (err) {
        console.error('Error toggling personal bookmark:', err);
        toast.error('Failed to update bookmark');
      }
    },
    [personalBookmarks]
  );

  const toggleReadingRoomBookmark = useCallback(
    async (doc: { url: string; title: string; format: string }) => {
      const isBookmarked = readingRoomUrls.has(doc.url);

      try {
        if (isBookmarked) {
          const res = await apiFetch('/api/library/bookmarks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: 'reading_room',
              document_url: doc.url,
              organization_id: organizationId,
            }),
          });
          if (!res.ok) throw new Error('Failed to remove bookmark');
          setReadingRoomBookmarks(prev => prev.filter(b => b.document_url !== doc.url));
          toast.success('Removed from Reading Room');
        } else {
          const res = await apiFetch('/api/library/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scope: 'reading_room',
              document_url: doc.url,
              document_title: doc.title,
              document_format: doc.format,
              organization_id: organizationId,
              added_by_name: userName,
            }),
          });
          if (!res.ok) throw new Error('Failed to add bookmark');
          setReadingRoomBookmarks(prev => [
            {
              id: 'temp-' + Date.now(),
              document_url: doc.url,
              document_title: doc.title,
              document_format: doc.format,
              added_by_name: userName,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
          toast.success('Added to Reading Room');
        }
      } catch (err) {
        console.error('Error toggling reading room bookmark:', err);
        toast.error('Failed to update bookmark');
      }
    },
    [readingRoomBookmarks, organizationId, userName]
  );

  return {
    personalBookmarks,
    readingRoomBookmarks,
    personalUrls,
    readingRoomUrls,
    loading,
    isPersonalBookmarked,
    isReadingRoomBookmarked,
    togglePersonalBookmark,
    toggleReadingRoomBookmark,
    refreshBookmarks: fetchBookmarks,
  };
}
