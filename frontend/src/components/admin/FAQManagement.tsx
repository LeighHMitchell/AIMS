"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getSortIcon } from '@/components/ui/table';
import { LoadingText } from '@/components/ui/loading-text';
import {
  HelpCircle,
  Eye,
  Edit,
  Trash2,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle,
  XCircle,
  Send,
  FileQuestion,
  Inbox,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Timer,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/useUser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FAQQuestion,
  FAQItem,
  FAQQuestionStatus,
  FAQ_QUESTION_STATUS_LABELS,
  FAQ_QUESTION_STATUS_COLORS,
} from '@/types/faq-enhanced';

// Helper function to get user display name
const getUserDisplayName = (user?: { first_name?: string; last_name?: string; email?: string }) => {
  if (!user) return 'Unknown User';
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.email || 'Unknown User';
};

// Helper function to get status icon and color
const getStatusIcon = (status: FAQQuestionStatus) => {
  switch (status) {
    case 'pending':
      return { icon: Clock, color: 'text-yellow-500' };
    case 'in_progress':
      return { icon: Edit, color: 'text-blue-500' };
    case 'published':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'rejected':
      return { icon: XCircle, color: 'text-red-500' };
    case 'duplicate':
      return { icon: FileQuestion, color: 'text-gray-500' };
    default:
      return { icon: HelpCircle, color: 'text-gray-400' };
  }
};

// Helper function to get sort icon

