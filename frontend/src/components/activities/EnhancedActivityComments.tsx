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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActivityComment, CommentReply } from '@/types/comment';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils';
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
  ThumbsUp,
  ThumbsDown,
  Heart,
  Zap,
  HelpCircle as Confused,
  Plus,
  X,
  Upload,
  File,
  Image,
  FileText,
  Trash,
} from 'lucide-react';

// Helper function to get user initials
const getUserInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
};

interface ReactionCount {
  reaction_type: string;
  count: number;
  user_names: string[];
}

interface EnhancedActivityCommentsProps {
  activityId: string;
  contextSection?: string; // Which section of the activity this is for
  contextField?: string;   // Specific field within the section
  allowContextSwitch?: boolean; // Whether users can switch sections
  showInline?: boolean; // Whether to show as inline comments or in drawer
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

const REACTION_TYPES = [
  { type: 'thumbs_up', icon: ThumbsUp, label: 'Thumbs Up', color: 'text-green-600' },
  { type: 'thumbs_down', icon: ThumbsDown, label: 'Thumbs Down', color: 'text-red-600' },
  { type: 'heart', icon: Heart, label: 'Love', color: 'text-pink-600' },
  { type: 'celebrate', icon: Zap, label: 'Celebrate', color: 'text-yellow-600' },
  { type: 'confused', icon: Confused, label: 'Confused', color: 'text-gray-600' },
];

export function EnhancedActivityComments({ 
  activityId, 
  contextSection, 
  contextField,
  allowContextSwitch = true,
  showInline = false 
}: EnhancedActivityCommentsProps) {
  const { user } = useUser();
  
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'archived'>('open');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'question' | 'feedback'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  
  // Enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContextSection, setSelectedContextSection] = useState(contextSection || 'general');
  const [selectedContextField, setSelectedContextField] = useState(contextField || '');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState(Date.now());


  
  // Attachment support
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Reactions
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCount[]>>({});

  // Load comments
  useEffect(() => {
    if (activityId) {
      fetchComments();
      fetchNotifications();
      fetchAvailableUsers();
      fetchAvailableOrgs();
    }
  }, [activityId, searchTerm, selectedContextSection, filterType, activeTab]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activityId && Date.now() - lastPollTime > 30000) {
        fetchComments();
        fetchNotifications();
        setLastPollTime(Date.now());
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activityId, lastPollTime]);

