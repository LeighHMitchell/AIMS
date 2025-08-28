"use client";

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2, AlertCircle, Archive, ArchiveRestore, Trash, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
    roleColor?: string;
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
    roleColor?: string;
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
      roleColor?: string;
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
    roleColor?: string;
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

export function CommentsDrawer({ activityId, isOpen, onClose }: CommentsDrawerProps) {
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

  // Helper function to get user initials
  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  // Normalize comment format for backward compatibility
  const normalizeComment = (comment: any): Comment => {
    // Get role using unified utilities
    const role = comment.user_role || comment.author?.role || comment.userRole || 'user';
    
    const normalized = {
      id: comment.id,
      activityId: comment.activity_id || comment.activityId || '',
      author: {
        userId: comment.user_id || comment.userId || '',
        name: comment.user_name || comment.author?.name || comment.userName || 'Unknown User',
        role: getRoleDisplayLabel(role),
        roleColor: '', // No longer needed - using Badge variants
        profilePicture: user?.profilePicture || comment.author?.profilePicture || comment.user_avatar_url?.avatar_url || comment.user_avatar_url || comment.userProfilePicture
      },
      message: comment.message || comment.content || '',
      type: comment.type || 'Feedback' as 'Feedback' | 'Question',
      status: comment.status || 'Open' as 'Open' | 'Resolved',
      createdAt: comment.created_at || comment.createdAt,
      isArchived: comment.is_archived || comment.isArchived || false,
      replies: (comment.replies || []).map((reply: any) => {
        const replyRole = reply.user_role || reply.author?.role || reply.userRole || 'user';
        // Use unified role utilities
        
        return {
          id: reply.id,
          author: {
            userId: reply.user_id || reply.userId || '',
            name: reply.user_name || reply.author?.name || reply.userName || 'Unknown User',
            role: getRoleDisplayLabel(replyRole),
            roleColor: '', // No longer needed - using Badge variants
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
    return normalized;
  };

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
      const params = new URLSearchParams();
      params.append('includeArchived', showArchived ? 'true' : 'false');
      const res = await fetch(`/api/activities/${activityId}/comments?${params}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          // Activity not found, but that's okay - just show no comments
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

    // Find the parent comment to inherit its type
    const parentComment = comments.find(c => c.id === parentCommentId);
    const inheritedType = parentComment?.type || 'Feedback';

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
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
      toast.success('Comment deleted successfully');
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
                    {/* Top Left: Comment Type Badge */}
                    <div className="flex items-start gap-2">
                      <Badge variant={comment.type === 'Question' ? 'default' : 'secondary'} className="text-xs">
                        {comment.type}
                      </Badge>
                      {comment.status === 'Resolved' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                          Resolved
                        </Badge>
                      )}
                      {comment.isArchived && (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                          <Archive className="h-3 w-3 inline mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    
                    {/* Top Right: Date/Time */}
                    <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                  </div>
                  
                  {/* User Info Section */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.profilePicture} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(comment.author?.name || 'Unknown User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{comment.author?.name || 'Unknown User'}</span>
                        <Badge variant={getRoleBadgeVariant(comment.author?.role)} className="text-xs">
                          {comment.author?.role || 'user'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 p-2 rounded space-y-2">
                          <div className="flex items-start justify-between">
                            {/* Top Right: Date/Time */}
                            <p className="text-xs text-gray-400">{formatDate(reply.createdAt)}</p>
                          </div>
                          
                          {/* User Info Section */}
                          <div className="flex items-start gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.author?.profilePicture} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(reply.author?.name || 'Unknown User')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs truncate">{reply.author?.name || 'Unknown User'}</span>
                                <Badge variant={getRoleBadgeVariant(reply.author?.role)} className="text-xs h-4">
                                  {reply.author?.role || 'user'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-600 whitespace-pre-wrap ml-8">{reply.message}</p>
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
                    {/* Delete button - only show for comment author or admin */}
                    {user && (comment.author?.userId === user.id || ['super_user', 'admin'].includes(user.role)) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        <Trash className="h-3 w-3 inline mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                  
                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded">
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
              <Popover open={commentTypeOpen} onOpenChange={setCommentTypeOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
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
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
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
              <p className="text-xs text-gray-500 text-center">Please log in to comment</p>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
} 