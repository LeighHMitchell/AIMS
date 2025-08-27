'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_LABELS } from '@/components/rolodex/utils/roleLabels';
import { 
  MessageSquare, 
  X, 
  Send, 
  Search, 
  Filter, 
  SortAsc, 
  Plus,
  RefreshCw,
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  Reply,
  HelpCircle,
  MessageCircle,
  Users,
  Eye,
  Trash
} from 'lucide-react';
import { ActivityComment, CommentReply, CommentSearchFilters } from '@/types/comment';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
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
  { value: 'Feedback', label: 'Feedback', icon: '💬', description: 'General feedback or comment' },
  { value: 'Question', label: 'Question', icon: '❓', description: 'Ask a question' },
] as const;

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

  // Helper function to get user initials
  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };
  
  // Form state
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [commentTypeOpen, setCommentTypeOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search state
  const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'archived'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Question' | 'Feedback'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [selectedSection, setSelectedSection] = useState(contextSection || 'general');
  
  // UI state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch comments when drawer opens or filters change
  useEffect(() => {
    if (open && activityId && activityId !== '' && activityId !== 'new') {
      fetchComments();
      fetchUnreadCount();
    }
  }, [open, activityId, searchTerm, filterType, activeTab, selectedSection, sortBy]);

  // Auto-refresh every 30 seconds when drawer is open
  useEffect(() => {
    if (!open || !activityId || activityId === '' || activityId === 'new') return;
    
    const interval = setInterval(() => {
      fetchComments();
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [open, activityId, searchTerm, filterType, activeTab, selectedSection]);

  const fetchComments = async () => {
    if (!activityId || activityId === '' || activityId === 'new') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSection) params.append('section', selectedSection);
      if (filterType !== 'all') params.append('type', filterType);
      if (activeTab === 'resolved') params.append('status', 'Resolved');
      
      // Always explicitly set includeArchived parameter
      if (activeTab === 'archived') {
        params.append('includeArchived', 'true');
      } else {
        params.append('includeArchived', 'false');
      }

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
      
      // Check if we need database setup
      const setupHeader = response.headers.get('X-Comments-Status');
      if (setupHeader) {
        console.warn('[CommentsDrawer] Database setup required:', setupHeader);
        setError('Comments system needs to be set up. Please run the database migration.');
        return;
      }
      
      // Transform API response to match expected structure
      fetchedComments = fetchedComments.map((comment: any) => {
        // Ensure author object exists with proper fallbacks
        const author = {
          userId: comment.user_id || comment.userId || '',
          name: comment.user_name || comment.userName || 'Unknown User',
          role: comment.user_role || comment.userRole || 'user'
        };

        // Transform replies with proper author objects
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
          resolvedBy: comment.resolved_by_name ? {
            userId: comment.resolved_by_id || '',
            name: comment.resolved_by_name || 'Unknown User',
            role: 'user'
          } : undefined,
          resolvedAt: comment.resolved_at || comment.resolvedAt,
          resolutionNote: comment.resolution_note || comment.resolutionNote
        };
      });
      
      // Sort comments
      fetchedComments.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
      
      setComments(fetchedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      toast.error('Failed to load comments');
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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: newComment.trim(),
          type: commentType,
          contextSection: selectedSection,
          contextField: contextField || '',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }
      
      setNewComment('');
      setCommentType('Feedback');
      await fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!replyContent.trim() || !user) return;
    
    // Find the parent comment to inherit its type
    const parentComment = comments.find(c => c.id === commentId);
    const inheritedType = parentComment?.type || 'Feedback';
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: replyContent.trim(),
          type: inheritedType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }
      
      setReplyContent('');
      setReplyingTo(null);
      await fetchComments();
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

  const toggleExpandComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Open':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'Question' ? 
      <HelpCircle className="h-4 w-4 text-orange-600" /> : 
      <MessageCircle className="h-4 w-4 text-blue-600" />;
  };

  const filteredComments = comments.filter(comment => {
    if (activeTab === 'open' && comment.status !== 'Open') return false;
    if (activeTab === 'resolved' && comment.status !== 'Resolved') return false;
    if (activeTab === 'archived' && !comment.isArchived) return false;
    return true;
  });

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
        className="w-[600px] sm:w-[700px] lg:w-[800px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Activity Comments
              {comments.length > 0 && (
                <Badge variant="secondary">{comments.length}</Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchComments}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {contextSection && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Context:</span>
              <Badge variant="outline">{contextSection}</Badge>
              {contextField && <Badge variant="outline">{contextField}</Badge>}
            </div>
          )}
        </SheetHeader>

        {/* Filters and Search */}
        <div className="px-6 py-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search comments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="section-filter" className="text-xs">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger id="section-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_SECTIONS.map((section) => (
                      <SelectItem key={section.value} value={section.value}>
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type-filter" className="text-xs">Type</Label>
                <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'Question' | 'Feedback')}>
                  <SelectTrigger id="type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Question">Questions</SelectItem>
                    <SelectItem value="Feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sort-filter" className="text-xs">Sort</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'newest' | 'oldest')}>
                  <SelectTrigger id="sort-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'open' | 'resolved' | 'archived')} className="flex-1 flex flex-col">
          <TabsList className="mx-6 grid w-full grid-cols-3">
            <TabsTrigger value="open" className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              Open ({comments.filter(c => c.status === 'Open' && !c.isArchived).length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Resolved ({comments.filter(c => c.status === 'Resolved').length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-3 w-3" />
              Archived ({comments.filter(c => c.isArchived).length})
            </TabsTrigger>
          </TabsList>

          {/* Comments Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading comments...</span>
                  </div>
                )}

                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!loading && !error && filteredComments.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
                    <p className="text-gray-600 mb-4">
                      {activeTab === 'open' ? 'Start a conversation about this activity.' : 
                       activeTab === 'resolved' ? 'No resolved comments to show.' :
                       'No archived comments to show.'}
                    </p>
                  </div>
                )}

                {filteredComments.map((comment) => {
                  // Safety check for comment structure
                  if (!comment || typeof comment !== 'object') {
                    console.warn('[CommentsDrawer] Invalid comment object:', comment);
                    return null;
                  }
                  
                  return (
                    <Card key={comment.id} className={cn(
                      "transition-all duration-200 hover:shadow-md",
                      comment.status === 'Resolved' && "bg-green-50 border-green-200",
                      comment.isArchived && "bg-gray-50 border-gray-200"
                    )}>
                    <CardHeader className="pb-3">
                      <div className="space-y-3">
                        {/* Top Row: Comment Type (left) and Date (right) */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={comment.type === 'Question' ? 'default' : 'secondary'} className="text-xs">
                              {comment.type}
                            </Badge>
                            {getStatusIcon(comment.status)}
                          </div>
                          
                          {/* Top Right: Date/Time */}
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </p>
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
                            <div className="font-medium text-sm truncate">{comment.author?.name || 'Unknown User'}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {comment.author?.role || 'user'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="text-sm text-gray-900 whitespace-pre-wrap">
                          {comment.message}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {comment.replies && comment.replies.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {comment.replies.length} replies
                            </Badge>
                          )}
                          {comment.status === 'Open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveComment(comment.id)}
                              className="text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                          {/* Delete button - only show for comment author or admin */}
                          {user && (comment.author?.userId === user.id || ['super_user', 'admin'].includes(user.role)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>

                        {comment.contextSection && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>Context:</span>
                            <Badge variant="outline" className="text-xs">{comment.contextSection}</Badge>
                            {comment.contextField && <Badge variant="outline" className="text-xs">{comment.contextField}</Badge>}
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                            {comment.replies.map((reply) => {
                              // Safety check for reply structure
                              if (!reply || typeof reply !== 'object') {
                                console.warn('[CommentsDrawer] Invalid reply object:', reply);
                                return null;
                              }
                              
                              // Ensure reply has required properties
                              const safeReply = {
                                id: reply.id || 'unknown',
                                author: reply.author || { name: 'Unknown User', role: 'user' },
                                message: reply.message || '',
                                createdAt: reply.createdAt || new Date().toISOString()
                              };
                              
                              return (
                                <div key={safeReply.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                                  {/* Top Row: Reply Type (left) and Date (right) */}
                                  <div className="flex items-start justify-between">
                                    <Badge variant="secondary" className="text-xs h-5">
                                      Reply
                                    </Badge>
                                    
                                    {/* Top Right: Date/Time */}
                                    <span className="text-xs text-gray-400">
                                      {formatDistanceToNow(new Date(safeReply.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                  
                                  {/* User Info Section */}
                                  <div className="flex items-start gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={safeReply.author?.profilePicture} />
                                      <AvatarFallback className="text-xs">
                                        {getUserInitials(safeReply.author?.name || 'Unknown User')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-xs truncate">{safeReply.author?.name || 'Unknown User'}</div>
                                      <Badge variant="outline" className="text-xs h-4 mt-1">
                                        {safeReply.author?.role || 'user'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600 whitespace-pre-wrap ml-8">
                                    {safeReply.message}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id ? (
                          <div className="space-y-2 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                            <Textarea
                              placeholder="Write your reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyContent.trim() || submitting}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-xs"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
              </div>
            </ScrollArea>

            {/* New Comment Form */}
            {activeTab === 'open' && (
              <div className="border-t bg-white p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Popover open={commentTypeOpen} onOpenChange={setCommentTypeOpen}>
                    <PopoverTrigger
                      className={cn(
                        "flex h-10 w-32 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                      )}
                    >
                      <span className="truncate">
                        {(() => {
                          const selectedOption = COMMENT_TYPE_OPTIONS.find(option => option.value === commentType);
                          return selectedOption ? (
                            <span className="flex items-center gap-2">
                              <span className="text-sm">{selectedOption.icon}</span>
                              <span className="font-medium">{selectedOption.label}</span>
                            </span>
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
                                <span className="text-base">{option.icon}</span>
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
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_SECTIONS.map((section) => (
                        <SelectItem key={section.value} value={section.value}>
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Textarea
                  placeholder="Write your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    {newComment.length}/1000 characters
                  </div>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    size="sm"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {submitting ? 'Sending...' : 'Send Comment'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}