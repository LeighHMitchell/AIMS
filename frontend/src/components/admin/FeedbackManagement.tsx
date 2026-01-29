"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table';
import { LoadingText } from '@/components/ui/loading-text';
import { FEEDBACK_TYPES, FEEDBACK_STATUS_TYPES, FEEDBACK_PRIORITY_TYPES } from '@/data/feedback-types';
import { ALL_APP_FEATURES, APP_FEATURES } from '@/data/app-features';
import { MessageSquare, Eye, Edit, Calendar, User, HelpCircle, MessageCircle, Lightbulb, Bug, Zap, Paperclip, Download, Image, FileText, Archive, ArchiveRestore, Trash, ChevronLeft, ChevronRight, Circle, CheckCircle, AlertCircle, XCircle, CircleDot, Play, CheckCircle2, Lock, Minus, AlertTriangle, Flame, Check, ChevronsUpDown, Search, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/useUser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FeedbackModal } from '@/components/ui/feedback-modal';
import { apiFetch } from '@/lib/api-fetch';

interface Feedback {
  id: string;
  category: string;
  feature: string | null;
  subject: string | null;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  attachment_url: string | null;
  attachment_filename: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  archived_at: string | null;
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  };
}

// Helper function to get the correct Lucide icon component
const getIconComponent = (iconName: string) => {
  const iconMap = {
    HelpCircle,
    MessageCircle,
    Lightbulb,
    Bug,
    Zap
  };
  return iconMap[iconName as keyof typeof iconMap] || HelpCircle;
};

// Helper function to get category info
const getCategoryInfo = (category: string) => {
  return FEEDBACK_TYPES.find(type => type.code === category) || {
    name: category,
    icon: 'HelpCircle',
    description: ''
  };
};

// Helper function to get user display name
const getUserDisplayName = (user: Feedback['user']) => {
  if (!user) return 'Unknown User';
  if (user.full_name) return user.full_name;
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.email || 'Unknown User';
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get attachment icon
const getAttachmentIcon = (type: string | null) => {
  if (!type) return FileText;
  if (type.startsWith('image/')) return Image;
  return FileText;
};

// Helper function to get priority icon and color
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'low':
      return { icon: Minus, color: 'text-gray-400' };
    case 'medium':
      return { icon: CircleDot, color: 'text-blue-500' };
    case 'high':
      return { icon: AlertTriangle, color: 'text-orange-500' };
    case 'urgent':
      return { icon: Flame, color: 'text-red-600' };
    default:
      return { icon: Minus, color: 'text-gray-400' };
  }
};

// Helper function to get sort icon

// Helper function to get status icon and color
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open':
      return { icon: CircleDot, color: 'text-blue-600' };
    case 'in_progress':
      return { icon: Play, color: 'text-yellow-500' };
    case 'resolved':
      return { icon: CheckCircle2, color: 'text-green-600' };
    case 'closed':
      return { icon: Lock, color: 'text-gray-600' };
    case 'archived':
      return { icon: Archive, color: 'text-gray-500' };
    default:
      return { icon: CircleDot, color: 'text-gray-400' };
  }
};

// Helper function to get status label
const getStatusLabel = (status: string) => {
  const statusType = FEEDBACK_STATUS_TYPES.find(type => type.code === status);
  return statusType?.name || status.charAt(0).toUpperCase() + status.slice(1);
};

// Helper function to get priority label  
const getPriorityLabel = (priority: string) => {
  const priorityType = FEEDBACK_PRIORITY_TYPES.find(type => type.code === priority);
  return priorityType?.name || priority.charAt(0).toUpperCase() + priority.slice(1);
};

