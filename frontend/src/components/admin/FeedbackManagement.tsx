"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FEEDBACK_TYPES, FEEDBACK_STATUS_TYPES, FEEDBACK_PRIORITY_TYPES } from '@/data/feedback-types';
import { MessageSquare, Eye, Edit, Calendar, User, HelpCircle, MessageCircle, Lightbulb, Bug, Zap, Paperclip, Download, Image, FileText, Archive, ArchiveRestore } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/useUser';

interface Feedback {
  id: string;
  category: string;
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

export function FeedbackManagement() {
  const { user } = useUser();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Fetch feedback
  const fetchFeedback = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      console.log('[FeedbackManagement] Fetching feedback for user:', user.id, 'Role:', user.role);
      
      const params = new URLSearchParams();
      params.append('userId', user.id);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      
      const response = await fetch(`/api/feedback?${params}`);
      
      console.log('[FeedbackManagement] API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[FeedbackManagement] Fetched feedback:', data);
        
        // Debug: Check if any feedback has attachments
        const feedbackWithAttachments = (data.feedback || []).filter((item: any) => item.attachment_url);
        console.log('[FeedbackManagement] Feedback items with attachments:', feedbackWithAttachments.length);
        if (feedbackWithAttachments.length > 0) {
          console.log('[FeedbackManagement] Sample attachment data:', feedbackWithAttachments[0]);
        }
        
        // Debug: Show all feedback data structure
        console.log('[FeedbackManagement] All feedback data structure:', (data.feedback || []).map((item: any) => ({
          id: item.id,
          subject: item.subject,
          hasAttachmentUrl: !!item.attachment_url,
          attachmentUrl: item.attachment_url,
          attachmentType: item.attachment_type,
          attachmentFilename: item.attachment_filename
        })));
        
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
      fetchFeedback();
    }
  }, [filterStatus, filterCategory, user?.id]);

  // Update feedback status
  const updateFeedback = async (id: string, updates: Partial<Feedback>) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, id, ...updates }),
      });

      if (response.ok) {
        toast.success("Feedback updated successfully");
        fetchFeedback();
        setIsDetailModalOpen(false);
      } else {
        throw new Error('Failed to update feedback');
      }
    } catch (error) {
      toast.error("Failed to update feedback. Please try again.");
    }
  };

  // Archive/unarchive feedback
  const toggleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'open' : 'archived';
    await updateFeedback(id, { status: newStatus });
  };

  // Filter feedback based on status, category, and archived state
  const filteredFeedback = feedback.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
    const archivedMatch = showArchived ? item.status === 'archived' : item.status !== 'archived';
    return statusMatch && categoryMatch && archivedMatch;
  });

  const getStatusBadgeVariant = (status: string) => {
    const statusType = FEEDBACK_STATUS_TYPES.find(s => s.code === status);
    switch (statusType?.color) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'blue': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };



  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback Management
          </CardTitle>
          <CardDescription>
            View and manage user feedback, questions, and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {FEEDBACK_STATUS_TYPES.map((status) => (
                    <SelectItem key={status.code} value={status.code}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">View</label>
              <div className="flex gap-2">
                <Button
                  variant={!showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(false)}
                  className="flex-1"
                >
                  Active
                </Button>
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(true)}
                  className="flex-1"
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
            <div className="py-8 text-center text-muted-foreground">
              Loading feedback...
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
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((item) => {
                  const categoryInfo = getCategoryInfo(item.category);
                  const CategoryIcon = getIconComponent(categoryInfo.icon);
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <CategoryIcon className="h-4 w-4 text-gray-600" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="font-medium truncate">
                            {item.subject || `${categoryInfo.name} from ${getUserDisplayName(item.user)}`}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                            {item.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{getUserDisplayName(item.user)}</div>
                          <div className="text-gray-500">{item.user?.email || 'Unknown'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {FEEDBACK_STATUS_TYPES.find(s => s.code === item.status)?.name || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                          {FEEDBACK_PRIORITY_TYPES.find(p => p.code === item.priority)?.name || item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Debug logging for attachment data
                          if (item.attachment_url) {
                            console.log('[FeedbackTable] Item with attachment:', {
                              id: item.id,
                              attachment_url: item.attachment_url,
                              attachment_type: item.attachment_type,
                              attachment_filename: item.attachment_filename
                            });
                          }
                          
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
                                      src={item.attachment_url} 
                                      alt="Thumbnail"
                                      className="w-16 h-16 object-cover rounded border cursor-pointer hover:shadow-md transition-shadow"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        console.error('[FeedbackTable] Image load error for:', item.attachment_url);
                                        target.style.display = 'none';
                                      }}
                                      onLoad={() => {
                                        console.log('[FeedbackTable] Image loaded successfully:', item.attachment_url);
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
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleArchive(item.id, item.status)}
                            title={item.status === 'archived' ? 'Restore' : 'Archive'}
                          >
                            {item.status === 'archived' ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
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
    </div>
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
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setPriority(feedback.priority);
      setAdminNotes(feedback.admin_notes || '');
    }
  }, [feedback]);

  if (!feedback) return null;

  const categoryInfo = getCategoryInfo(feedback.category);
  const CategoryIcon = getIconComponent(categoryInfo.icon);

  const handleSave = () => {
    onUpdate(feedback.id, {
      status,
      priority,
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{feedback.message}</p>
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
                      <span>{feedback.attachment_filename}</span>
                      {feedback.attachment_size && (
                        <span className="text-gray-400">({formatFileSize(feedback.attachment_size)})</span>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      <button
                        onClick={() => {
                          // Open image in new tab for full size viewing
                          window.open(feedback.attachment_url, '_blank');
                        }}
                        className="w-full hover:opacity-90 transition-opacity cursor-pointer"
                        title="Click to view full size in new tab"
                      >
                        <img 
                          src={feedback.attachment_url} 
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
                      <a href={feedback.attachment_url} target="_blank" rel="noopener noreferrer">
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
                        <p className="text-sm font-medium">{feedback.attachment_filename}</p>
                        {feedback.attachment_size && (
                          <p className="text-xs text-gray-500">{formatFileSize(feedback.attachment_size)}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={feedback.attachment_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUS_TYPES.map((statusType) => (
                    <SelectItem key={statusType.code} value={statusType.code}>
                      {statusType.name}
                    </SelectItem>
                  ))}
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
                  {FEEDBACK_PRIORITY_TYPES.map((priorityType) => (
                    <SelectItem key={priorityType.code} value={priorityType.code}>
                      {priorityType.name}
                    </SelectItem>
                  ))}
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