  const fetchComments = async () => {
    if (!activityId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedContextSection) params.append('section', selectedContextSection);
      if (filterType !== 'all') params.append('type', filterType);
      if (activeTab === 'resolved') params.append('status', 'Resolved');
      
      // Always explicitly set includeArchived parameter
      if (activeTab === 'archived') {
        params.append('includeArchived', 'true');
      } else {
        params.append('includeArchived', 'false');
      }

      const res = await fetch(`/api/activities/${activityId}/comments?${params}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setComments([]);
          return;
        }
        throw new Error('Failed to fetch comments');
      }
      
      const data = await res.json();
      const normalizedComments = (Array.isArray(data) ? data : []).map(normalizeComment);
      setComments(normalizedComments);
      
      // Load reactions for all comments
      await loadReactionsForComments(normalizedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadReactionsForComments = async (commentsList: ActivityComment[]) => {
    const newReactionCounts: Record<string, ReactionCount[]> = {};
    
    for (const comment of commentsList) {
      try {
        const res = await fetch(`/api/activities/${activityId}/comments/reactions?commentId=${comment.id}`);
        if (res.ok) {
          const data = await res.json();
          newReactionCounts[comment.id] = data.reactionCounts || [];
        }
        
        // Load reactions for replies
        if (comment.replies) {
          for (const reply of comment.replies) {
            const replyRes = await fetch(`/api/activities/${activityId}/comments/reactions?replyId=${reply.id}`);
            if (replyRes.ok) {
              const replyData = await replyRes.json();
              newReactionCounts[reply.id] = replyData.reactionCounts || [];
            }
          }
        }
      } catch (error) {
        console.error('Error loading reactions:', error);
      }
    }
    
    setReactionCounts(newReactionCounts);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const res = await fetch(`/api/activities/${activityId}/comments/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/users`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAvailableOrgs = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/organizations`);
      if (res.ok) {
        const data = await res.json();
        setAvailableOrgs(data.organizations || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Normalize comment format for backward compatibility
  const normalizeComment = (comment: any): ActivityComment => {
    return {
      id: comment.id,
      activityId: comment.activity_id || comment.activityId || '',
      author: {
        userId: comment.user_id || comment.userId || '',
        name: comment.user_name || comment.author?.name || comment.userName || 'Unknown User',
        role: getRoleDisplayLabel(comment.user_role || comment.author?.role || comment.userRole),
        roleColor: '', // No longer needed - using Badge variants
        profilePicture: user?.profilePicture || comment.user_avatar_url?.avatar_url || comment.user_avatar_url || comment.author?.profilePicture || comment.userProfilePicture
      },
      message: comment.message || comment.content || '',
      type: comment.type || 'Feedback' as 'Feedback' | 'Question',
      status: comment.status || 'Open' as 'Open' | 'Resolved',
      contextSection: comment.context_section || comment.contextSection,
      contextField: comment.context_field || comment.contextField,
      mentions: Array.isArray(comment.mentions) ? comment.mentions : 
                (typeof comment.mentions === 'string' ? JSON.parse(comment.mentions || '[]') : []),
      attachments: Array.isArray(comment.attachments) ? comment.attachments :
                   (typeof comment.attachments === 'string' ? JSON.parse(comment.attachments || '[]') : []),
      isRead: typeof comment.is_read === 'object' ? comment.is_read :
               (typeof comment.is_read === 'string' ? JSON.parse(comment.is_read || '{}') : {}),
      resolvedBy: comment.resolvedBy?.name ? {
        userId: comment.resolved_by_id || '',
        name: comment.resolvedBy?.name,
        role: 'user'
      } : undefined,
      resolvedAt: comment.resolved_at,
      resolutionNote: comment.resolution_note,
      isArchived: comment.isArchived || false,
      archivedBy: comment.archivedBy?.name ? {
        userId: comment.archived_by_id || '',
        name: comment.archivedBy?.name,
        role: 'user'
      } : undefined,
      archivedAt: comment.archived_at,
      archiveReason: comment.archiveReason,
      createdAt: comment.createdAt || comment.createdAt || new Date().toISOString(),
      replies: (comment.replies || []).map((reply: any) => ({
        id: reply.id,
        author: {
          userId: reply.user_id || reply.userId || '',
          name: reply.author.name || reply.userName || 'Unknown User',
          role: getRoleDisplayLabel(reply.author.role || reply.userRole),
          roleColor: '', // No longer needed - using Badge variants
          profilePicture: user?.profilePicture || reply.author?.profilePicture || reply.user_avatar_url?.avatar_url || reply.user_avatar_url || reply.userProfilePicture
        },
        message: reply.message || reply.content || '',
        type: reply.type || 'Feedback' as 'Feedback' | 'Question',
        mentions: Array.isArray(reply.mentions) ? reply.mentions :
                  (typeof reply.mentions === 'string' ? JSON.parse(reply.mentions || '[]') : []),
        attachments: Array.isArray(reply.attachments) ? reply.attachments :
                     (typeof reply.attachments === 'string' ? JSON.parse(reply.attachments || '[]') : []),
        isRead: typeof reply.is_read === 'object' ? reply.is_read :
                 (typeof reply.is_read === 'string' ? JSON.parse(reply.is_read || '{}') : {}),
        createdAt: reply.createdAt || reply.createdAt || new Date().toISOString()
      }))
    };
  };

  const handleReaction = async (commentId: string, replyId: string | null, reactionType: string) => {
    if (!user) {
      toast.error('Please log in to react to comments');
      return;
    }

    try {
      const res = await fetch(`/api/activities/${activityId}/comments/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId: replyId ? null : commentId,
          replyId,
          reactionType,
        }),
      });

      if (!res.ok) throw new Error('Failed to toggle reaction');
      
      const data = await res.json();
      
      // Update reaction counts
      const targetId = replyId || commentId;
      setReactionCounts(prev => ({
        ...prev,
        [targetId]: data.reactionCounts || []
      }));
      
      toast.success(`Reaction ${data.action} successfully`);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return [];
    
    setUploadingAttachment(true);
    const uploadedFiles: any[] = [];
    
    try {
      for (const file of Array.from(files)) {
        // In a real implementation, you'd upload to a file storage service
        // For now, we'll create a mock attachment object
        const attachment = {
          id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file), // This would be the actual upload URL
          uploaded_at: new Date().toISOString(),
        };
        uploadedFiles.push(attachment);
      }
      
      toast.success(`${uploadedFiles.length} file(s) attached`);
      return uploadedFiles;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleMentionInsert = (mentionText: string) => {
    if (replyingTo) {
      setReplyContent(prev => prev + mentionText);
      replyTextareaRef.current?.focus();
    } else {
      setNewComment(prev => prev + mentionText);
      textareaRef.current?.focus();
    }
    setShowMentions(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    // Handle file uploads first
    let uploadedAttachments: any[] = [];
    if (attachments.length > 0) {
      const fileList = new DataTransfer();
      attachments.forEach(file => fileList.items.add(file));
      uploadedAttachments = await handleFileUpload(fileList.files);
    }

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: newComment,
          type: commentType,
          contextSection: selectedContextSection || undefined,
          contextField: selectedContextField || undefined,
          attachments: uploadedAttachments,
        }),
      });

      if (!res.ok) throw new Error('Failed to add comment');
      
      await fetchComments();
      setNewComment('');
      setAttachments([]);
      
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
      
      await fetchComments();
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleResolveComment = async (commentId: string, resolutionNote: string = '') => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'resolve',
          resolutionNote,
        }),
      });

      if (!res.ok) throw new Error('Failed to resolve comment');
      
      await fetchComments();
      toast.success('Comment resolved successfully');
    } catch (error) {
      console.error('Error resolving comment:', error);
      toast.error('Failed to resolve comment');
    }
  };

  const handleArchiveComment = async (commentId: string, reason: string = '') => {
    if (!user) return;

    try {
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
          action: 'archive',
          archiveReason: reason,
        }),
      });

      if (!res.ok) throw new Error('Failed to archive comment');
      
      await fetchComments();
      toast.success('Comment archived successfully');
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
      const res = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          commentId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete comment');
      }
      
      await fetchComments();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    }
  };

  const filterComments = (comments: ActivityComment[]) => {
    return comments.filter(comment => {
      // Filter by tab
      if (activeTab === 'open' && (comment.status === 'Resolved' || comment.isArchived)) return false;
      if (activeTab === 'resolved' && comment.status !== 'Resolved') return false;
      if (activeTab === 'archived' && !comment.isArchived) return false;
      
      // Filter by type
      if (filterType !== 'all' && comment.type.toLowerCase() !== filterType) return false;
      
      // Filter by search term
      if (searchTerm && !comment.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      return true;
    });
  };

  const sortComments = (comments: ActivityComment[]) => {
    return [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const getReactionDisplay = (targetId: string) => {
    const reactions = reactionCounts[targetId] || [];
    return reactions.reduce((acc, reaction) => {
      acc[reaction.reaction_type] = {
        count: reaction.count,
        users: reaction.user_names,
        hasUserReacted: reaction.user_names.includes(user?.name || '')
      };
      return acc;
    }, {} as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>);
  };

  const displayedComments = sortComments(filterComments(comments));

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${showInline ? 'border-l-4 border-blue-200 pl-4' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">
              Comments {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComments()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {notifications.length > 0 && (
              <Popover>
                <PopoverTrigger className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>}
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Notifications</h4>
                    {notifications.slice(0, 5).map((notification: any) => (
                      <div key={notification.id} className={`p-2 rounded text-sm ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50'}`}>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="space-y-4">
          {/* Search and Context */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search comments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {allowContextSwitch && (
              <Select value={selectedContextSection} onValueChange={(value) => setSelectedContextSection(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_SECTIONS.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'question' | 'feedback')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="question">Questions</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'newest' | 'oldest')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'open' | 'resolved' | 'archived')}>
          <TabsList>
            <TabsTrigger value="open">
              Open ({comments.filter(c => c.status !== 'Resolved' && !c.isArchived).length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({comments.filter(c => c.status === 'Resolved').length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({comments.filter(c => c.isArchived).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {/* New Comment Form */}
            {activeTab === 'open' && user && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Select value={commentType} onValueChange={(value) => setCommentType(value as 'Question' | 'Feedback')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Question">Question</SelectItem>
                          <SelectItem value="Feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {selectedContextSection && (
                        <Badge variant="outline">
                          {ACTIVITY_SECTIONS.find(s => s.value === selectedContextSection)?.label}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="relative">
                      <Textarea
                        ref={textareaRef}
                        placeholder={`Add a ${commentType.toLowerCase()}...`}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      
                      {/* Mention suggestions */}
                      {showMentions && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1">
                          <Command className="border rounded-lg shadow-lg bg-white">
                            <CommandInput
                              placeholder="Search users and organizations..."
                              value={mentionSearch}
                              onChange={(e) => setMentionSearch(e.target.value)}
                            />
                            <CommandList>
                              <CommandEmpty>No users or organizations found.</CommandEmpty>
                              
                              {availableUsers.length > 0 && (
                                <CommandGroup>
                                  {availableUsers
                                    .filter(user => 
                                      user.name.toLowerCase().includes(mentionSearch.toLowerCase())
                                    )
                                    .slice(0, 5)
                                    .map((user) => (
                                      <CommandItem
                                        key={user.id}
                                        onSelect={() => handleMentionInsert(`@[${user.name}](${user.id}) `)}
                                      >
                                        <AtSign className="h-4 w-4 mr-2" />
                                        {user.name} ({user.role})
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                              
                              {availableOrgs.length > 0 && (
                                <CommandGroup>
                                  {availableOrgs
                                    .filter(org => 
                                      org.name.toLowerCase().includes(mentionSearch.toLowerCase())
                                    )
                                    .slice(0, 5)
                                    .map((org) => (
                                      <CommandItem
                                        key={org.id}
                                        onSelect={() => handleMentionInsert(`#[${org.name}](${org.id}) `)}
                                      >
                                        <Hash className="h-4 w-4 mr-2" />
                                        {org.name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </div>
                      )}
                    </div>
                    
                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded">
                            <File className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <button
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMentions(!showMentions)}
                        >
                          <AtSign className="h-4 w-4" />
                          Mention
                        </Button>
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAttachment}
                        >
                          <Paperclip className="h-4 w-4" />
                          Attach
                        </Button>
                      </div>
                      
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || uploadingAttachment}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post {commentType}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading comments...</div>
              ) : displayedComments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No {activeTab} comments yet.
                </div>
              ) : (
                displayedComments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onReply={setReplyingTo}
                    onResolve={handleResolveComment}
                    onArchive={handleArchiveComment}
                    onDelete={handleDeleteComment}
                    onReaction={handleReaction}
                    replyingTo={replyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    onSubmitReply={handleSubmitReply}
                    reactionDisplay={getReactionDisplay(comment.id)}
                    user={user}
                    isExpanded={expandedComments.has(comment.id)}
                    onToggleExpanded={(id) => {
                      const newExpanded = new Set(expandedComments);
                      if (newExpanded.has(id)) {
                        newExpanded.delete(id);
                      } else {
                        newExpanded.add(id);
                      }
                      setExpandedComments(newExpanded);
                    }}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Comment Card Component
interface CommentCardProps {
  comment: ActivityComment;
  onReply: (id: string | null) => void;
  onResolve: (id: string, note?: string) => void;
  onArchive: (id: string, reason?: string) => void;
  onDelete: (id: string) => void;
  onReaction: (commentId: string, replyId: string | null, reactionType: string) => void;
  replyingTo: string | null;
  replyContent: string;
  setReplyContent: (content: string) => void;
  onSubmitReply: (parentId: string) => void;
  reactionDisplay: Record<string, { count: number; users: string[]; hasUserReacted: boolean }>;
  user: any;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
}

function CommentCard({
  comment,
  onReply,
  onResolve,
  onArchive,
  onDelete,
  onReaction,
  replyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  reactionDisplay,
  user,
  isExpanded,
  onToggleExpanded,
}: CommentCardProps) {
  return (
    <Card className={`transition-all ${comment.status === 'Resolved' ? 'bg-green-50 border-green-200' : ''} ${comment.isArchived ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Comment Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={comment.type === 'Question' ? 'default' : 'secondary'}>
                  {comment.type === 'Question' ? <HelpCircle className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                  {comment.type}
                </Badge>
                
                {comment.status === 'Resolved' && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
                
                {comment.isArchived && (
                  <Badge variant="outline" className="text-gray-600">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {/* Top Row: Comment Type (left) and Date (right) */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={comment.type === 'Question' ? 'default' : 'secondary'}>
                      {comment.type === 'Question' ? <HelpCircle className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                      {comment.type}
                    </Badge>
                  </div>
                  
                  {/* Top Right: Date/Time */}
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                {/* User Info Section */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.profilePicture} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(comment.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{comment.author.name}</span>
                      <Badge variant={getRoleBadgeVariant(comment.author.role)} className="text-xs">
                        {comment.author.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {comment.contextSection && (
                <Badge variant="outline" className="text-xs">
                  {comment.contextSection}
                  {comment.contextField && ` → ${comment.contextField}`}
                </Badge>
              )}
              
              {user && comment.status !== 'Resolved' && !comment.isArchived && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResolve(comment.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as resolved</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(comment.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archive comment</TooltipContent>
                  </Tooltip>
                </div>
              )}
              
              {/* Delete button - only show for comment author or admin */}
              {user && (comment.author.name === user.name || ['super_user', 'admin'].includes(user.role)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete comment</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          
          {/* Comment Content */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{comment.message}</p>
          </div>
          
          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {comment.attachments.map((attachment: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                    {attachment.type?.startsWith('image/') ? (
                      <Image className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span className="text-sm">{attachment.name}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={attachment.url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Reactions */}
          <div className="flex items-center gap-2 flex-wrap">
            {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => {
              const reaction = reactionDisplay[type];
              const count = reaction?.count || 0;
              const hasUserReacted = reaction?.hasUserReacted || false;
              
              return (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={hasUserReacted ? "default" : "outline"}
                      size="sm"
                      onClick={() => onReaction(comment.id, null, type)}
                      className={`h-8 ${hasUserReacted ? color : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                      {count > 0 && <span className="ml-1">{count}</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      <p>{label}</p>
                      {reaction?.users && reaction.users.length > 0 && (
                        <p className="text-xs">
                          {reaction.users.slice(0, 3).join(', ')}
                          {reaction.users.length > 3 && ` and ${reaction.users.length - 3} more`}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          </div>
          
          {/* Resolution Note */}
          {comment.status === 'Resolved' && comment.resolutionNote && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                <CheckCircle className="h-4 w-4" />
                Resolved by {comment.resolvedBy?.name}
              </div>
              <p className="text-green-700 text-sm mt-1">{comment.resolutionNote}</p>
            </div>
          )}
          
          {/* Archive Info */}
          {comment.isArchived && comment.archiveReason && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 text-gray-800 font-medium text-sm">
                <Archive className="h-4 w-4" />
                Archived by {comment.archivedBy?.name}
              </div>
              <p className="text-gray-700 text-sm mt-1">{comment.archiveReason}</p>
            </div>
          )}
          
          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpanded(comment.id)}
                className="flex items-center gap-2"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Button>
              
              <Collapsible open={isExpanded}>
                <CollapsibleContent className="space-y-4">
                  {comment.replies.map((reply) => (
                    <ReplyCard
                      key={reply.id}
                      reply={reply}
                      onReaction={(reactionType) => onReaction(comment.id, reply.id, reactionType)}
                      reactionDisplay={reactionDisplay[reply.id] || { count: 0, users: [], hasUserReacted: false }}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
          
          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="ml-6 border-l-2 border-blue-200 pl-4 space-y-3">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
              />
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onSubmitReply(comment.id)}
                  disabled={!replyContent.trim()}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Reply Card Component
interface ReplyCardProps {
  reply: CommentReply;
  onReaction: (reactionType: string) => void;
  reactionDisplay: { count: number; users: string[]; hasUserReacted: boolean } | Record<string, { count: number; users: string[]; hasUserReacted: boolean }>;
}

function ReplyCard({ reply, onReaction, reactionDisplay }: ReplyCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={reply.author.profilePicture} />
            <AvatarFallback className="text-xs">
              {getUserInitials(reply.author.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{reply.author.name}</span>
          <Badge variant={getRoleBadgeVariant(reply.author.role)} className="text-xs ml-2">
            {reply.author.role}
          </Badge>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      
      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
      
      {/* Reply Attachments */}
      {reply.attachments && reply.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Attachments:</p>
          <div className="flex flex-wrap gap-2">
            {reply.attachments.map((attachment: any, index: number) => (
              <div key={index} className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded text-xs">
                <FileText className="h-3 w-3" />
                <span>{attachment.name}</span>
                <Button variant="ghost" size="sm" asChild>
                  <a href={attachment.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-2 w-2" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Reply Reactions */}
      <div className="flex items-center gap-1 flex-wrap">
        {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => {
          const isSimpleObject = typeof reactionDisplay === 'object' && 'count' in reactionDisplay && !('type' in reactionDisplay);
          const reaction = isSimpleObject 
            ? (reactionDisplay as { count: number; users: string[]; hasUserReacted: boolean })
            : (reactionDisplay as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>)[type];
          const count = reaction?.count || 0;
          const hasUserReacted = reaction?.hasUserReacted || false;
          const users = reaction?.users || [];
          
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <Button
                  variant={hasUserReacted ? "default" : "outline"}
                  size="sm"
                  onClick={() => onReaction(type)}
                  className={`h-6 text-xs ${hasUserReacted ? color : ''}`}
                >
                  <Icon className="h-3 w-3" />
                  {count > 0 && <span className="ml-1">{count}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p>{label}</p>
                  {users && users.length > 0 && (
                    <p className="text-xs">
                      {users.slice(0, 3).join(', ')}
                      {users.length > 3 && ` and ${users.length - 3} more`}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}