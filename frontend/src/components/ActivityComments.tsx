'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MessageSquare,
  HelpCircle, 
  Send,
  CheckCircle,
  RotateCcw, 
  ChevronDown,
  ChevronUp, 
  Filter,
  AlertCircle,
  Clock,
  User,
  ThumbsUp,
  ThumbsDown,
  Archive
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { ActivityComment, CommentLikes } from '@/types/comment';

interface ActivityCommentsProps {
  activityId: string;
}

export function ActivityComments({ activityId }: ActivityCommentsProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState<'Question' | 'Feedback'>('Feedback');
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'question' | 'feedback'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvingComment, setResolvingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${activityId}/comments`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch comments');
      }
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error(`Failed to load comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setComments([]); // Set empty array to avoid crashes
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          message: newComment,
          type: commentType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }
      
      await fetchComments(); // Refresh comments list
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          message: replyContent,
          type: replyType,
          action: 'reply',
          commentId: parentCommentId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add reply');
      }
      
      await fetchComments(); // Refresh comments list
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error(`Failed to add reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'resolve',
          resolutionNote: resolutionNote || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resolve comment');
      }
      
      await fetchComments();
      setResolutionNote('');
      setResolvingComment(null);
      toast.success('Comment resolved and archived');
    } catch (error: any) {
      console.error('Error resolving comment:', error);
      toast.error(`Failed to resolve comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReopenComment = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'reopen',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reopen comment');
      }
      
      await fetchComments();
      toast.success('Comment reopened from archive');
    } catch (error: any) {
      console.error('Error reopening comment:', error);
      toast.error(`Failed to reopen comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLikeComment = async (commentId: string, likeType: 'thumbs_up' | 'thumbs_down', currentLike: string | null) => {
    if (!user) return;

    // Optimistic update - update UI immediately
    setComments(prevComments => prevComments.map(comment => {
      if (comment.id === commentId) {
        const currentLikes = comment.likes || { thumbsUp: 0, thumbsDown: 0, userLike: null };
        let newLikes = { ...currentLikes };
        
        // Remove previous like if exists
        if (currentLike === 'thumbs_up') {
          newLikes.thumbsUp = Math.max(0, newLikes.thumbsUp - 1);
        } else if (currentLike === 'thumbs_down') {
          newLikes.thumbsDown = Math.max(0, newLikes.thumbsDown - 1);
        }
        
        // Add new like if different from current
        if (currentLike !== likeType) {
          if (likeType === 'thumbs_up') {
            newLikes.thumbsUp = newLikes.thumbsUp + 1;
          } else {
            newLikes.thumbsDown = newLikes.thumbsDown + 1;
          }
          newLikes.userLike = likeType;
        } else {
          // User is removing their like
          newLikes.userLike = null;
        }
        
        return { ...comment, likes: newLikes };
      }
      return comment;
    }));

    try {
      const action = currentLike === likeType ? 'unlike' : 'like';
      
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action,
          likeType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update like');
      }
    } catch (error: any) {
      console.error('Error updating like:', error);
      toast.error(`Failed to update like: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert optimistic update on error
      await fetchComments();
    }
  };

  const handleLikeReply = async (replyId: string, likeType: 'thumbs_up' | 'thumbs_down', currentLike: string | null) => {
    if (!user) return;

    try {
      const action = currentLike === likeType ? 'unlike' : 'like';
      
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          replyId,
          action,
          likeType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update like');
      }
      
      await fetchComments(); // Refresh to get updated like counts
    } catch (error: any) {
      console.error('Error updating like:', error);
      toast.error(`Failed to update like: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Filter and sort comments
  const filteredComments = comments.filter(comment => {
    // Filter by status (tab)
    if (activeTab === 'open' && comment.status !== 'Open') return false;
    if (activeTab === 'resolved' && comment.status !== 'Resolved') return false;
    
    // Filter by type
    if (filterType === 'question' && comment.type !== 'Question') return false;
    if (filterType === 'feedback' && comment.type !== 'Feedback') return false;
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const renderLikeButtons = (likes: CommentLikes, onLike: (type: 'thumbs_up' | 'thumbs_down') => void) => (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={likes.userLike === 'thumbs_up' ? 'default' : 'ghost'}
        onClick={() => onLike('thumbs_up')}
        className="h-6 px-2 text-xs"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        {likes.thumbsUp || 0}
      </Button>
      <Button
        size="sm"
        variant={likes.userLike === 'thumbs_down' ? 'destructive' : 'ghost'}
        onClick={() => onLike('thumbs_down')}
        className="h-6 px-2 text-xs"
      >
        <ThumbsDown className="h-3 w-3 mr-1" />
        {likes.thumbsDown || 0}
      </Button>
    </div>
  );

  const renderComment = (comment: ActivityComment) => {
    const isQuestion = comment.type === 'Question';
    const isResolved = comment.status === 'Resolved';

    return (
      <div key={comment.id} className="space-y-2">
        {/* Main Comment */}
        <div className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {comment.author.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <Badge variant="secondary" className="text-xs">
                      {comment.author.role}
                    </Badge>
                    <Badge 
                  variant={isQuestion ? 'default' : 'secondary'} 
                  className={`text-xs ${isQuestion ? 'bg-blue-100 text-blue-700' : ''}`}
                    >
                      {comment.type}
                    </Badge>
                <span className="text-xs text-gray-500">
                  {comment.createdAt ? formatRelativeTime(comment.createdAt) : 'Unknown date'}
                </span>
                  </div>
              <p className="text-sm text-gray-700 mb-2">{comment.message}</p>
              
              {/* Like buttons - simplified inline */}
              <div className="flex items-center gap-4 text-xs mb-2">
                <button 
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                  onClick={() => handleLikeComment(comment.id, 'thumbs_up', comment.likes?.userLike || null)}
                >
                  <ThumbsUp className={`h-3 w-3 ${comment.likes?.userLike === 'thumbs_up' ? 'fill-blue-600 text-blue-600' : ''}`} />
                  {comment.likes?.thumbsUp || 0}
                </button>
                <button 
                  className="flex items-center gap-1 text-gray-500 hover:text-red-600"
                  onClick={() => handleLikeComment(comment.id, 'thumbs_down', comment.likes?.userLike || null)}
                >
                  <ThumbsDown className={`h-3 w-3 ${comment.likes?.userLike === 'thumbs_down' ? 'fill-red-600 text-red-600' : ''}`} />
                  {comment.likes?.thumbsDown || 0}
                </button>
              </div>
              
              {/* Action buttons - simplified */}
              <div className="flex items-center gap-4">
                <button
                  className="text-blue-600 text-sm font-medium hover:underline"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  Reply
                </button>
                
                {!isResolved ? (
                  <button
                    className="text-gray-600 text-sm font-medium hover:underline"
                    onClick={() => setResolvingComment(resolvingComment === comment.id ? null : comment.id)}
                  >
                    Resolve & Archive
                  </button>
                ) : (
                  <button
                    className="text-gray-600 text-sm font-medium hover:underline"
                    onClick={() => handleReopenComment(comment.id)}
                  >
                    Unarchive
                  </button>
                )}
              </div>
                      </div>
                    </div>
                  </div>
                
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
          <div className="ml-11 space-y-2">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {reply.author.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{reply.author.name}</span>
                      <Badge variant="secondary" className="text-xs">
                            {reply.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                        {reply.createdAt ? formatRelativeTime(reply.createdAt) : 'Unknown date'}
                          </span>
                        </div>
                    <p className="text-sm text-gray-600">{reply.message}</p>
                  </div>
                </div>
                      </div>
                    ))}
                  </div>
                )}
                
        {/* Resolution form */}
        {resolvingComment === comment.id && (
          <div className="ml-11 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Textarea
              placeholder="Add a resolution note (optional)..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={2}
              className="text-sm mb-2"
            />
            <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResolveComment(comment.id)}
                    >
                Resolve & Archive
                    </Button>
                    <Button
                      size="sm"
                variant="outline"
                onClick={() => {
                  setResolvingComment(null);
                  setResolutionNote('');
                }}
              >
                Cancel
                    </Button>
            </div>
          </div>
                  )}
                
                {/* Reply form */}
                {replyingTo === comment.id && (
          <div className="ml-11 space-y-2">
                    <div className="flex gap-2">
                      <Select value={replyType} onValueChange={(v: any) => setReplyType(v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Question">Question</SelectItem>
                          <SelectItem value="Feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim()}
                      >
                        <Send className="h-3 w-3 mr-1" />
                Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
        )}

        {/* Resolved indicator */}
        {isResolved && comment.resolvedBy && (
          <div className="ml-11 p-2 bg-gray-100 border border-gray-200 rounded text-sm">
            <p className="text-gray-800">
              <strong>Resolved by {comment.resolvedBy.name}</strong>
              {comment.resolvedAt && ` on ${new Date(comment.resolvedAt).toLocaleDateString()}`}
            </p>
            {comment.resolutionNote && (
              <p className="text-gray-700 mt-1">{comment.resolutionNote}</p>
                )}
              </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tab Navigation - Simplified */}
      <div className="flex items-center justify-between border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'open' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" />
            Comments ({comments.filter(c => c.status === 'Open').length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'resolved' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Archive className="h-4 w-4 inline mr-1" />
            Archived ({comments.filter(c => c.status === 'Resolved').length})
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="question">Questions</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {activeTab === 'open' && (
          <>
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No open comments yet</p>
                <p className="text-sm">Be the first to leave feedback or ask a question!</p>
              </div>
            ) : (
              filteredComments.map(renderComment)
            )}
          </>
        )}
        
        {activeTab === 'resolved' && (
          <>
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No archived comments yet</p>
                <p className="text-sm">Resolved comments will appear here</p>
              </div>
            ) : (
              filteredComments.map(renderComment)
            )}
          </>
        )}
      </div>

      {/* New Comment Form - Moved to bottom */}
      <div className="border-t border-gray-200 pt-4 space-y-3 flex-shrink-0">
          <div className="flex gap-2">
            <Select value={commentType} onValueChange={(v: any) => setCommentType(v)}>
            <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Question">
                  <HelpCircle className="h-3 w-3 inline mr-1" />
                  Question
                </SelectItem>
                <SelectItem value="Feedback">
                  <MessageSquare className="h-3 w-3 inline mr-1" />
                  Feedback
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Textarea
          placeholder="Leave feedback or comments..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          className="resize-none"
          />
          
          <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-500"
            onClick={() => setNewComment('')}
          >
            Clear
          </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-4 w-4 mr-2" />
              Post {commentType}
            </Button>
          </div>
        </div>
              </div>
  );
} 