export function FAQManagement() {
  const { user } = useUser();
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'all'>('queue');
  const [questions, setQuestions] = useState<FAQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<FAQQuestion | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<FAQQuestionStatus | 'all'>('all');

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    published: 0,
    rejected: 0,
    duplicate: 0,
    // Extended stats
    pendingThisWeek: 0,
    pendingAvgWaitDays: 0,
    pendingChangePercent: 0,
    inProgressAvgDays: 0,
    inProgressOldestDays: 0,
    publishedThisMonth: 0,
    publishedChangePercent: 0,
    responseRate: 0,
    avgResolutionDays: 0,
  });

  // Fetch questions
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSubTab === 'queue') {
        // Queue shows pending and in_progress (not yet answered)
        // Don't pass status filter - we'll filter client-side or use a special param
        params.append('status', 'pending,in_progress');
      } else if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/faq/questions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.data || []);
        setTotalCount(data.pagination?.total || 0);
        setStats({
          pending: data.stats?.pending || 0,
          in_progress: data.stats?.in_progress || 0,
          published: data.stats?.published || 0,
          rejected: data.stats?.rejected || 0,
          duplicate: data.stats?.duplicate || 0,
          pendingThisWeek: data.stats?.pendingThisWeek || 0,
          pendingAvgWaitDays: data.stats?.pendingAvgWaitDays || 0,
          pendingChangePercent: data.stats?.pendingChangePercent || 0,
          inProgressAvgDays: data.stats?.inProgressAvgDays || 0,
          inProgressOldestDays: data.stats?.inProgressOldestDays || 0,
          publishedThisMonth: data.stats?.publishedThisMonth || 0,
          publishedChangePercent: data.stats?.publishedChangePercent || 0,
          responseRate: data.stats?.responseRate || 0,
          avgResolutionDays: data.stats?.avgResolutionDays || 0,
        });
      } else {
        toast.error('Failed to load questions');
      }
    } catch (error) {
      console.error('[FAQManagement] Fetch error:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [activeSubTab, filterStatus, currentPage]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sort questions
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      let aValue: any = a[sortField as keyof FAQQuestion];
      let bValue: any = b[sortField as keyof FAQQuestion];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

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
  }, [questions, sortField, sortDirection]);

  // Update question
  const updateQuestion = async (id: string, updates: Partial<FAQQuestion>) => {
    try {
      const response = await fetch(`/api/faq/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success('Question updated successfully');
        fetchQuestions();
        setIsDetailModalOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('[FAQManagement] Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update question');
    }
  };

  // Publish question as FAQ
  const publishQuestion = async (questionId: string, answer: string, category: string) => {
    try {
      const response = await fetch(`/api/faq/questions/${questionId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, category }),
      });

      if (response.ok) {
        toast.success('Question published as FAQ');
        fetchQuestions();
        setIsDetailModalOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish question');
      }
    } catch (error) {
      console.error('[FAQManagement] Publish error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish question');
    }
  };

  // Delete question
  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`/api/faq/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Question deleted');
        fetchQuestions();
      } else {
        toast.error('Failed to delete question');
      }
    } catch (error) {
      console.error('[FAQManagement] Delete error:', error);
      toast.error('Failed to delete question');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  FAQ Management
                </CardTitle>
                <CardDescription>
                  Manage user questions and FAQ entries
                </CardDescription>
              </div>
              <div className="flex gap-3">
                {/* Pending Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Pending</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.pending}</p>
                  <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-200 pt-1">
                    <span className="text-[10px] text-gray-500">+{stats.pendingThisWeek} this week</span>
                    <span className="text-[10px] text-gray-500">Avg {stats.pendingAvgWaitDays.toFixed(1)}d wait</span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      {stats.pendingChangePercent >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stats.pendingChangePercent >= 0 ? '+' : ''}{stats.pendingChangePercent}% vs last month
                    </span>
                  </div>
                </div>

                {/* In Progress Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">In Progress</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.in_progress}</p>
                  <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-200 pt-1">
                    <span className="text-[10px] text-gray-500">Avg {stats.inProgressAvgDays.toFixed(1)}d to answer</span>
                    <span className="text-[10px] text-gray-500">Oldest: {stats.inProgressOldestDays}d</span>
                  </div>
                </div>

                {/* Published Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Published</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.published}</p>
                  <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-200 pt-1">
                    <span className="text-[10px] text-gray-500">+{stats.publishedThisMonth} this month</span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      {stats.publishedChangePercent >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stats.publishedChangePercent >= 0 ? '+' : ''}{stats.publishedChangePercent}% vs last month
                    </span>
                  </div>
                </div>

                {/* Response Rate & Resolution Time Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Performance</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.responseRate}%</p>
                  <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-200 pt-1">
                    <span className="text-[10px] text-gray-500">Response rate</span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <Timer className="h-3 w-3" />
                      {stats.avgResolutionDays.toFixed(1)}d avg resolution
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Sub-tabs */}
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'queue' | 'all')}>
          <TabsList>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Question Queue
              {stats.pending > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              All Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {/* Queue filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <Label className="text-sm mb-1 block">Filter by Status</Label>
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FAQQuestionStatus | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Pending & In Progress</SelectItem>
                        <SelectItem value="pending">Pending Only</SelectItem>
                        <SelectItem value="in_progress">In Progress Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <QuestionTable
              questions={sortedQuestions}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onView={(q) => {
                setSelectedQuestion(q);
                setIsDetailModalOpen(true);
              }}
              onDelete={deleteQuestion}
            />
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {/* All questions filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <Label className="text-sm mb-1 block">Filter by Status</Label>
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FAQQuestionStatus | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <QuestionTable
              questions={sortedQuestions}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onView={(q) => {
                setSelectedQuestion(q);
                setIsDetailModalOpen(true);
              }}
              onDelete={deleteQuestion}
            />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} questions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail Modal */}
        <QuestionDetailModal
          question={selectedQuestion}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedQuestion(null);
          }}
          onUpdate={updateQuestion}
          onPublish={publishQuestion}
        />
      </div>
    </TooltipProvider>
  );
}

// Question Table Component
function QuestionTable({
  questions,
  loading,
  sortField,
  sortDirection,
  onSort,
  onView,
  onDelete,
}: {
  questions: FAQQuestion[];
  loading: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  onView: (q: FAQQuestion) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 text-center">
            <LoadingText>Loading questions...</LoadingText>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="font-medium">No questions found</p>
            <p className="text-sm mt-2">Questions submitted by users will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort('question')}
                >
                  <div className="flex items-center gap-1">
                    Question
                    {getSortIcon('question', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => onSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Submitted
                    {getSortIcon('createdAt', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => {
                const { icon: StatusIcon, color } = getStatusIcon(question.status);
                return (
                  <TableRow key={question.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <StatusIcon className={`h-5 w-5 ${color}`} />
                        </TooltipTrigger>
                        <TooltipContent>
                          {FAQ_QUESTION_STATUS_LABELS[question.status]}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[400px]">
                        <div className="font-medium truncate">{question.question}</div>
                        {question.context && (
                          <div className="text-sm text-gray-500 truncate mt-1">
                            {question.context}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{getUserDisplayName(question.user)}</div>
                        {question.user?.email && (
                          <div className="text-gray-500 text-xs">{question.user.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {question.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {question.tags?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{question.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(question)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(question.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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
  );
}

// Question Detail Modal
function QuestionDetailModal({
  question,
  isOpen,
  onClose,
  onUpdate,
  onPublish,
}: {
  question: FAQQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<FAQQuestion>) => void;
  onPublish: (questionId: string, answer: string, category: string) => void;
}) {
  const [status, setStatus] = useState<FAQQuestionStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (question) {
      setStatus(question.status);
      setAdminNotes(question.adminNotes || '');
      setAnswer('');
      setCategory('General');
    }
  }, [question]);

  if (!question) return null;

  const handleSave = () => {
    onUpdate(question.id, {
      status,
      adminNotes,
    });
  };

  const handlePublish = async () => {
    if (!answer.trim()) {
      toast.error('Please provide an answer');
      return;
    }
    if (!category.trim()) {
      toast.error('Please provide a category');
      return;
    }
    setIsPublishing(true);
    await onPublish(question.id, answer, category);
    setIsPublishing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Question Details
          </DialogTitle>
          <DialogDescription>
            Submitted {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })} by {getUserDisplayName(question.user)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question */}
          <div>
            <Label className="font-medium">Question</Label>
            <div className="bg-gray-50 border p-4 rounded-lg mt-2">
              <p className="whitespace-pre-wrap">{question.question}</p>
            </div>
          </div>

          {/* Context */}
          {question.context && (
            <div>
              <Label className="font-medium">Context</Label>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-2">
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{question.context}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div>
              <Label className="font-medium">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {question.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label className="font-medium">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FAQQuestionStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin Notes */}
          <div>
            <Label className="font-medium">Admin Notes (Internal)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this question..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Divider */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Send className="h-5 w-5" />
              Publish as FAQ
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="font-medium">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Activities, Transactions, Reporting"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="font-medium">Answer</Label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write a comprehensive answer to this question..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Edit className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !answer.trim() || !category.trim()}
          >
            {isPublishing ? (
              <>Publishing...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish as FAQ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
