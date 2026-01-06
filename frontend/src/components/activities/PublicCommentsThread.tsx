"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CornerDownRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { PublicComment, formatCommentTimestamp } from "@/types/public-comment";

// ============================================================================
// TYPES
// ============================================================================

interface PublicCommentsThreadProps {
  activityId: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CommentInput({
  placeholder = "What are your thoughts?",
  onSubmit,
  onCancel,
  autoFocus = false,
  className,
  isSubmitting = false,
  currentUser,
}: {
  placeholder?: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
  isSubmitting?: boolean;
  currentUser: { id: string; name: string; avatar?: string; role?: string } | null;
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
    if (!content.trim() || isSubmitting) return;
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

  if (!currentUser) {
    return (
      <div className={cn("rounded-xl border bg-muted/50 p-4 text-center text-sm text-muted-foreground", className)}>
        Sign in to join the discussion
      </div>
    );
  }

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
        <div className="flex gap-4">
          <Avatar className="h-8 w-8 border border-border/50">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              autoFocus={autoFocus}
              disabled={isSubmitting}
              className="min-h-[60px] border-none bg-transparent p-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/70 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-t border-border/30 bg-muted/20 rounded-b-xl">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onCancel}
              className="text-xs h-8"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            size="sm"
            type="button"
            className="gap-2 transition-all h-8 text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {onCancel ? "Reply" : "Post"}
                <Send className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  activeReplyId,
  setActiveReplyId,
  onAddReply,
  onLike,
  onDelete,
  currentUser,
}: {
  comment: PublicComment;
  isReply?: boolean;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  onAddReply: (parentId: string, content: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUser: { id: string; name: string; avatar?: string; role?: string } | null;
}) {
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likes);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const replyInputRef = useRef<HTMLDivElement>(null);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      await onLike(comment.id);
    } catch {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReply = async (content: string) => {
    setIsSubmittingReply(true);
    try {
      await onAddReply(comment.id, content);
      setActiveReplyId(null);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const isReplying = activeReplyId === comment.id;
  const isOwnComment = currentUser?.id === comment.user.id;

  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      const textarea = replyInputRef.current.querySelector("textarea");
      if (textarea) {
        setTimeout(() => textarea.focus(), 100);
      }
    }
  }, [isReplying]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "relative group",
        isReply ? "ml-8 pl-4 border-l-2 border-border/40" : "mb-6"
      )}
    >
      <div className="flex gap-4">
        <Avatar
          className={cn(
            "border border-border/50",
            isReply ? "h-8 w-8" : "h-10 w-10"
          )}
        >
          <AvatarImage
            src={comment.user.avatar}
            alt={`${comment.user.name}'s avatar`}
          />
          <AvatarFallback>
            {comment.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1.5">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {comment.user.name}
              </span>
              {comment.user.role && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {comment.user.role}
                </span>
              )}
              <time className="text-xs text-muted-foreground">
                {formatCommentTimestamp(comment.timestamp)}
              </time>
            </div>
            {isOwnComment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          {/* Content */}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Actions */}
          <nav className="flex items-center gap-4 pt-1">
            <button
              onClick={handleLike}
              type="button"
              disabled={!currentUser || isLiking}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded disabled:opacity-50",
                isLiked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart
                className={cn("h-3.5 w-3.5", isLiked && "fill-current")}
              />
              <span>{likesCount}</span>
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveReplyId(isReplying ? null : comment.id)}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded",
                  isReplying
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Reply
              </button>
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
                className="pt-4 overflow-hidden"
              >
                <CommentInput
                  autoFocus
                  placeholder={`Reply to ${comment.user.name}...`}
                  onSubmit={handleReply}
                  onCancel={() => setActiveReplyId(null)}
                  isSubmitting={isSubmittingReply}
                  currentUser={currentUser}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <section className="mt-4 space-y-4">
          {isExpanded ? (
            <AnimatePresence>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply={true}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  onAddReply={onAddReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  currentUser={currentUser}
                />
              ))}
            </AnimatePresence>
          ) : null}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="ml-12 text-xs font-medium text-primary hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            {isExpanded ? (
              <div className="h-[1px] w-4 bg-primary/50 mr-1" />
            ) : (
              <CornerDownRight className="h-3 w-3" />
            )}
            {isExpanded
              ? "Hide replies"
              : `Show ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
          </button>
        </section>
      )}
    </motion.article>
  );
}

export function PublicCommentsThread({ activityId }: PublicCommentsThreadProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "top">("newest");

  const currentUser = user
    ? {
        id: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "User",
        avatar: user.profilePicture || undefined,
        role: user.role || undefined,
      }
    : null;

  const fetchComments = useCallback(async () => {
    try {
      const url = new URL(`/api/activities/${activityId}/public-comments`, window.location.origin);
      if (currentUser?.id) {
        url.searchParams.set("userId", currentUser.id);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [activityId, currentUser?.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (content: string) => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/public-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          user: currentUser,
        }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      toast.success("Comment posted");
      await fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string, content: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/activities/${activityId}/public-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          parentId,
          user: currentUser,
        }),
      });

      if (!response.ok) throw new Error("Failed to post reply");

      toast.success("Reply posted");
      await fetchComments();
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
      throw error;
    }
  };

  const handleLike = async (commentId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `/api/activities/${activityId}/public-comments/${commentId}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to toggle like");
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
      throw error;
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;

    try {
      const url = new URL(
        `/api/activities/${activityId}/public-comments`,
        window.location.origin
      );
      url.searchParams.set("commentId", commentId);
      url.searchParams.set("userId", currentUser.id);

      const response = await fetch(url.toString(), { method: "DELETE" });

      if (!response.ok) throw new Error("Failed to delete comment");

      toast.success("Comment deleted");
      await fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "top") {
      return b.likes - a.likes;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Discussion
          {comments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setSortBy("newest")}
            className={cn(
              "text-xs",
              sortBy === "newest" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Newest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setSortBy("top")}
            className={cn(
              "text-xs",
              sortBy === "top" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Top
          </Button>
        </div>
      </header>

      {/* Main Input Area */}
      <section>
        <CommentInput
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
          currentUser={currentUser}
        />
      </section>

      {/* Comments List */}
      <section>
        {sortedComments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No comments yet</p>
            <p className="text-sm">Be the first to start the discussion!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sortedComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  activeReplyId={activeReplyId}
                  setActiveReplyId={setActiveReplyId}
                  onAddReply={handleAddReply}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  currentUser={currentUser}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
