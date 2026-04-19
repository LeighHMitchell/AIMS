"use client"

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalFooter } from '@/components/ui/modal-footer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/useUser';
import { HelpCircle, SendIcon, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional — when provided, attaches the page context to the submission so admins see where the question came from. */
  sourcePageSlug?: string;
  sourcePageTitle?: string;
}

export function AskQuestionModal({ isOpen, onClose, sourcePageSlug, sourcePageTitle }: AskQuestionModalProps) {
  const { user } = useUser();
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("Please enter your question.");
      return;
    }

    if (!user?.id) {
      toast.error("Please log in to ask a question.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/faq/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          question: question.trim(),
          context: context.trim() || null,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0),
          sourcePageSlug: sourcePageSlug || null,
          sourcePageTitle: sourcePageTitle || null,
        }),
      });

      if (response.ok) {
        toast.success("Your question has been submitted! A manager will review it and may add it to the FAQ.");

        // Reset form
        setQuestion('');
        setContext('');
        setTags('');
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to submit question');
      }
    } catch (error) {
      console.error('[AskQuestionModal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`There was an error submitting your question: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setQuestion('');
    setContext('');
    setTags('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Ask a Question
          </DialogTitle>
          <DialogDescription>
            Submit a question to be added to the FAQ. Our team will review it and provide an answer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {sourcePageTitle && (
            <div className="rounded-md border bg-surface-muted px-3 py-2 text-helper text-muted-foreground">
              Asking about: <span className="font-medium text-foreground">{sourcePageTitle}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="question">Your Question <RequiredDot /></Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know? Be as specific as possible..."
              required
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide any additional context, such as what you were trying to do when you had this question..."
              rows={2}
              className="resize-none"
            />
            <p className="text-helper text-muted-foreground">
              This helps our team understand the situation better.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., activities, transactions, reporting (comma-separated)"
            />
            <p className="text-helper text-muted-foreground">
              Add relevant tags to help categorize your question.
            </p>
          </div>

          {/* Helpful tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-body text-blue-800">
                <p className="font-medium mb-1">Tips for a good question:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Be specific about what you want to know</li>
                  <li>Include relevant details about your situation</li>
                  <li>Check the existing FAQ first to avoid duplicates</li>
                </ul>
              </div>
            </div>
          </div>

          <ModalFooter
            onCancel={handleClose}
            submitText="Submit Question"
            loadingText="Submitting..."
            isLoading={isSubmitting}
            isDisabled={!question.trim()}
            submitType="submit"
            submitIcon={<SendIcon className="h-4 w-4" />}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
