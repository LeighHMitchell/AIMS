import { useState, useCallback } from 'react';
import type {
  TaskAssignment,
  TaskAssignmentHistory,
  TaskStatus,
  UpdateAssignmentRequest,
  ShareTaskRequest,
  TaskShare,
} from '@/types/task';

interface UseTaskAssignmentsOptions {
  userId: string;
}

interface UseTaskAssignmentsReturn {
  // State
  loading: boolean;
  error: string | null;

  // Actions
  updateStatus: (assignmentId: string, status: TaskStatus, note?: string) => Promise<TaskAssignment | null>;
  addNote: (assignmentId: string, note: string) => Promise<TaskAssignment | null>;
  declineTask: (assignmentId: string, reason?: string) => Promise<TaskAssignment | null>;
  reassign: (assignmentId: string, newAssigneeId: string, note?: string) => Promise<TaskAssignment | null>;
  shareTask: (assignmentId: string, data: ShareTaskRequest) => Promise<TaskShare | null>;
  removeShare: (assignmentId: string, shareId: string) => Promise<boolean>;
  fetchHistory: (assignmentId: string) => Promise<TaskAssignmentHistory[]>;
  archiveTask: (assignmentId: string) => Promise<TaskAssignment | null>;
  unarchiveTask: (assignmentId: string) => Promise<TaskAssignment | null>;

  // Utilities
  clearError: () => void;
}

export function useTaskAssignments({ userId }: UseTaskAssignmentsOptions): UseTaskAssignmentsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Update assignment status
  const updateStatus = useCallback(async (
    assignmentId: string,
    status: TaskStatus,
    note?: string
  ): Promise<TaskAssignment | null> => {
    console.log('[useTaskAssignments] updateStatus called:', { assignmentId, status, userId });
    if (!userId) {
      console.warn('[useTaskAssignments] updateStatus: No userId, returning null');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const body: UpdateAssignmentRequest & { userId: string } = {
        userId,
        status,
      };

      if (status === 'completed' && note) {
        body.completion_note = note;
      }

      console.log('[useTaskAssignments] Making PUT request to:', `/api/tasks/assignments/${assignmentId}`, body);
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Check content type to avoid JSON parse errors
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[useTaskAssignments] Non-JSON response:', response.status, text.substring(0, 500));
        throw new Error(`Server error: ${response.status} - Non-JSON response`);
      }

      const result = await response.json();
      console.log('[useTaskAssignments] PUT response:', response.status, result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
      console.error('[useTaskAssignments] updateStatus error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add note to assignment
  const addNote = useCallback(async (
    assignmentId: string,
    note: string
  ): Promise<TaskAssignment | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          completion_note: note,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add note');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add note';
      setError(message);
      console.error('[useTaskAssignments] addNote error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Decline task
  const declineTask = useCallback(async (
    assignmentId: string,
    reason?: string
  ): Promise<TaskAssignment | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          status: 'declined',
          declined_reason: reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline task');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to decline task';
      setError(message);
      console.error('[useTaskAssignments] declineTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Reassign task to another user
  const reassign = useCallback(async (
    assignmentId: string,
    newAssigneeId: string,
    note?: string
  ): Promise<TaskAssignment | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reassign_to: newAssigneeId,
          reassignment_note: note,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reassign task');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reassign task';
      setError(message);
      console.error('[useTaskAssignments] reassign error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Share task with another user
  const shareTask = useCallback(async (
    assignmentId: string,
    data: ShareTaskRequest
  ): Promise<TaskShare | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to share task');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share task';
      setError(message);
      console.error('[useTaskAssignments] shareTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Remove a share
  const removeShare = useCallback(async (
    assignmentId: string,
    shareId: string
  ): Promise<boolean> => {
    if (!userId) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          share_id: shareId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove share');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove share';
      setError(message);
      console.error('[useTaskAssignments] removeShare error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch assignment history
  const fetchHistory = useCallback(async (
    assignmentId: string
  ): Promise<TaskAssignmentHistory[]> => {
    if (!userId) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}?userId=${userId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch history');
      }

      return result.history || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(message);
      console.error('[useTaskAssignments] fetchHistory error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Archive a task assignment
  const archiveTask = useCallback(async (
    assignmentId: string
  ): Promise<TaskAssignment | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          archived: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to archive task');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive task';
      setError(message);
      console.error('[useTaskAssignments] archiveTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Unarchive a task assignment
  const unarchiveTask = useCallback(async (
    assignmentId: string
  ): Promise<TaskAssignment | null> => {
    if (!userId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          archived: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unarchive task');
      }

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unarchive task';
      setError(message);
      console.error('[useTaskAssignments] unarchiveTask error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    updateStatus,
    addNote,
    declineTask,
    reassign,
    shareTask,
    removeShare,
    fetchHistory,
    archiveTask,
    unarchiveTask,
    clearError,
  };
}
