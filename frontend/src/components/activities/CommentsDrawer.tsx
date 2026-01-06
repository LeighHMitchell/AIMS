'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  Heart,
  MoreHorizontal,
  CornerDownRight,
  HelpCircle,
  MessageCircle,
  Trash,
  Share2
} from 'lucide-react';
import { ActivityComment } from '@/types/comment';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CommentsDrawerProps {
  activityId: string;
  contextSection?: string;
  contextField?: string;
  children?: React.ReactNode;
}

// Available context sections for activity
const ACTIVITY_SECTIONS = [
  { value: 'general', label: 'General' },
  { value: 'basic_info', label: 'Basic Information' },
  { value: 'dates', label: 'Activity Dates' },
  { value: 'finances', label: 'Financial Information' },
  { value: 'locations', label: 'Locations' },
  { value: 'sectors', label: 'Sectors' },
  { value: 'results', label: 'Results & Indicators' },
  { value: 'documents', label: 'Documents' },
  { value: 'transactions', label: 'Transactions' },
];

// Comment type options
const COMMENT_TYPE_OPTIONS = [
  { value: 'Feedback', label: 'Feedback' },
  { value: 'Question', label: 'Question' },
] as const;

// ============================================================================
// COMMENT INPUT COMPONENT
// ============================================================================

