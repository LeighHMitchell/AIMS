"use client";

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, AlertCircle, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  activityId: string;
  author: {
    userId: string;
    name: string;
    role: string;
  };
  message: string;
  createdAt: string;
  status: 'Open' | 'Resolved';
  type: 'Question' | 'Feedback';
  isArchived?: boolean;
  archivedBy?: {
    userId: string;
    name: string;
    role: string;
  };
  archivedAt?: string;
  archiveReason?: string;
  replies: Array<{
    id: string;
    author: {
      userId: string;
      name: string;
      role: string;
    };
    message: string;
    createdAt: string;
    type: 'Question' | 'Feedback';
  }>;
  resolvedBy?: {
    userId: string;
    name: string;
    role: string;
  };
  resolvedAt?: string;
  resolutionNote?: string;
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
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState<'Question' | 'Feedback'>('Feedback');
  const [showArchived, setShowArchived] = useState(false);

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
          type: commentType,
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

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user || !activityId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: replyContent,
          type: replyType,
          parentCommentId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add reply');
      }
      
      const updatedComments = await res.json();
      setComments(Array.isArray(updatedComments) ? updatedComments : []);
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply added successfully');
    } catch (err) {
      console.error('Error adding reply:', err);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          commentId,
          action: 'archive',
        }),
      });

      if (response.ok) {
        // Update the comment in the local state
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { 
                  ...comment, 
                  isArchived: true,
                  archivedBy: {
                    userId: user.id,
                    name: user.name,
                    role: user.role,
                  },
                  archivedAt: new Date().toISOString(),
                }
              : comment
          )
        );
        toast.success('Comment archived');
      } else {
        throw new Error('Failed to archive comment');
      }
    } catch (error) {
      console.error('Error archiving comment:', error);
      toast.error('Failed to archive comment');
    }
  };

  const handleUnarchiveComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          commentId,
          action: 'unarchive',
        }),
      });

      if (response.ok) {
        // Update the comment in the local state
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { 
                  ...comment, 
                  isArchived: false,
                  archivedBy: undefined,
                  archivedAt: undefined,
                  archiveReason: undefined,
                }
              : comment
          )
        );
        toast.success('Comment unarchived');
      } else {
        throw new Error('Failed to unarchive comment');
      }
    } catch (error) {
      console.error('Error unarchiving comment:', error);
      toast.error('Failed to unarchive comment');
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
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs"
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Archive className="h-3 w-3 mr-1" />
                  Archived ({comments.filter(c => c.isArchived).length})
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-64px)]">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : comments.filter(comment => showArchived ? comment.isArchived : !comment.isArchived).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {showArchived ? 'No archived comments.' : 'No comments yet. Be the first to comment!'}
              </p>
            ) : (
              comments
                .filter(comment => showArchived ? comment.isArchived : !comment.isArchived)
                .map((comment) => (
                <div key={comment.id} className={`border rounded-lg p-3 space-y-2 ${
                  comment.status === 'Resolved' ? 'bg-gray-50' : ''
                } ${comment.isArchived ? 'bg-gray-100 opacity-75' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-sm">{comment.author.name}</p>
                        <p className="text-xs text-gray-500">{comment.author.role}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${comment.type === 'Question' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {comment.type}
                      </span>
                      {comment.status === 'Resolved' && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Resolved</span>
                      )}
                      {comment.isArchived && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                          <Archive className="h-3 w-3 inline mr-1" />
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 p-2 rounded">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-xs">{reply.author.name}</p>
                              <span className="text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-700">{reply.type}</span>
                            </div>
                            <p className="text-xs text-gray-400">{formatDate(reply.createdAt)}</p>
                          </div>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    {comment.status === 'Open' && !comment.isArchived && (
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Reply
                      </button>
                    )}
                    {user && !comment.isArchived && (
                      <button
                        onClick={() => handleArchiveComment(comment.id)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        <Archive className="h-3 w-3 inline mr-1" />
                        Archive
                      </button>
                    )}
                    {user && comment.isArchived && (
                      <button
                        onClick={() => handleUnarchiveComment(comment.id)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        <ArchiveRestore className="h-3 w-3 inline mr-1" />
                        Unarchive
                      </button>
                    )}
                  </div>
                  
                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded">
                      <div className="flex gap-2">
                        <select
                          value={replyType}
                          onChange={(e) => setReplyType(e.target.value as 'Question' | 'Feedback')}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="Question">Question</option>
                          <option value="Feedback">Feedback</option>
                        </select>
                      </div>
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full text-xs border rounded px-2 py-1 min-h-[60px] resize-none"
                        disabled={submitting}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? 'Sending...' : 'Send Reply'}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="text-xs border px-3 py-1 rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New Comment Form - Only show when not viewing archived comments */}
          {!showArchived && (
            <div className="border-t p-4 space-y-3 pb-24">
            <div className="flex gap-2">
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value as 'Question' | 'Feedback')}
                className="text-sm border rounded px-3 py-2"
              >
                <option value="Question">Question</option>
                <option value="Feedback">Feedback</option>
              </select>
            </div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={commentType === 'Question' ? 'Ask a question...' : 'Leave feedback...'}
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
                Post {commentType}
              </Button>
            </div>
            {!user && (
              <p className="text-xs text-gray-500 text-center">Please log in to comment</p>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
} 