export function FeedbackManagement() {
  const { user } = useUser();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddFeedbackModalOpen, setIsAddFeedbackModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  
  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch feedback
  const fetchFeedback = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('userId', user.id);
      
      // Handle status filter - if showing archived, only show closed items
      if (showArchived) {
        params.append('status', 'closed');
      } else {
        // If not showing archived, filter out closed items by using status filter
        if (filterStatus !== 'all' && filterStatus !== 'closed') {
          params.append('status', filterStatus);
        }
        // If filterStatus is 'closed' but we're not showing archived, don't add status filter
        // This will show all non-closed items
      }
      
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterFeature !== 'all') params.append('feature', filterFeature);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await apiFetch(`/api/feedback?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Ensure each feedback item has proper user data structure
        const feedbackWithSafeUsers = (data.feedback || []).map((item: any) => ({
          ...item,
          user: item.user || { 
            id: item.user_id || 'unknown', 
            email: 'Unknown User', 
            first_name: null, 
            last_name: null, 
            full_name: null 
          }
        }));
        
        setFeedback(feedbackWithSafeUsers);
        setTotalCount(data.total || feedbackWithSafeUsers.length);
        setTotalPages(Math.ceil((data.total || feedbackWithSafeUsers.length) / pageSize));
      } else {
        const errorData = await response.json();
        console.error('[FeedbackManagement] API Error:', errorData);
        
        if (response.status === 403) {
          toast.error("You don't have permission to view feedback. Only super users can access this feature.");
        } else {
          toast.error("Failed to load feedback. Please try again.");
        }
      }
    } catch (error) {
      console.error('[FeedbackManagement] Fetch error:', error);
      toast.error("Failed to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchFeedback();
    }
  }, [filterStatus, filterCategory, filterPriority, filterFeature, showArchived, user?.id]);

  // Separate effect for pagination changes
  useEffect(() => {
    if (user?.id) {
      fetchFeedback();
    }
  }, [currentPage, pageSize, user?.id]);



  // Update feedback status
  const updateFeedback = async (id: string, updates: Partial<Feedback>) => {
    if (!user?.id) return;
    
    // Store original item for potential rollback
    const originalItem = feedback.find(item => item.id === id);
    if (!originalItem) return;
    
    // Optimistically update local state
    setFeedback(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
    
    try {
      const requestBody = { userId: user.id, id, ...updates };
      
      const response = await apiFetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const responseData = await response.json();
        toast.success("Feedback updated successfully");
        setIsDetailModalOpen(false);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[FeedbackManagement] Update error response:', response.status, errorData);
        throw new Error(errorData.error || `Failed to update feedback (${response.status})`);
      }
    } catch (error) {
      // Revert optimistic update on error
      setFeedback(prev => prev.map(item => 
        item.id === id ? originalItem : item
      ));
      console.error('[FeedbackManagement] Update error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update feedback. Please try again.");
    }
  };

  // Archive/unarchive feedback
  const toggleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
    
    // Store the original item for potential rollback
    const originalItem = feedback.find(item => item.id === id);
    if (!originalItem) return;
    
    // Optimistically update local state
    // If archiving and not showing archived view, remove from list
    // If restoring and showing archived view, remove from list
    if ((newStatus === 'closed' && !showArchived) || (newStatus === 'open' && showArchived)) {
      setFeedback(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
    } else {
      // Just update the status
      setFeedback(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ));
    }
    
    try {
      const requestBody = { userId: user?.id, id, status: newStatus };
      
      const response = await apiFetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success(`Feedback ${newStatus === 'closed' ? 'closed and archived' : 'restored'} successfully`);
      } else {
        throw new Error('Failed to update feedback');
      }
    } catch (error) {
      // Revert optimistic update on error
      if ((newStatus === 'closed' && !showArchived) || (newStatus === 'open' && showArchived)) {
        // Add the item back to the list
        setFeedback(prev => [...prev, originalItem]);
        setTotalCount(prev => prev + 1);
      } else {
        // Revert the status change
        setFeedback(prev => prev.map(item => 
          item.id === id ? { ...item, status: currentStatus } : item
        ));
      }
      console.error('[FeedbackManagement] Archive error:', error);
      toast.error("Failed to update feedback. Please try again.");
    }
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Delete feedback
  const deleteFeedback = async (id: string) => {
    if (!user?.id) return;
    
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }
    
    // Store the item for potential rollback
    const itemToDelete = feedback.find(item => item.id === id);
    if (!itemToDelete) return;
    
    // Optimistically remove from local state
    setFeedback(prev => prev.filter(item => item.id !== id));
    setTotalCount(prev => prev - 1);
    
    try {
      const response = await apiFetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, id }),
      });

      if (response.ok) {
        toast.success("Feedback deleted successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete feedback');
      }
    } catch (error) {
      // Revert optimistic update on error - add the item back
      setFeedback(prev => [...prev, itemToDelete]);
      setTotalCount(prev => prev + 1);
      console.error('[FeedbackManagement] Delete error:', error);
      toast.error("Failed to delete feedback. Please try again.");
    }
  };

  // Batch delete feedback
  const batchDeleteFeedback = async () => {
    if (!user?.id || selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} feedback item(s)? This action cannot be undone.`)) {
      return;
    }

    // Store items for potential rollback
    const idsToDelete = Array.from(selectedIds);
    const itemsToDelete = feedback.filter(item => selectedIds.has(item.id));
    
    // Optimistically remove from local state
    setFeedback(prev => prev.filter(item => !selectedIds.has(item.id)));
    setTotalCount(prev => prev - selectedIds.size);
    setSelectedIds(new Set());
    setIsBatchDeleting(true);

    try {
      const response = await apiFetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ids: idsToDelete }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Successfully deleted ${idsToDelete.length} feedback item(s)`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete feedback');
      }
    } catch (error) {
      // Revert optimistic update on error - add items back
      setFeedback(prev => [...prev, ...itemsToDelete]);
      setTotalCount(prev => prev + itemsToDelete.length);
      console.error('[FeedbackManagement] Batch delete error:', error);
      toast.error("Failed to delete feedback. Please try again.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Handle individual selection
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Clear selection when changing filters
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterStatus, filterCategory, filterPriority, filterFeature, showArchived]);

  // Sort feedback based on current sort field and direction
  const sortedFeedback = useMemo(() => {
    const sorted = [...feedback].sort((a, b) => {
      let aValue: any = a[sortField as keyof Feedback];
      let bValue: any = b[sortField as keyof Feedback];
      
      // Handle special cases
      if (sortField === 'user') {
        aValue = getUserDisplayName(a.user);
        bValue = getUserDisplayName(b.user);
      } else if (sortField === 'created_at' || sortField === 'updated_at' || sortField === 'archived_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [feedback, sortField, sortDirection]);

  // Use sorted feedback directly since filtering is now handled server-side
  const filteredFeedback = sortedFeedback;

  // Handle select all for current page (must be after filteredFeedback is defined)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedIds);
      filteredFeedback.forEach(item => newSelected.add(item.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      filteredFeedback.forEach(item => newSelected.delete(item.id));
      setSelectedIds(newSelected);
    }
  };

  // Check if all items on current page are selected
  const allPageItemsSelected = filteredFeedback.length > 0 && 
    filteredFeedback.every(item => selectedIds.has(item.id));
  
  // Check if some items on current page are selected
  const somePageItemsSelected = filteredFeedback.some(item => selectedIds.has(item.id));


  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                User Feedback Management
              </CardTitle>
              <CardDescription>
                View and manage user feedback, questions, and feature requests
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={batchDeleteFeedback}
                    disabled={isBatchDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isBatchDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear Selection
                  </Button>
                </>
              )}
              <Button 
                onClick={() => setIsAddFeedbackModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Feedback
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {FEEDBACK_STATUS_TYPES.map((status) => {
                    const { icon: StatusIcon, color } = getStatusIcon(status.code);
                    return (
                      <SelectItem key={status.code} value={status.code}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${color}`} />
                          {status.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {FEEDBACK_TYPES.map((type) => {
                    const IconComponent = getIconComponent(type.icon);
                    return (
                      <SelectItem key={type.code} value={type.code}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {type.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Priority</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {FEEDBACK_PRIORITY_TYPES.map((priorityType) => {
                    const { icon: PriorityIcon, color } = getPriorityIcon(priorityType.code);
                    return (
                      <SelectItem key={priorityType.code} value={priorityType.code}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon className={`h-4 w-4 ${color}`} />
                          {priorityType.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Feature</label>
              <Select value={filterFeature} onValueChange={setFilterFeature}>
                <SelectTrigger>
                  <SelectValue placeholder="All features" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Features</SelectItem>
                  {ALL_APP_FEATURES.map((feature) => (
                    <SelectItem key={feature.code} value={feature.code}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">View</label>
              <div className="flex">
                <Button
                  variant={!showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(false)}
                  className="flex-1 rounded-r-none"
                >
                  Active
                </Button>
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="flex-1 rounded-l-none"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archived
                </Button>
              </div>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center">
              <LoadingText>Loading feedback...</LoadingText>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No feedback found</p>
              <p className="text-sm mt-2">
                {showArchived ? 'No archived feedback' : 'Feedback submitted by users will appear here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allPageItemsSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all feedback on this page"
                      className={somePageItemsSelected && !allPageItemsSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('subject')}
                  >
                    <div className="flex items-center gap-1">
                      Subject
                      {getSortIcon('subject', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('feature')}
                  >
                    <div className="flex items-center gap-1">
                      Feature
                      {getSortIcon('feature', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('user')}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {getSortIcon('user', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      Priority
                      {getSortIcon('priority', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon('created_at', sortField, sortDirection)}
                    </div>
                  </TableHead>
                  {showArchived && (
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('archived_at')}
                    >
                      <div className="flex items-center gap-1">
                        Archived
                        {getSortIcon('archived_at', sortField, sortDirection)}
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((item) => {
                  const categoryInfo = getCategoryInfo(item.category);
                  const CategoryIcon = getIconComponent(categoryInfo.icon);
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <TableRow key={item.id} className={`hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                          aria-label={`Select feedback: ${item.subject || item.message.substring(0, 50)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <CategoryIcon className="h-4 w-4 text-gray-600" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[300px]">
                              <div className="font-medium truncate">
                                {item.subject || `${categoryInfo.name} from ${getUserDisplayName(item.user)}`}
                              </div>
                              <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {item.message}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
                            <div className="text-sm text-gray-600 font-normal space-y-2">
                              <div>
                                <span className="font-medium">Subject:</span> {item.subject || `${categoryInfo.name} from ${getUserDisplayName(item.user)}`}
                              </div>
                              <div>
                                <span className="font-medium">Message:</span> {item.message}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.feature ? (
                            <div className="max-w-[200px]">
                              <div className="font-medium text-gray-900 truncate">
                                {ALL_APP_FEATURES.find(f => f.code === item.feature)?.name || item.feature}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not specified</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{getUserDisplayName(item.user)}</div>
                          {item.user?.email && item.user.email !== getUserDisplayName(item.user) && (
                            <div className="text-gray-500">{item.user.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {(() => {
                            const { icon: StatusIcon, color } = getStatusIcon(item.status);
                            return (
                              <Tooltip>
                                <TooltipTrigger>
                                  <StatusIcon className={`h-5 w-5 ${color}`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getStatusLabel(item.status)}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {(() => {
                            const { icon: PriorityIcon, color } = getPriorityIcon(item.priority);
                            return (
                              <Tooltip>
                                <TooltipTrigger>
                                  <PriorityIcon className={`h-5 w-5 ${color}`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getPriorityLabel(item.priority)}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          return item.attachment_url ? (
                            <div className="flex items-center gap-2">
                              {item.attachment_type?.startsWith('image/') ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedFeedback(item);
                                      setIsDetailModalOpen(true);
                                    }}
                                    className="hover:opacity-80 transition-opacity"
                                    title="Click to view full size"
                                  >
                                    <img 
                                      src={item.attachment_url || ''} 
                                      alt="Thumbnail"
                                      className="w-16 h-16 object-cover rounded border cursor-pointer hover:shadow-md transition-shadow"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </button>
                                  <Image className="h-4 w-4 text-gray-500" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-8 w-8 text-gray-500" />
                                  <span className="text-xs text-gray-500">{item.attachment_filename}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      {showArchived && (
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {item.archived_at 
                              ? formatDistanceToNow(new Date(item.archived_at), { addSuffix: true })
                              : '-'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedFeedback(item);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleArchive(item.id, item.status);
                            }}
                            title={item.status === 'closed' ? 'Restore' : 'Close and Archive'}
                          >
                            {item.status === 'closed' ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteFeedback(item.id);
                            }}
                            title="Delete"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} feedback items
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Items per page:</label>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFeedback(null);
        }}
        onUpdate={updateFeedback}
      />

      {/* Add Feedback Modal */}
      <FeedbackModal
        isOpen={isAddFeedbackModalOpen}
        onClose={() => {
          setIsAddFeedbackModalOpen(false);
          // Refresh the feedback list after submission
          fetchFeedback();
        }}
      />
      </div>
    </TooltipProvider>
  );
}

// Detail Modal Component
function FeedbackDetailModal({
  feedback,
  isOpen,
  onClose,
  onUpdate
}: {
  feedback: Feedback | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => void;
}) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [feature, setFeature] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [featurePopoverOpen, setFeaturePopoverOpen] = useState(false);
  const [featureSearchQuery, setFeatureSearchQuery] = useState('');

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setPriority(feedback.priority);
      setFeature(feedback.feature || 'none');
      setAdminNotes(feedback.admin_notes || '');
    }
  }, [feedback]);

  // Filter features based on search query
  const filteredFeatures = useMemo(() => {
    if (!featureSearchQuery) return APP_FEATURES;
    
    const query = featureSearchQuery.toLowerCase();
    return APP_FEATURES.map(group => ({
      ...group,
      features: group.features.filter(feat =>
        feat.name.toLowerCase().includes(query) ||
        feat.description.toLowerCase().includes(query) ||
        feat.code.toLowerCase().includes(query)
      )
    })).filter(group => group.features.length > 0);
  }, [featureSearchQuery]);

  if (!feedback) return null;

  const categoryInfo = getCategoryInfo(feedback.category);
  const CategoryIcon = getIconComponent(categoryInfo.icon);

  const handleSave = () => {
    onUpdate(feedback.id, {
      status,
      priority,
      feature: feature === 'none' ? null : feature.trim() || null,
      admin_notes: adminNotes.trim() || null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5" />
            {feedback.subject || `${categoryInfo.name} from ${getUserDisplayName(feedback.user)}`}
          </DialogTitle>
          <DialogDescription>
            Submitted {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })} by {getUserDisplayName(feedback.user)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Message */}
          <div>
            <h4 className="font-medium mb-2">User Message</h4>
            <div className="bg-gray-50 border p-4 rounded-lg">
              <p className="whitespace-pre-wrap break-words">{feedback.message}</p>
            </div>
          </div>


          {/* Attachment */}
          {feedback.attachment_url && (
            <div>
              <h4 className="font-medium mb-2">Attachment</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                {feedback.attachment_type?.startsWith('image/') ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Image className="h-4 w-4" />
                      <span className="break-all">{feedback.attachment_filename}</span>
                      {feedback.attachment_size && (
                        <span className="text-gray-400">({formatFileSize(feedback.attachment_size)})</span>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-gray-100">
                      <button
                        onClick={() => {
                          // Open image in new tab for full size viewing
                          if (feedback.attachment_url) {
                            window.open(feedback.attachment_url, '_blank');
                          }
                        }}
                        className="w-full hover:opacity-90 transition-opacity cursor-pointer"
                        title="Click to view full size in new tab"
                      >
                        <img 
                          src={feedback.attachment_url || ''} 
                          alt="Feedback attachment"
                          className="max-w-full max-h-96 object-contain mx-auto cursor-pointer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </button>
                      <p className="text-xs text-gray-500 text-center mt-2">Click image to view full size</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={feedback.attachment_url || '#'} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Original
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const AttachmentIcon = getAttachmentIcon(feedback.attachment_type);
                        return <AttachmentIcon className="h-5 w-5 text-gray-500" />;
                      })()}
                      <div>
                        <p className="text-sm font-medium break-all">{feedback.attachment_filename}</p>
                        {feedback.attachment_size && (
                          <p className="text-xs text-gray-500">{formatFileSize(feedback.attachment_size)}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={feedback.attachment_url || '#'} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature Assignment */}
          <div>
            <label className="text-sm font-medium mb-2 block">Assign to Feature</label>
            <Popover open={featurePopoverOpen} onOpenChange={setFeaturePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={featurePopoverOpen}
                  className="w-full justify-between"
                >
                  {feature && feature !== 'none'
                    ? ALL_APP_FEATURES.find(f => f.code === feature)?.name
                    : "Select a feature (optional)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] max-w-[90vw] p-0">
                <Command shouldFilter={false}>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Search features..."
                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0"
                      value={featureSearchQuery}
                      onChange={(e) => setFeatureSearchQuery(e.target.value)}
                      autoFocus
                    />
                    {featureSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFeatureSearchQuery("")}
                        className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <CommandList style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <CommandGroup>
                      <CommandItem
                        key="none"
                        value="none"
                        className="cursor-pointer"
                        onSelect={() => {
                          setFeature('none');
                          setFeaturePopoverOpen(false);
                          setFeatureSearchQuery('');
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            feature === 'none' ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="text-gray-500">No feature assigned</span>
                      </CommandItem>
                    </CommandGroup>
                    {filteredFeatures.map((group) => (
                      <CommandGroup key={group.label} heading={group.label}>
                        {group.features.map((feat) => (
                          <CommandItem
                            key={feat.code}
                            value={feat.code}
                            className="cursor-pointer py-3"
                            onSelect={() => {
                              setFeature(feat.code);
                              setFeaturePopoverOpen(false);
                              setFeatureSearchQuery('');
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                feature === feat.code ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{feat.name}</span>
                              <span className="text-xs text-gray-500">{feat.description}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                    {filteredFeatures.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No features found matching "{featureSearchQuery}"
                      </div>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUS_TYPES.map((statusType) => {
                    const { icon: StatusIcon, color } = getStatusIcon(statusType.code);
                    return (
                      <SelectItem key={statusType.code} value={statusType.code}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${color}`} />
                          {statusType.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_PRIORITY_TYPES.map((priorityType) => {
                    const { icon: PriorityIcon, color } = getPriorityIcon(priorityType.code);
                    return (
                      <SelectItem key={priorityType.code} value={priorityType.code}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon className={`h-4 w-4 ${color}`} />
                          {priorityType.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Admin Notes</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this feedback..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Edit className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
