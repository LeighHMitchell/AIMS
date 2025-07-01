"use client";

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  author: {
    userId: string;
    name: string;
    role: string;
  };
  message: string;
  createdAt: string;
  resolved?: boolean;
  type?: 'Question' | 'Feedback';
}

interface CommentsDrawerProps {
  activityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({ activityId, isOpen, onClose }: CommentsDrawerProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activityId) {
      fetchComments();
    }
  }, [isOpen, activityId]);

  const fetchComments = async () => {
    if (!activityId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`);
      
      if (!res.ok) {
        if (res.status === 404) {
          // Activity not found, but that's okay - just show no comments
          setComments([]);
          return;
        }
        throw new Error(`Failed to fetch comments: ${res.statusText}`);
      }
      
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !activityId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: newComment,
          type: 'Feedback',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add comment');
      }
      
      const updatedComments = await res.json();
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Comments</h2>
            {comments.length > 0 && (
              <span className="text-sm text-gray-500">({comments.length})</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-64px)]">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{comment.author.name}</p>
                      <p className="text-xs text-gray-500">{comment.author.role}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          {/* New Comment Form */}
          <div className="border-t p-4 space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a comment..."
              className="min-h-[80px] resize-none"
              disabled={submitting || !user}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setNewComment('')}
                disabled={!newComment.trim() || submitting}
              >
                Clear
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting || !user}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                Post
              </Button>
            </div>
            {!user && (
              <p className="text-xs text-gray-500 text-center">Please log in to comment</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 