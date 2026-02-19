"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';
import { FAQRatingSummary, RatingType } from '@/types/faq-enhanced';
import { cn } from '@/lib/utils';
import { LoadingText } from '@/components/ui/loading-text';
import { apiFetch } from '@/lib/api-fetch';

interface FAQRatingButtonsProps {
  faqId: string;
  ratingType: RatingType;
  label: string;
}

export function FAQRatingButtons({ faqId, ratingType, label }: FAQRatingButtonsProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<FAQRatingSummary | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingRating, setPendingRating] = useState<boolean | null>(null);

  // Fetch current ratings
  const fetchRatings = async () => {
    try {
      setLoading(true);
      const url = user?.id
        ? `/api/faq/${faqId}/ratings?userId=${user.id}`
        : `/api/faq/${faqId}/ratings`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.data);
      }
    } catch (error) {
      console.error('[FAQRatingButtons] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [faqId, user?.id]);

  // Get current user rating for this type
  const getUserRating = (): boolean | undefined => {
    if (!summary?.userRating) return undefined;
    return ratingType === 'question_helpful'
      ? summary.userRating.questionHelpful
      : summary.userRating.answerHelpful;
  };

  // Get counts for this rating type
  const getCounts = () => {
    if (!summary) return { positive: 0, negative: 0 };
    return ratingType === 'question_helpful'
      ? summary.questionHelpful
      : summary.answerHelpful;
  };

  // Submit rating
  const submitRating = async (isPositive: boolean, withComment = false) => {
    if (!user?.id) {
      toast.error('Please log in to rate');
      return;
    }

    if (withComment) {
      setPendingRating(isPositive);
      setCommentOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/faq/${faqId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ratingType,
          isPositive,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Thanks for your feedback!');
        setComment('');
        setCommentOpen(false);
        setPendingRating(null);
        fetchRatings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('[FAQRatingButtons] Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (pendingRating !== null) {
      await submitRating(pendingRating, false);
    }
  };

  const userRating = getUserRating();
  const counts = getCounts();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <LoadingText>Loading...</LoadingText>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="flex items-center gap-3">
        {/* Thumbs Up */}
        <Button
          variant="outline"
          size="sm"
          disabled={submitting || !user}
          onClick={() => submitRating(true)}
          className={cn(
            'flex items-center gap-2',
            userRating === true && 'bg-green-50 border-green-300 text-green-700'
          )}
        >
          <ThumbsUp className={cn('h-4 w-4', userRating === true && 'fill-green-500')} />
          <span>{counts.positive}</span>
        </Button>

        {/* Thumbs Down */}
        <Button
          variant="outline"
          size="sm"
          disabled={submitting || !user}
          onClick={() => submitRating(false)}
          className={cn(
            'flex items-center gap-2',
            userRating === false && 'bg-red-50 border-red-300 text-red-700'
          )}
        >
          <ThumbsDown className={cn('h-4 w-4', userRating === false && 'fill-red-500')} />
          <span>{counts.negative}</span>
        </Button>

        {/* Leave feedback option */}
        <Popover open={commentOpen} onOpenChange={setCommentOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-500">
              Leave feedback...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <p className="text-sm font-medium">Share your feedback</p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRating(true)}
                  className={cn(pendingRating === true && 'bg-green-50 border-green-300')}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRating(false)}
                  className={cn(pendingRating === false && 'bg-red-50 border-red-300')}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Tell us more..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCommentOpen(false);
                    setPendingRating(null);
                    setComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={pendingRating === null || submitting}
                  onClick={handleCommentSubmit}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!user && (
        <p className="text-xs text-gray-400">Log in to rate this FAQ</p>
      )}
    </div>
  );
}

// Combined ratings for both question and answer
export function FAQRatingsSection({ faqId }: { faqId: string }) {
  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <FAQRatingButtons
        faqId={faqId}
        ratingType="question_helpful"
        label="Was this question helpful?"
      />
      <FAQRatingButtons
        faqId={faqId}
        ratingType="answer_helpful"
        label="Was this answer helpful?"
      />
    </div>
  );
}