function CommentInput({
  placeholder = "What are your thoughts?",
  onSubmit,
  onCancel,
  autoFocus = false,
  showSectionSelect = false,
  selectedSection,
  onSectionChange,
  commentType,
  onTypeChange,
  className,
}: {
  placeholder?: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  showSectionSelect?: boolean;
  selectedSection?: string;
  onSectionChange?: (section: string) => void;
  commentType?: 'Question' | 'Feedback';
  onTypeChange?: (type: 'Question' | 'Feedback') => void;
  className?: string;
}) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(autoFocus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content);
    setContent("");
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-200",
        isFocused
          ? "border-primary/50 ring-4 ring-primary/5 shadow-lg"
          : "border-border/40",
        className
      )}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <UserAvatar
            seed="current-user"
            name="You"
            size="sm"
            className="border border-border/50"
          />
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              autoFocus={autoFocus}
              className="min-h-[60px] border-none bg-transparent p-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/70 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/20 rounded-b-xl">
        <div className="flex items-center gap-2">
          {showSectionSelect && onSectionChange && (
            <Select value={selectedSection} onValueChange={onSectionChange}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_SECTIONS.map((section) => (
                  <SelectItem key={section.value} value={section.value} className="text-xs">
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showSectionSelect && onTypeChange && (
            <Select value={commentType} onValueChange={(v) => onTypeChange(v as 'Question' | 'Feedback')}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-xs">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onCancel}
              className="text-xs h-7"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim()}
            size="sm"
            type="submit"
            className="gap-1.5 transition-all h-7 text-xs"
          >
            {onCancel ? "Reply" : "Post"}
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMMENT ITEM COMPONENT
// ============================================================================

function CommentItem({
  comment,
  isReply = false,
  activeReplyId,
  setActiveReplyId,
  onAddReply,
  onResolve,
  onDelete,
  currentUserId,
  currentUserRole,
}: {
  comment: ActivityComment;
  isReply?: boolean;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  onAddReply: (parentId: string, content: string) => void;
  onResolve?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const replyInputRef = useRef<HTMLDivElement>(null);
  const isReplying = activeReplyId === comment.id;

  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      const textarea = replyInputRef.current.querySelector("textarea");
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }
    }
  }, [isReplying]);

  const canDelete = currentUserId && (
    comment.author?.userId === currentUserId ||
    ['super_user', 'admin'].includes(currentUserRole || '')
  );

  const getTypeIcon = (type: string) => {
    return type === 'Question' ?
      <HelpCircle className="h-3 w-3 text-orange-500" /> :
      <MessageCircle className="h-3 w-3 text-blue-500" />;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "relative group",
        isReply ? "ml-8 pl-4 border-l-2 border-border/40" : "mb-4"
      )}
    >
      <div className="flex gap-3">
        <UserAvatar
          src={comment.author?.profilePicture}
          seed={comment.author?.userId || comment.author?.name || 'unknown'}
          name={comment.author?.name || 'Unknown User'}
          size={isReply ? "xs" : "sm"}
          className="border border-border/50"
        />

        <div className="flex-1 space-y-1">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {comment.author?.name || 'Unknown User'}
              </span>
              {comment.author?.role && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {comment.author.role}
                </span>
              )}
              <div className="flex items-center gap-1">
                {getTypeIcon(comment.type)}
                <span className="text-[10px] text-muted-foreground">{comment.type}</span>
              </div>
              <time className="text-xs text-muted-foreground">
                • {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </time>
              {comment.status === 'Resolved' && (
                <Badge variant="outline" className="h-4 text-[10px] bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Resolved
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {comment.status === 'Open' && onResolve && !isReply && (
                  <DropdownMenuItem onClick={() => onResolve(comment.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                    Mark Resolved
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Share2 className="h-3.5 w-3.5 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Content */}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {comment.message}
          </p>

          {/* Context badge */}
          {comment.contextSection && !isReply && (
            <div className="flex items-center gap-1 pt-1">
              <Badge variant="outline" className="h-4 text-[10px]">
                {ACTIVITY_SECTIONS.find(s => s.value === comment.contextSection)?.label || comment.contextSection}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <nav className="flex items-center gap-4 pt-1">
            <button
              onClick={() => setActiveReplyId(isReplying ? null : comment.id)}
              type="button"
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors",
                isReplying
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reply
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </nav>

          {/* Inline Reply Input */}
          <AnimatePresence>
            {isReplying && (
              <motion.div
                ref={replyInputRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 overflow-hidden"
              >
                <CommentInput
                  autoFocus
                  placeholder={`Reply to ${comment.author?.name || 'Unknown'}...`}
                  onSubmit={(content) => onAddReply(comment.id, content)}
                  onCancel={() => setActiveReplyId(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <section className="mt-3 space-y-3">
          {isExpanded ? (
            <AnimatePresence>
              {comment.replies.map((reply: any) => {
                const safeReply: ActivityComment = {
                  id: reply.id || 'unknown',
                  activityId: comment.activityId || '',
                  author: reply.author || { userId: '', name: 'Unknown User', role: 'user' },
                  message: reply.message || '',
                  createdAt: reply.createdAt || new Date().toISOString(),
                  type: reply.type || comment.type,
                  status: reply.status || 'Open',
                  replies: []
                };

                return (
                  <CommentItem
                    key={safeReply.id}
                    comment={safeReply}
                    isReply={true}
                    activeReplyId={activeReplyId}
                    setActiveReplyId={setActiveReplyId}
                    onAddReply={onAddReply}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                  />
                );
              })}
            </AnimatePresence>
          ) : null}

          {comment.replies.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              type="button"
              className="ml-11 text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <div className="h-[1px] w-4 bg-primary/50 mr-1" />
                  Hide replies
                </>
              ) : (
                <>
                  <CornerDownRight className="h-3 w-3" />
                  Show {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}
        </section>
      )}
    </motion.article>
  );
}

// ============================================================================
// MAIN DRAWER COMPONENT
// ============================================================================

export function CommentsDrawer({
  activityId,
  contextSection,
  contextField,
  children
}: CommentsDrawerProps) {
  const { user } = useUser();

  // Main state
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Form state
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [selectedSection, setSelectedSection] = useState(contextSection || 'general');

  // Fetch comments when drawer opens
  useEffect(() => {
    if (open && activityId && activityId !== '' && activityId !== 'new') {
      fetchComments();
      fetchUnreadCount();
    }
  }, [open, activityId, activeTab, selectedSection]);

  // Auto-refresh every 30 seconds when drawer is open
  useEffect(() => {
    if (!open || !activityId || activityId === '' || activityId === 'new') return;

    const interval = setInterval(() => {
      fetchComments();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [open, activityId, activeTab, selectedSection]);

  const fetchComments = async () => {
    if (!activityId || activityId === '' || activityId === 'new') return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedSection) params.append('section', selectedSection);
      if (activeTab === 'resolved') params.append('status', 'Resolved');
      params.append('includeArchived', 'false');

      const response = await fetch(`/api/activities/${activityId}/comments?${params}`);

      if (!response.ok) {
        if (response.status === 404) {
          setComments([]);
          return;
        }
        throw new Error(`Failed to fetch comments: ${response.statusText}`);
      }

      const data = await response.json();
      let fetchedComments = Array.isArray(data) ? data : [];

      // Transform API response
      fetchedComments = fetchedComments.map((comment: any) => {
        const author = {
          userId: comment.user_id || comment.userId || '',
          name: comment.user_name || comment.userName || 'Unknown User',
          role: comment.user_role || comment.userRole || 'user'
        };

        const replies = (comment.replies || []).map((reply: any) => ({
          ...reply,
          createdAt: reply.created_at || reply.createdAt,
          message: reply.message || reply.content || '',
          author: {
            userId: reply.user_id || reply.userId || '',
            name: reply.user_name || reply.userName || 'Unknown User',
            role: reply.user_role || reply.userRole || 'user'
          }
        }));

        return {
          ...comment,
          activityId: comment.activity_id || activityId,
          createdAt: comment.created_at || comment.createdAt,
          message: comment.message || comment.content || '',
          author,
          replies,
          contextSection: comment.context_section || comment.contextSection,
          contextField: comment.context_field || comment.contextField,
          isArchived: comment.is_archived || comment.isArchived || false,
        };
      });

      // Sort by newest first
      fetchedComments.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setComments(fetchedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!activityId || activityId === '' || activityId === 'new') return;

    try {
      const response = await fetch(`/api/activities/${activityId}/comments/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleSubmitComment = async (content: string) => {
    if (!content.trim() || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: content.trim(),
          type: commentType,
          contextSection: selectedSection,
          contextField: contextField || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      setCommentType('Feedback');
      await fetchComments();
      toast.success('Comment posted');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: string, content: string) => {
    if (!content.trim() || !user) return;

    const parentComment = comments.find(c => c.id === commentId);
    const inheritedType = parentComment?.type || 'Feedback';

    setSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: content.trim(),
          type: inheritedType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }

      setActiveReplyId(null);
      await fetchComments();
      toast.success('Reply posted');
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'resolve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve comment');
      }

      await fetchComments();
      toast.success('Comment resolved');
    } catch (error) {
      console.error('Error resolving comment:', error);
      toast.error('Failed to resolve comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this comment?')) {
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
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    }
  };

  const filteredComments = comments.filter(comment => {
    if (activeTab === 'open' && comment.status !== 'Open') return false;
    if (activeTab === 'resolved' && comment.status !== 'Resolved') return false;
    return true;
  });

  const openCount = comments.filter(c => c.status === 'Open').length;
  const resolvedCount = comments.filter(c => c.status === 'Resolved').length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Comments
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[500px] sm:w-[550px] p-0 flex flex-col !h-auto !max-h-[85vh] !top-[7.5vh] !bottom-auto rounded-l-2xl border-l shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-red-500">
                NEW DRAWER TEST
              </h2>
              <Badge variant="secondary" className="font-normal">
                {comments.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchComments}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </header>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
            <Button
              variant={activeTab === 'open' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('open')}
              className="text-xs h-7"
            >
              Open ({openCount})
            </Button>
            <Button
              variant={activeTab === 'resolved' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('resolved')}
              className="text-xs h-7"
            >
              Resolved ({resolvedCount})
            </Button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && comments.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-sm text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && filteredComments.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1">No comments yet</h3>
                <p className="text-xs text-muted-foreground">
                  {activeTab === 'open' ? 'Start a conversation about this activity.' : 'No resolved comments.'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    activeReplyId={activeReplyId}
                    setActiveReplyId={setActiveReplyId}
                    onAddReply={handleSubmitReply}
                    onResolve={handleResolveComment}
                    onDelete={handleDeleteComment}
                    currentUserId={user?.id}
                    currentUserRole={user?.role}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* New Comment Form */}
          {activeTab === 'open' && (
            <div className="border-t bg-background/95 backdrop-blur-sm p-4">
              <CommentInput
                placeholder="Write a comment..."
                onSubmit={handleSubmitComment}
                showSectionSelect={true}
                selectedSection={selectedSection}
                onSectionChange={setSelectedSection}
                commentType={commentType}
                onTypeChange={setCommentType}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
