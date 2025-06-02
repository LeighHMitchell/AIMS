import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActivityComment, CommentReply } from '@/types/comment';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Reply,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Download,
  AlertCircle,
  HelpCircle,
  Filter,
  SortAsc,
  Clock,
  RefreshCw,
} from 'lucide-react';

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

  // Function to normalize old comment format to new format
  const normalizeComment = (comment: any): ActivityComment => {
    // Check if it's an old format comment
    if (comment.userId && !comment.author) {
      return {
        id: comment.id,
        activityId: activityId,
        author: {
          userId: comment.userId,
          name: comment.userName || 'Unknown',
          role: comment.userRole || 'user',
        },
        type: comment.type === 'response' ? 'Feedback' : (comment.type || 'Feedback'),
        message: comment.content || comment.message || '',
        createdAt: comment.createdAt,
        replies: [],
        status: 'Open',
        attachments: [],
      };
    }
    
    // For new format, just ensure type is correct
    return {
      ...comment,
      type: comment.type === 'response' ? 'Feedback' : (comment.type || 'Feedback'),
      replies: comment.replies || [],
      status: comment.status || 'Open',
      attachments: comment.attachments || [],
    };
  };

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${activityId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = data.map(normalizeComment);
      setComments(normalizedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
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
          content: newComment,
          type: commentType,
        }),
      });

      if (!res.ok) throw new Error('Failed to add comment');
      
      const updatedComments = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = updatedComments.map(normalizeComment);
      setComments(normalizedComments);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
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
          content: replyContent,
          type: replyType,
          parentCommentId,
        }),
      });

      if (!res.ok) throw new Error('Failed to add reply');
      
      const updatedComments = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = updatedComments.map(normalizeComment);
      setComments(normalizedComments);
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'resolve',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to resolve comment');
      }
      
      await fetchComments();
      toast.success('Comment resolved successfully');
    } catch (error: any) {
      console.error('Error resolving comment:', error);
      toast.error(error.message || 'Failed to resolve comment');
    }
  };

  const handleReopenComment = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'reopen',
        }),
      });

      if (!res.ok) throw new Error('Failed to reopen comment');
      
      await fetchComments();
      toast.success('Comment reopened successfully');
    } catch (error) {
      console.error('Error reopening comment:', error);
      toast.error('Failed to reopen comment');
    }
  };

  const toggleExpandComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Filter and sort comments
  const filteredComments = comments.filter(comment => {
    if (activeTab === 'open' && comment.status === 'Resolved') return false;
    if (activeTab === 'resolved' && comment.status !== 'Resolved') return false;
    if (filterType === 'question' && comment.type !== 'Question') return false;
    if (filterType === 'feedback' && comment.type !== 'Feedback') return false;
    return true;
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const openCount = comments.filter(c => c.status === 'Open').length;
  const resolvedCount = comments.filter(c => c.status === 'Resolved').length;

  const renderComment = (comment: ActivityComment) => {
    const isExpanded = expandedComments.has(comment.id) || comment.status === 'Open';
    const canResolve = user?.id === comment.author.userId && comment.status === 'Open';
    const canReopen = user?.id === comment.author.userId && comment.status === 'Resolved';

    return (
      <div key={comment.id} className={`border rounded-lg ${comment.status === 'Resolved' ? 'bg-gray-50' : ''}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleExpandComment(comment.id)}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <CollapsibleTrigger className="mt-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </CollapsibleTrigger>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{comment.author.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role}
                    </Badge>
                    <Badge 
                      variant={comment.type === 'Question' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {comment.type === 'Question' ? (
                        <HelpCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <MessageSquare className="h-3 w-3 mr-1" />
                      )}
                      {comment.type}
                    </Badge>
                    {comment.status === 'Open' && comment.type === 'Question' && (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unresolved
                      </Badge>
                    )}
                  </div>
                  
                  {comment.status === 'Resolved' && !isExpanded && comment.resolvedAt && (
                    <div className="text-sm text-gray-600">
                      <CheckCircle className="h-3 w-3 inline mr-1 text-green-600" />
                      Resolved by {comment.resolvedBy?.name} • {formatDistanceToNow(new Date(comment.resolvedAt), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.status === 'Open' ? (
                  <Circle className="h-4 w-4 text-gray-400" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </div>
          
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <div className="pl-10">
                <p className="text-sm mb-3 whitespace-pre-wrap">{comment.message}</p>
                
                {/* Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {comment.attachments.map(attachment => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        download={attachment.filename}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Paperclip className="h-3 w-3" />
                        {attachment.filename}
                        <Download className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
                
                {/* Resolution info */}
                {comment.status === 'Resolved' && comment.resolutionNote && comment.resolvedAt && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Resolution</p>
                        <p className="text-sm text-green-700 mt-1">{comment.resolutionNote}</p>
                        <p className="text-xs text-green-600 mt-1">
                          by {comment.resolvedBy?.name} • {format(new Date(comment.resolvedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{reply.author.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {reply.author.role}
                          </Badge>
                          <Badge 
                            variant={reply.type === 'Question' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {reply.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {comment.status === 'Open' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  
                  {canResolve && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveComment(comment.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Resolved
                    </Button>
                  )}
                  
                  {canReopen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReopenComment(comment.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reopen
                    </Button>
                  )}
                </div>
                
                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 space-y-2">
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
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim()}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send Reply
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
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Discussion
            <Badge variant="outline" className="ml-2">
              {comments.length} total
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchComments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* New Comment Form */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-2">
            <Select value={commentType} onValueChange={(v: any) => setCommentType(v)}>
              <SelectTrigger className="w-40">
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
            placeholder={commentType === 'Question' ? 'Ask a question about this activity...' : 'Leave feedback or comments...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {commentType === 'Question' && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Questions will be highlighted for quicker response
                </span>
              )}
            </div>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Post {commentType}
            </Button>
          </div>
        </div>
        
        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="open" className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                Open ({openCount})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Resolved ({resolvedCount})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-32">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="question">Questions</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-32">
                  <SortAsc className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <TabsContent value="open" className="space-y-3">
            {sortedComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No open comments yet</p>
                <p className="text-sm mt-1">Be the first to start a discussion!</p>
              </div>
            ) : (
              sortedComments.map(renderComment)
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="space-y-3">
            {sortedComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No resolved comments</p>
              </div>
            ) : (
              sortedComments.map(renderComment)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 