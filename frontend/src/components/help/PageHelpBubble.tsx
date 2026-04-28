"use client";

import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageHelp } from './usePageHelp';
import { PageHelpCard } from './PageHelpCard';

interface PageHelpBubbleProps {
  pageSlug: string;
  pageTitle: string;
}

/**
 * Floating help button (bottom-right) that opens a small popover card above
 * itself with page-scoped Q&A and an "Ask about this page" footer. Hidden on
 * screens narrower than md (768px) — desktop-only for v1.
 */
export function PageHelpBubble({ pageSlug, pageTitle }: PageHelpBubbleProps) {
  const [open, setOpen] = useState(false);
  const { items, loading, error } = usePageHelp(pageSlug);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        cardRef.current &&
        !cardRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="hidden md:block">
      {/* Floating card */}
      {open && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={`Help — ${pageTitle}`}
          className="fixed bottom-24 right-6 z-[10004] bg-background border rounded-md shadow-xl overflow-hidden"
        >
          <PageHelpCard
            pageSlug={pageSlug}
            pageTitle={pageTitle}
            items={items}
            loading={loading}
            error={error}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      {/* FAB */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-[10003] h-12 w-12 rounded-full text-white shadow-lg transition-colors flex items-center justify-center',
          open ? 'bg-gunmetal/80 hover:bg-gunmetal/70' : 'bg-gunmetal hover:bg-gunmetal/90'
        )}
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
