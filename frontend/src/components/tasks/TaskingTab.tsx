"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  LayoutGrid,
  List,
  Archive,
  BarChart3,
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskTable } from './TaskTable';
import { TaskTrackingView } from './TaskTrackingView';
import { CreatedTasksTable } from './CreatedTasksTable';
import { TaskCreationWizard } from './wizard';
import { ReassignTaskModal } from './ReassignTaskModal';
import { TaskAdminDashboard } from './admin';
import { TaskDetailModal } from './TaskDetailModal';
import { EditTaskModal } from './EditTaskModal';
import { useTasks } from '@/hooks/useTasks';
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import type { Task, TaskStatus, TaskAssignment, CreateTaskRequest } from '@/types/task';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface TaskingTabProps {
  userId: string;
  canCreateTasks?: boolean;
  canViewAnalytics?: boolean;
}

export function TaskingTab({ userId, canCreateTasks = false, canViewAnalytics = false }: TaskingTabProps) {
  const [activeView, setActiveView] = useState<'assigned' | 'created' | 'analytics'>('assigned');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TaskAssignment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [editingCreatedTask, setEditingCreatedTask] = useState<Task | null>(null);

  const {
    tasks,
    assignedTasks,
    loading,
    stats,
    assignedStats,
    fetchMyTasks,
    fetchAssignedTasks,
    createTask,
    updateTask,
    deleteTask,
    refreshAll,
  } = useTasks({ userId });

  const { updateStatus, reassign, archiveTask, unarchiveTask } = useTaskAssignments({ userId });

  // Initial fetch - only run once on mount
  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when showArchived changes
  useEffect(() => {
    fetchAssignedTasks({ includeArchived: showArchived });
  }, [showArchived, fetchAssignedTasks]);

  // Handle status change
  const handleStatusChange = useCallback(async (assignmentId: string, status: TaskStatus) => {
    console.log('[TaskingTab] handleStatusChange called:', { assignmentId, status });
    const result = await updateStatus(assignmentId, status);
    console.log('[TaskingTab] updateStatus result:', result);
    if (result) {
      toast.success(`Task ${status === 'completed' ? 'completed' : status === 'in_progress' ? 'started' : 'updated'}`);
      fetchAssignedTasks({ includeArchived: showArchived });
    } else {
      toast.error('Failed to update task status');
    }
  }, [updateStatus, fetchAssignedTasks, showArchived]);

  // Handle task creation from wizard
  const handleCreateTask = useCallback(async (data: any, attachments: File[]) => {
    // Create the task first
    const result = await createTask(data);
    if (!result) {
      toast.error('Failed to create task');
      throw new Error('Failed to create task');
    }

    // Upload attachments if any (one at a time since API expects single file)
    if (attachments.length > 0 && result.id) {
      let failedCount = 0;

      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        try {
          const response = await fetch(`/api/tasks/${result.id}/attachments`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            console.error('Failed to upload attachment:', file.name);
            failedCount++;
          }
        } catch (err) {
          console.error('Error uploading attachment:', file.name, err);
          failedCount++;
        }
      }

      if (failedCount > 0) {
        toast.warning(`Task created but ${failedCount} attachment(s) failed to upload`);
      } else {
        toast.success('Task created with attachments');
        refreshAll();
        return;
      }
    }

    toast.success('Task created successfully');
    refreshAll();
  }, [createTask, userId, refreshAll]);

  // Handle archive
  const handleArchive = useCallback(async (assignmentId: string) => {
    const result = await archiveTask(assignmentId);
    if (result) {
      toast.success('Task archived');
      fetchAssignedTasks({ includeArchived: showArchived });
    } else {
      toast.error('Failed to archive task');
    }
  }, [archiveTask, fetchAssignedTasks, showArchived]);

  // Handle unarchive
  const handleUnarchive = useCallback(async (assignmentId: string) => {
    const result = await unarchiveTask(assignmentId);
    if (result) {
      toast.success('Task unarchived');
      fetchAssignedTasks({ includeArchived: showArchived });
    } else {
      toast.error('Failed to unarchive task');
    }
  }, [unarchiveTask, fetchAssignedTasks, showArchived]);

  // Handle reassign modal open
  const handleOpenReassign = useCallback((assignment: TaskAssignment) => {
    setSelectedAssignment(assignment);
    setReassignModalOpen(true);
  }, []);

  // Handle reassign
  const handleReassign = useCallback(async (assignmentId: string, newAssigneeId: string, note?: string) => {
    return await reassign(assignmentId, newAssigneeId, note);
  }, [reassign]);

  // Handle view task details
  const handleViewDetails = useCallback((assignment: TaskAssignment) => {
    if (assignment.task?.id) {
      setSelectedTaskId(assignment.task.id);
      setSelectedAssignmentId(assignment.id);
      setDetailModalOpen(true);
    }
  }, []);

  // Filter assignments based on status
  // Note: archived filtering is handled by the API via the includeArchived parameter
  let filteredAssignments = assignedTasks;

  // Filter by status
  if (statusFilter !== 'all') {
    if (statusFilter === 'overdue') {
      filteredAssignments = filteredAssignments.filter(a => a.is_overdue);
    } else {
      filteredAssignments = filteredAssignments.filter(a => a.status === statusFilter);
    }
  }

  const currentStats = activeView === 'assigned' ? assignedStats : stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tasking</h2>
          <p className="text-muted-foreground">
            {activeView === 'assigned'
              ? 'Tasks assigned to you'
              : 'Tasks you have created'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {canCreateTasks && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {currentStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">In Progress</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.in_progress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Declined</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.declined}</p>
            </CardContent>
          </Card>
          <Card className={currentStats.overdue > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Overdue</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${currentStats.overdue > 0 ? 'text-red-600' : ''}`}>
                {currentStats.overdue}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Archived</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentStats.archived ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'assigned' | 'created')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="assigned" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Assigned to Me
              {assignedStats && assignedStats.pending + assignedStats.in_progress > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {assignedStats.pending + assignedStats.in_progress}
                </Badge>
              )}
            </TabsTrigger>
            {canCreateTasks && (
              <TabsTrigger value="created" className="gap-2">
                <Plus className="h-4 w-4" />
                Created by Me
                {stats && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.total}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {canViewAnalytics && (
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-4">
            {/* View Toggle - Active/Archived */}
            {activeView === 'assigned' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">View:</span>
                <div className="flex">
                  <Button
                    variant={!showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(false)}
                    className="rounded-r-none"
                  >
                    Active
                  </Button>
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(true)}
                    className="rounded-l-none"
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archived
                  </Button>
                </div>
              </div>
            )}

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle - show for Assigned to Me and Created by Me tabs */}
            {(activeView === 'assigned' || activeView === 'created') && (
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Tasks View */}
        <TabsContent value="assigned" className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No tasks found</h3>
                <p className="text-muted-foreground text-center mt-1">
                  {statusFilter === 'all'
                    ? "You don't have any tasks assigned to you yet."
                    : `No ${statusFilter.replace('_', ' ')} tasks found.`}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssignments.map((assignment) => (
                <TaskCard
                  key={assignment.id}
                  assignment={assignment}
                  onStatusChange={(status) => handleStatusChange(assignment.id, status)}
                  onShare={() => {/* TODO: Implement share modal */}}
                  onReassign={() => handleOpenReassign(assignment)}
                  onArchive={() => handleArchive(assignment.id)}
                  onUnarchive={() => handleUnarchive(assignment.id)}
                  onViewDetails={() => handleViewDetails(assignment)}
                />
              ))}
            </div>
          ) : (
            <TaskTable
              assignments={filteredAssignments}
              onStatusChange={handleStatusChange}
              onShare={(a) => {/* TODO: Implement share modal */}}
              onReassign={(a) => handleOpenReassign(a)}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onViewDetails={handleViewDetails}
            />
          )}
        </TabsContent>

        {/* Created Tasks View */}
        {canCreateTasks && (
          <TabsContent value="created" className="mt-6">
            {viewMode === 'cards' ? (
              <TaskTrackingView
                userId={userId}
                tasks={tasks}
                loading={loading}
                onRefresh={fetchMyTasks}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
              />
            ) : (
              <CreatedTasksTable
                tasks={tasks}
                loading={loading}
                onEdit={(task) => setEditingCreatedTask(task)}
                onDelete={deleteTask}
                onViewDetails={(task) => {
                  setSelectedTaskId(task.id);
                  setSelectedAssignmentId(null);
                  setDetailModalOpen(true);
                }}
              />
            )}
          </TabsContent>
        )}

        {/* Analytics View */}
        {canViewAnalytics && (
          <TabsContent value="analytics" className="mt-6">
            <TaskAdminDashboard userId={userId} />
          </TabsContent>
        )}
      </Tabs>

      {/* Create Task Wizard - only render when open to avoid re-render loops */}
      {showCreateModal && (
        <TaskCreationWizard
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateTask}
          userId={userId}
        />
      )}

      {/* Reassign Task Modal */}
      {reassignModalOpen && selectedAssignment && (
        <ReassignTaskModal
          open={reassignModalOpen}
          onOpenChange={setReassignModalOpen}
          assignment={selectedAssignment}
          userId={userId}
          onReassign={handleReassign}
          onSuccess={() => {
            toast.success('Task reassigned successfully');
            fetchAssignedTasks({ includeArchived: showArchived });
          }}
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        taskId={selectedTaskId}
        assignmentId={selectedAssignmentId}
        userId={userId}
      />

      {/* Edit Created Task Modal */}
      {editingCreatedTask && (
        <EditTaskModal
          open={!!editingCreatedTask}
          onOpenChange={(open) => {
            if (!open) setEditingCreatedTask(null);
          }}
          task={editingCreatedTask}
          userId={userId}
          onSubmit={async (taskId, data) => {
            const result = await updateTask(taskId, data);
            if (result) {
              setEditingCreatedTask(null);
              fetchMyTasks();
            }
            return result;
          }}
          onDelete={async (taskId) => {
            const success = await deleteTask(taskId);
            if (success) {
              setEditingCreatedTask(null);
              fetchMyTasks();
            }
            return success;
          }}
        />
      )}
    </div>
  );
}
