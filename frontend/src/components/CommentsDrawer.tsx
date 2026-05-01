"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2, AlertCircle, Archive, ArchiveRestore, Trash2, ChevronsUpDown, Check, MessageCircle, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

// Comment type options
const COMMENT_TYPE_OPTIONS = [
  { value: 'Feedback', label: 'Feedback', description: 'General feedback or comment' },
  { value: 'Question', label: 'Question', description: 'Ask a question' },
] as const;

interface Comment {
  id: string;
  activityId: string;
  author: {
    userId: string;
    name: string;
    role: string;
    profilePicture?: string;
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
    profilePicture?: string;
  };
  archivedAt?: string;
  archiveReason?: string;
  replies: Array<{
    id: string;
    author: {
      userId: string;
      name: string;
      role: string;
      profilePicture?: string;
    };
    message: string;
    createdAt: string;
    type: 'Question' | 'Feedback';
  }>;
  resolvedBy?: {
    userId: string;
    name: string;
    role: string;
    profilePicture?: string;
  };
  resolvedAt?: string;
  resolutionNote?: string;
}

interface CommentsDrawerProps {
  activityId: string;
  isOpen: boolean;
  onClose: () => void;
}

function CommentTypeChip({ type }: { type: 'Question' | 'Feedback' }) {
  const isQuestion = type === 'Question';
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-helper px-2 py-0.5 rounded-full border",
        isQuestion
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      )}
    >
      {isQuestion ? <HelpCircle className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
      {type}
    </span>
  );
}

