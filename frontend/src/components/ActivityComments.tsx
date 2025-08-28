import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityComment, CommentReply, CommentSearchFilters } from '@/types/comment';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/components/rolodex/utils/roleLabels';
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
  Search,
  AtSign,
  Hash,
  Bell,
  BellOff,
  Eye,
  Archive,
  ArchiveRestore,
  Trash,
} from 'lucide-react';

interface ActivityCommentsProps {
  activityId: string;
  contextSection?: string; // Which section of the activity this is for
  allowContextSwitch?: boolean; // Whether users can switch sections
}

export function ActivityComments({ activityId, contextSection, allowContextSwitch = true }: ActivityCommentsProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'question' | 'feedback'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  
  // Enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContextSection, setSelectedContextSection] = useState(contextSection || '');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to get user initials
  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  // Function to normalize comment format to expected structure
  const normalizeComment = (comment: any): ActivityComment => {
    // Handle database format (user_name, user_role, etc.)
    if (comment.user_name && !comment.author) {
      return {
        id: comment.id,
        activityId: comment.activity_id || activityId,
        author: {
          userId: comment.user_id || '',
                        name: comment.user_name || 'Unknown User',
              role: ROLE_LABELS[comment.user_role] ? ROLE_LABELS[comment.user_role].label : (comment.user_role || 'user'),
              profilePicture: user?.profilePicture || comment.user_avatar_url?.avatar_url || comment.user_avatar_url || comment.userProfilePicture
        },
        type: comment.type === 'response' ? 'Feedback' : (comment.type || 'Feedback'),
        message: comment.message || comment.content || '',
        createdAt: comment.created_at || comment.createdAt,
        replies: (comment.replies || []).map((reply: any) => ({
          ...reply,
          id: reply.id,
          createdAt: reply.created_at || reply.createdAt,
          message: reply.message || reply.content || '',
          author: {
            userId: reply.user_id || '',
                            name: reply.user_name || 'Unknown User',
                role: ROLE_LABELS[reply.user_role] ? ROLE_LABELS[reply.user_role].label : (reply.user_role || 'user'),
                profilePicture: user?.profilePicture || reply.user_avatar_url?.avatar_url || reply.user_avatar_url || reply.userProfilePicture
          }
        })),
        status: comment.status || 'Open',
        contextSection: comment.context_section || comment.contextSection,
        contextField: comment.context_field || comment.contextField,
        isArchived: comment.is_archived || false,
        attachments: comment.attachments || [],
      };
    }
    
    // Check if it's an old format comment (userId format)
    if (comment.userId && !comment.author) {
      return {
        id: comment.id,
        activityId: activityId,
        author: {
          userId: comment.userId,
          name: comment.userName || 'Unknown',
          role: comment.userRole || 'user',
          profilePicture: comment.userProfilePicture
        },
        type: comment.type === 'response' ? 'Feedback' : (comment.type || 'Feedback'),
        message: comment.content || comment.message || '',
        createdAt: comment.createdAt,
        replies: [],
        status: 'Open',
        attachments: [],
      };
    }
    
    // For already normalized format, just ensure type is correct
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
    fetchUsersAndOrgs();
    if (user) {
      fetchNotifications();
    }
  }, [activityId]);

  // Real-time polling for new comments and notifications
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComments(false); // Silent refresh
      if (user) {
        fetchNotifications();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [activityId, user]);

  // Refresh comments when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchComments(false);
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedContextSection, filterType, activeTab, showArchived]);

  // Fetch users and organizations for mentions
  const fetchUsersAndOrgs = async () => {
    try {
      // Fetch users from the activity contributors/participants
      const usersResponse = await fetch('/api/users?limit=100');
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setAvailableUsers(users);
      }

      // Fetch organizations
      const orgsResponse = await fetch('/api/organizations?limit=100');
      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        setAvailableOrgs(orgs);
      }
    } catch (error) {
      console.error('Error fetching users/orgs:', error);
    }
  };

  // Fetch notifications for current user
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`);
      if (response.ok) {
        const notifs = await response.json();
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchComments = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Build query parameters for search and filtering
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedContextSection) params.append('section', selectedContextSection);
      if (filterType !== 'all') params.append('type', filterType === 'question' ? 'Question' : 'Feedback');
      if (activeTab !== 'open') params.append('status', 'Resolved');
      
      // Always explicitly set includeArchived parameter
      params.append('includeArchived', showArchived ? 'true' : 'false');
      
      const url = `/api/activities/${activityId}/comments${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        // If it's a 404, the activity might not exist yet or tables not created
        if (res.status === 404) {
          console.warn('Activity or comments table not found, using empty array');
          setComments([]);
          return;
        }
        throw new Error('Failed to fetch comments');
      }
      
      const data = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = data.map(normalizeComment);
      setComments(normalizedComments);
      
      // Update last poll time for real-time indicators
      setLastPollTime(Date.now());
    } catch (error) {
      console.error('Error fetching comments:', error);
      if (showLoading) {
        toast.error('Failed to load comments');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Insert mention at cursor position
  const insertMention = useCallback((mention: { id: string; name: string; type: 'user' | 'organization' }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prefix = mention.type === 'user' ? '@' : '#';
    const mentionText = `${prefix}[${mention.name}](${mention.id})`;
    
    const newText = newComment.substring(0, start) + mentionText + newComment.substring(end);
    setNewComment(newText);
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newPosition = start + mentionText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
    
    setShowMentions(false);
  }, [newComment]);

  // Handle mention trigger
  const handleMentionTrigger = useCallback((type: 'user' | 'organization') => {
    setShowMentions(true);
    setMentionSearch('');
    // Filter available mentions based on type
  }, []);

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
          contextSection: selectedContextSection || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to add comment');
      
      const updatedComments = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = updatedComments.map(normalizeComment);
      setComments(normalizedComments);
      setNewComment('');
      
      // Refresh notifications
      if (user) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user) return;

    // Find the parent comment to inherit its type
    const parentComment = comments.find(c => c.id === parentCommentId);
    const inheritedType = parentComment?.type || 'Feedback';

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

      if (!res.ok) throw new Error('Failed to add reply');
      
      const updatedComments = await res.json();
      // Normalize all comments before setting state
      const normalizedComments = updatedComments.map(normalizeComment);
      setComments(normalizedComments);
      setReplyContent('');
      setReplyingTo(null);
      
      // Refresh notifications
      if (user) {
        fetchNotifications();
      }
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
    // Archive filter - if showing archived, only show archived comments; if not, exclude archived
    if (showArchived && !comment.isArchived) return false;
    if (!showArchived && comment.isArchived) return false;
    
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

  const openCount = comments.filter(c => c.status === 'Open' && !c.isArchived).length;
  const resolvedCount = comments.filter(c => c.status === 'Resolved' && !c.isArchived).length;
  const archivedCount = comments.filter(c => c.isArchived).length;

  const renderComment = (comment: ActivityComment) => {
    const isExpanded = expandedComments.has(comment.id) || comment.status === 'Open';
    const canResolve = user?.id === comment.author?.userId && comment.status === 'Open';
    const canReopen = user?.id === comment.author?.userId && comment.status === 'Resolved';

    return (
      <div key={comment.id} className={`border rounded-lg ${
        comment.status === 'Resolved' ? 'bg-gray-50' : ''
      } ${comment.isArchived ? 'bg-gray-100 opacity-75' : ''}`}>
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
                  <div className="space-y-2">
                    {/* Top Row: Comment Type (left) and Date (right) */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
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
                        {comment.status === 'Open' && comment.type === 'Question' && !comment.isArchived && (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Unresolved
                          </Badge>
                        )}
                        {comment.isArchived && (
                          <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                      </div>
                      
                      {/* Top Right: Date/Time */}
                      <span className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
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
                  
                  {comment.status === 'Resolved' && !isExpanded && comment.resolvedAt && (
                    <div className="text-sm text-gray-600">
                      <CheckCircle className="h-3 w-3 inline mr-1 text-green-600" />
                      Resolved by {comment.resolvedBy?.name} • {formatDistanceToNow(new Date(comment.resolvedAt), { addSuffix: true })}
                    </div>
                  )}
                  {comment.isArchived && !isExpanded && comment.archivedAt && (
                    <div className="text-sm text-gray-600">
                      <Archive className="h-3 w-3 inline mr-1 text-gray-500" />
                      Archived by {comment.archivedBy?.name} • {formatDistanceToNow(new Date(comment.archivedAt), { addSuffix: true })}
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
                          <span className="font-medium">{reply.author?.name || 'Unknown User'}</span>
                          <Badge variant="outline" className="text-xs">
                            {reply.author?.role || 'user'}
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
                  {comment.status === 'Open' && !comment.isArchived && (
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
                  
                  {user && !comment.isArchived && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveComment(comment.id)}
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Archive
                    </Button>
                  )}
                  
                  {user && comment.isArchived && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchiveComment(comment.id)}
                    >
                      <ArchiveRestore className="h-3 w-3 mr-1" />
                      Unarchive
                    </Button>
                  )}
                  
                  {/* Delete button - only show for comment author or admin */}
                  {user && (comment.author?.userId === user.id || ['super_user', 'admin'].includes(user.role)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
                
                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 space-y-2">
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
          <Button variant="ghost" size="sm" onClick={() => fetchComments()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search comments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => fetchComments()}
              disabled={loading}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-1"
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Show Archived ({archivedCount})
                </>
              )}
            </Button>
          </div>

          {/* Context Section Filter */}
          {allowContextSwitch && (
            <div className="flex gap-2">
              <Select value={selectedContextSection} onValueChange={setSelectedContextSection}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  <SelectItem value="general">General Information</SelectItem>
                  <SelectItem value="finances">Finances</SelectItem>
                  <SelectItem value="sectors">Sectors</SelectItem>
                  <SelectItem value="partnerships">Partnerships</SelectItem>
                  <SelectItem value="geography">Geography</SelectItem>
                  <SelectItem value="sdg">SDG Alignment</SelectItem>
                  <SelectItem value="policy_markers">Policy Markers</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Notifications Bell */}
              <Button variant="outline" size="sm" onClick={fetchNotifications} className="relative">
                {unreadCount > 0 ? <Bell className="h-4 w-4 text-orange-500" /> : <BellOff className="h-4 w-4" />}
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* New Comment Form - Only show when not viewing archived comments */}
        {!showArchived && (
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
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder={commentType === 'Question' ? 'Ask a question about this activity...' : 'Leave feedback or comments...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            
            {/* Mentions Toolbar */}
            <div className="absolute bottom-2 left-2 flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleMentionTrigger('user')} title="Mention users (@)">
                <AtSign className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleMentionTrigger('organization')} title="Mention organizations (#)">
                <Hash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500 flex items-center gap-4">
              {commentType === 'Question' && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Questions will be highlighted for quicker response
                </span>
              )}
              <span className="flex items-center gap-1">
                <AtSign className="h-3 w-3" />
                Use @ to mention users, # for organizations
              </span>
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
        )}
        
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