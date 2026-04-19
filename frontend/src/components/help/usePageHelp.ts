"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

export interface PageHelpItem {
  id: string;
  page_slug: string;
  question: string;
  answer: string;
  display_order: number;
  updated_at: string;
}

interface CacheEntry {
  data: PageHelpItem[];
  ts: number;
}

// Per-slug cache kept in module scope so navigation between pages doesn't
// refetch unnecessarily. Short TTL so edits in the admin UI show up quickly.
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export interface UsePageHelpResult {
  items: PageHelpItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePageHelp(slug: string | null): UsePageHelpResult {
  const [items, setItems] = useState<PageHelpItem[]>(() => {
    if (!slug) return [];
    const cached = CACHE.get(slug);
    return cached && Date.now() - cached.ts < TTL_MS ? cached.data : [];
  });
  const [loading, setLoading] = useState<boolean>(!!slug);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!slug) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const cached = CACHE.get(slug);
    if (cached && Date.now() - cached.ts < TTL_MS && nonce === 0) {
      setItems(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await apiFetch(`/api/page-help?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const data: PageHelpItem[] = json?.data ?? [];
        if (!cancelled) {
          CACHE.set(slug, { data, ts: Date.now() });
          setItems(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load help content');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, nonce]);

  return {
    items,
    loading,
    error,
    refetch: () => {
      if (slug) CACHE.delete(slug);
      setNonce((n) => n + 1);
    },
  };
}
