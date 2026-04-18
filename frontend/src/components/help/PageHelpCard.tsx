"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Pencil, Send, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { HelpMarkdown } from '@/lib/help-markdown';
import { AskQuestionModal } from '@/components/faq/AskQuestionModal';
import { useUser } from '@/hooks/useUser';
import { USER_ROLES } from '@/types/user';
import type { PageHelpItem } from './usePageHelp';

interface PageHelpCardProps {
  pageSlug: string;
  pageTitle: string;
  items: PageHelpItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

/**
 * Inner contents of the help popover: header, accordion list of Q&A,
 * and the "Ask about this page" footer CTA.
 */
export function PageHelpCard({
  pageSlug,
  pageTitle,
  items,
  loading,
  error,
  onClose,
}: PageHelpCardProps) {
  const { user } = useUser();
  const isSuperUser = user?.role === USER_ROLES.SUPER_USER;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fullFormOpen, setFullFormOpen] = useState(false);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (!user?.id) {
      toast.error('Please log in to submit a question.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/faq/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          question: question.trim(),
          context: null,
          tags: [],
          sourcePageSlug: pageSlug,
          sourcePageTitle: pageTitle,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      toast.success('Thanks — your question has been submitted.');
      setQuestion('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-[360px] max-w-[90vw] max-h-[70vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-surface-muted rounded-t-md">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-body font-semibold">{pageTitle}</h3>
        </div>
        <p className="text-helper text-muted-foreground mt-0.5">About this page</p>
      </div>

      {/* Body: scrollable list */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-body text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading…
          </div>
        )}

        {error && !loading && (
          <div className="px-3 py-4 text-body text-destructive">
            Couldn’t load help: {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="px-3 py-6 text-body text-muted-foreground text-center">
            No help content yet for this page. Have a question? Ask below.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="divide-y">
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <li key={item.id}>
                  <div className="flex items-start">
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="flex-1 flex items-start gap-2 text-left px-3 py-2.5 hover:bg-surface-muted rounded transition-colors"
                      aria-expanded={expanded}
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0 transition-transform',
                          expanded && 'rotate-180'
                        )}
                      />
                      <span className="text-body font-medium leading-snug">{item.question}</span>
                    </button>
                    {isSuperUser && (
                      <Link
                        href={`/admin?tab=page-help&edit=${item.id}`}
                        onClick={onClose}
                        className="p-2 mr-1 mt-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-muted"
                        title="Edit in admin"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 pl-9 text-body text-muted-foreground">
                      <HelpMarkdown source={item.answer} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: Ask a question */}
      <div className="border-t px-3 py-3 bg-surface-muted/50 rounded-b-md">
        <form onSubmit={handleQuickSubmit} className="space-y-2">
          <label className="block text-helper font-medium text-muted-foreground">
            Ask about this page
          </label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question…"
            rows={2}
            className="resize-none text-body"
            maxLength={1000}
            disabled={submitting}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFullFormOpen(true)}
              className="text-helper text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Open full form <ExternalLink className="h-3 w-3" />
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={!question.trim() || submitting}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </form>
      </div>

      <AskQuestionModal
        isOpen={fullFormOpen}
        onClose={() => setFullFormOpen(false)}
        sourcePageSlug={pageSlug}
        sourcePageTitle={pageTitle}
      />
    </div>
  );
}
