import { useState, useCallback } from 'react';
import type {
  Task,
  TaskAssignment,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  TaskSummaryStats,
  TaskListResponse,
  TaskDetailResponse,
  AssignedTasksResponse,
} from '@/types/task';

interface UseTasksOptions {
  userId: string;
}

interface UseTasksReturn {
  // State
  tasks: Task[];
  assignedTasks: TaskAssignment[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
  stats: TaskSummaryStats | null;
  assignedStats: TaskSummaryStats | null;

  // Actions for tasks I created
  fetchMyTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTask: (taskId: string) => Promise<TaskDetailResponse | null>;
  createTask: (data: CreateTaskRequest) => Promise<Task | null>;
  updateTask: (taskId: string, data: UpdateTaskRequest) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;

  // Actions for tasks assigned to me
  fetchAssignedTasks: (filters?: TaskFilters) => Promise<void>;

  // Utilities
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export function useTasks({ userId }: UseTasksOptions): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskAssignment[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TaskSummaryStats | null>(null);
  const [assignedStats, setAssignedStats] = useState<TaskSummaryStats | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch tasks I created
  const fetchMyTasks = useCallback(async (filters?: TaskFilters) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);

      const response = await fetch(`/api/tasks?${params}`);
      const data: TaskListResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      setTasks(data.data || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
      console.error('[useTasks] fetchMyTasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch tasks assigned to me - MUST be defined before createTask
  const fetchAssignedTasks = useCallback(async (filters?: TaskFilters) => {
    if (!userId) {
      console.warn('[useTasks] fetchAssignedTasks: No userId provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      if (filters?.includeArchived) params.set('includeArchived', 'true');

      console.log('[useTasks] fetchAssignedTasks: Fetching for userId:', userId, 'includeArchived:', filters?.includeArchived);
      const response = await fetch(`/api/tasks/assigned?${params}`);
      const data: AssignedTasksResponse = await response.json();
      console.log('[useTasks] fetchAssignedTasks response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assigned tasks');
      }

      console.log('[useTasks] fetchAssignedTasks: Found', data.data?.length || 0, 'assigned tasks');
      // Log the statuses of returned assignments to verify updates are reflected
      console.log('[useTasks] fetchAssignedTasks: Assignment statuses:',
        data.data?.map((a: any) => ({ id: a.id, status: a.status, title: a.task?.title }))
      );
      setAssignedTasks(data.data || []);
      if (data.stats) setAssignedStats(data.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assigned tasks';
      setError(message);
      console.error('[useTasks] fetchAssignedTasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch single task with details
  const fetchTask = useCallback(async (taskId: string): Promise<TaskDetailResponse | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}?userId=${userId}`);
      const data: TaskDetailResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch task');
      }

      setSelectedTask(data.data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch task';
      setError(message);
      console.error('[useTasks] fetchTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create new task
  const createTask = useCallback(async (data: CreateTaskRequest): Promise<Task | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      const result = await response.json();
      console.log('[useTasks] createTask response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task');
      }

      // Log how many assignments were created
      if (result.assignments_created !== undefined) {
        console.log('[useTasks] Assignments created:', result.assignments_created);
        if (result.assignments_created === 0) {
          console.warn('[useTasks] WARNING: No assignments were created for this task!');
        }
      }

      // Refresh both task lists (created by me and assigned to me)
      await Promise.all([fetchMyTasks(), fetchAssignedTasks()]);

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
      console.error('[useTasks] createTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchMyTasks, fetchAssignedTasks]);

  // Update task
  const updateTask = useCallback(async (taskId: string, data: UpdateTaskRequest): Promise<Task | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }

      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...result.data } : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, ...result.data });
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      console.error('[useTasks] updateTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, selectedTask]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!userId) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete task');
      }

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      console.error('[useTasks] deleteTask error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, selectedTask]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchMyTasks(),
      fetchAssignedTasks(),
    ]);
  }, [fetchMyTasks, fetchAssignedTasks]);

  return {
    tasks,
    assignedTasks,
    selectedTask,
    loading,
    error,
    stats,
    assignedStats,
    fetchMyTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    fetchAssignedTasks,
    clearError,
    refreshAll,
  };
}