export function CommentsDrawer({ activityId, isOpen, onClose }: CommentsDrawerProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [commentTypeOpen, setCommentTypeOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [showArchived, setShowArchived] = useState(false);

  // Normalize comment format for backward compatibility.
  // IMPORTANT: keep the raw role string in author.role so that role-badge-utils
  // can map it to the correct color (e.g. super_user -> destructive/red).
  const normalizeComment = (comment: any): Comment => {
    const role = comment.user_role || comment.author?.role || comment.userRole || 'user';

    return {
      id: comment.id,
      activityId: comment.activity_id || comment.activityId || '',
      author: {
        userId: comment.user_id || comment.userId || '',
        name: comment.user_name || comment.author?.name || comment.userName || 'Unknown User',
        role,
        profilePicture: user?.profilePicture || comment.author?.profilePicture || comment.user_avatar_url?.avatar_url || comment.user_avatar_url || comment.userProfilePicture
      },
      message: comment.message || comment.content || '',
      type: comment.type || 'Feedback' as 'Feedback' | 'Question',
      status: comment.status || 'Open' as 'Open' | 'Resolved',
      createdAt: comment.created_at || comment.createdAt,
      isArchived: comment.is_archived || comment.isArchived || false,
      replies: (comment.replies || []).map((reply: any) => {
        const replyRole = reply.user_role || reply.author?.role || reply.userRole || 'user';
        return {
          id: reply.id,
          author: {
            userId: reply.user_id || reply.userId || '',
            name: reply.user_name || reply.author?.name || reply.userName || 'Unknown User',
            role: replyRole,
            profilePicture: reply.author?.profilePicture || reply.user_avatar_url?.avatar_url || reply.user_avatar_url || reply.userProfilePicture
          },
          message: reply.message || reply.content || '',
          type: reply.type || 'Feedback' as 'Feedback' | 'Question',
          createdAt: reply.created_at || reply.createdAt
        };
      }),
      resolvedBy: comment.resolved_by_name ? {
        userId: comment.resolved_by_id || '',
        name: comment.resolved_by_name,
        role: 'user',
        profilePicture: comment.resolved_by_avatar_url
      } : undefined,
      resolvedAt: comment.resolved_at || comment.resolvedAt,
      resolutionNote: comment.resolution_note || comment.resolutionNote,
      archivedBy: comment.archived_by_name ? {
        userId: comment.archived_by_id || '',
        name: comment.archived_by_name,
        role: 'user',
        profilePicture: comment.archived_by_avatar_url
      } : undefined,
      archivedAt: comment.archived_at || comment.archivedAt,
      archiveReason: comment.archive_reason || comment.archiveReason
    };
  };

  useEffect(() => {
    if (isOpen && activityId) {
      fetchComments();
    }
  }, [isOpen, activityId, showArchived]);

  const fetchComments = async () => {
    if (!activityId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('includeArchived', showArchived ? 'true' : 'false');
      const res = await apiFetch(`/api/activities/${activityId}/comments?${params}`);

      if (!res.ok) {
        if (res.status === 404) {
          setComments([]);
          return;
        }
        throw new Error(`Failed to fetch comments: ${res.statusText}`);
      }

      const data = await res.json();
      const fetchedComments = Array.isArray(data) ? data.map(normalizeComment) : [];

      setComments(fetchedComments);
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
      const res = await apiFetch(`/api/activities/${activityId}/comments`, {
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
      const normalizedComments = Array.isArray(updatedComments) ? updatedComments.map(normalizeComment) : [];
      setComments(normalizedComments);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user || !activityId) return;

    const parentComment = comments.find(c => c.id === parentCommentId);
    const inheritedType = parentComment?.type || 'Feedback';

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: replyContent,
          type: inheritedType,
          parentCommentId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add reply');
      }

      const updatedComments = await res.json();
      const normalizedComments = Array.isArray(updatedComments) ? updatedComments.map(normalizeComment) : [];
      setComments(normalizedComments);
      setReplyContent('');
      setReplyingTo(null);
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
      const response = await apiFetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'archive',
        }),
      });

      if (response.ok) {
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
      const response = await apiFetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'unarchive',
        }),
      });

      if (response.ok) {
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    if (!(await confirm({ title: 'Delete this comment?', description: 'This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    try {
      const response = await apiFetch(`/api/activities/${activityId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete comment');
      }

      await fetchComments();
      toast('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const visibleComments = comments.filter(comment => showArchived ? comment.isArchived : !comment.isArchived);
  const archivedCount = comments.filter(c => c.isArchived).length;

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 mx-0 mt-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments
              {comments.length > 0 && (
                <span className="text-body text-muted-foreground font-normal">({comments.length})</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 px-6 py-2 border-b">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-helper"
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <Archive className="h-3 w-3 mr-1" />
                  Archived ({archivedCount})
                </>
              )}
            </Button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : visibleComments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showArchived ? 'No archived comments.' : 'No comments yet. Be the first to comment!'}
              </p>
            ) : (
              visibleComments.map((comment) => {
                const canDelete = user && (
                  comment.author?.userId === user.id ||
                  ['super_user', 'admin'].includes(user.role)
                );

                return (
                <div
                  key={comment.id}
                  className={cn(
                    "border rounded-lg p-3 space-y-2",
                    comment.status === 'Resolved' && 'bg-muted',
                    comment.isArchived && 'bg-muted opacity-75'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Top Left: Comment Type chip + status badges */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <CommentTypeChip type={comment.type} />
                      {comment.status === 'Resolved' && (
                        <Badge variant="outline" className="text-helper bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border-[hsl(var(--success-border))]">
                          Resolved
                        </Badge>
                      )}
                      {comment.isArchived && (
                        <Badge variant="outline" className="text-helper bg-muted text-muted-foreground">
                          <Archive className="h-3 w-3 inline mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>

                    {/* Top Right: Date/Time */}
                    <p className="text-helper text-muted-foreground whitespace-nowrap">{formatDate(comment.createdAt)}</p>
                  </div>

                  {/* User Info Section */}
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={comment.author?.profilePicture}
                      seed={comment.author?.userId || comment.author?.name || 'unknown'}
                      name={comment.author?.name || 'Unknown User'}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-body truncate">{comment.author?.name || 'Unknown User'}</span>
                        <Badge variant={getRoleBadgeVariant(comment.author?.role)} className="text-helper">
                          {getRoleDisplayLabel(comment.author?.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-body text-foreground whitespace-pre-wrap">{comment.message}</p>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-2 border-l border-border pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-muted p-2 rounded space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="text-helper text-muted-foreground">{formatDate(reply.createdAt)}</p>
                          </div>

                          <div className="flex items-start gap-2">
                            <UserAvatar
                              src={reply.author?.profilePicture}
                              seed={reply.author?.userId || reply.author?.name || 'unknown'}
                              name={reply.author?.name || 'Unknown User'}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-helper truncate">{reply.author?.name || 'Unknown User'}</span>
                                <Badge variant={getRoleBadgeVariant(reply.author?.role)} className="text-helper h-4">
                                  {getRoleDisplayLabel(reply.author?.role)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <p className="text-helper text-muted-foreground whitespace-pre-wrap ml-8">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons: Reply on left (icon + text), Archive/Delete icon-only on right */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      {comment.status === 'Open' && !comment.isArchived && (
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="flex items-center gap-1.5 text-helper text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Reply
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {user && !comment.isArchived && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleArchiveComment(comment.id)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Archive</TooltipContent>
                        </Tooltip>
                      )}
                      {user && comment.isArchived && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUnarchiveComment(comment.id)}
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unarchive</TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 space-y-2 bg-muted p-3 rounded">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write your reply..."
                        className="min-h-[60px] resize-none"
                        disabled={submitting}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 mr-1" />
                          )}
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );})
            )}
          </div>

          {/* New Comment Form - Only show when not viewing archived comments */}
          {!showArchived && (
            <div className="border-t p-4 space-y-3">
              <div className="flex gap-2">
                <Popover open={commentTypeOpen} onOpenChange={setCommentTypeOpen}>
                  <PopoverTrigger
                    className={cn(
                      "flex h-10 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                    )}
                  >
                    <span className="truncate">
                      {(() => {
                        const selectedOption = COMMENT_TYPE_OPTIONS.find(option => option.value === commentType);
                        return selectedOption ? (
                          <span className="font-medium">{selectedOption.label}</span>
                        ) : (
                          <span className="text-muted-foreground">Select type...</span>
                        );
                      })()}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 shadow-lg border"
                    align="start"
                    sideOffset={4}
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {COMMENT_TYPE_OPTIONS.map((option) => (
                            <CommandItem
                              key={option.value}
                              onSelect={() => {
                                setCommentType(option.value);
                                setCommentTypeOpen(false);
                              }}
                              className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-accent"
                            >
                              <span className="font-medium">{option.label}</span>
                              {commentType === option.value && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                <p className="text-helper text-muted-foreground text-center">Please log in to comment</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </TooltipProvider>
  );
}
