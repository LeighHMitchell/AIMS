'use client';

import { useState, useCallback } from 'react';
import type {
  TaskTemplate,
  TemplateFilters,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateListResponse,
  TemplateDetailResponse,
} from '@/types/task';

interface UseTaskTemplatesOptions {
  userId?: string;
  autoFetch?: boolean;
}

interface UseTaskTemplatesReturn {
  templates: TaskTemplate[];
  isLoading: boolean;
  error: string | null;
  total: number;
  fetchTemplates: (filters?: TemplateFilters) => Promise<void>;
  getTemplate: (id: string) => Promise<TaskTemplate | null>;
  createTemplate: (data: CreateTemplateRequest) => Promise<TaskTemplate | null>;
  updateTemplate: (id: string, data: UpdateTemplateRequest) => Promise<TaskTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  applyTemplateDefaults: (template: TaskTemplate) => Partial<CreateTemplateRequest>;
}

export function useTaskTemplates({
  userId,
  autoFetch = false,
}: UseTaskTemplatesOptions = {}): UseTaskTemplatesReturn {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch templates with optional filters
  const fetchTemplates = useCallback(async (filters: TemplateFilters = {}) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });

      if (filters.search) params.append('search', filters.search);
      if (filters.is_system_template !== undefined) {
        params.append('is_system_template', String(filters.is_system_template));
      }
      if (filters.task_type) params.append('task_type', filters.task_type);
      if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));

      const response = await fetch(`/api/tasks/templates?${params.toString()}`);
      const data: TemplateListResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.data);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskTemplates] Error fetching templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Get single template
  const getTemplate = useCallback(async (id: string): Promise<TaskTemplate | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    try {
      const response = await fetch(`/api/tasks/templates/${id}?userId=${userId}`);
      const data: TemplateDetailResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch template');
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskTemplates] Error fetching template:', err);
      return null;
    }
  }, [userId]);

  // Create template
  const createTemplate = useCallback(async (
    data: CreateTemplateRequest
  ): Promise<TaskTemplate | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      const result: TemplateDetailResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create template');
      }

      // Add to local state
      setTemplates(prev => [result.data, ...prev]);
      setTotal(prev => prev + 1);

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskTemplates] Error creating template:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update template
  const updateTemplate = useCallback(async (
    id: string,
    data: UpdateTemplateRequest
  ): Promise<TaskTemplate | null> => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      });

      const result: TemplateDetailResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update template');
      }

      // Update in local state
      setTemplates(prev =>
        prev.map(t => t.id === id ? result.data : t)
      );

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskTemplates] Error updating template:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tasks/templates/${id}?userId=${userId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete template');
      }

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== id));
      setTotal(prev => prev - 1);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskTemplates] Error deleting template:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Apply template defaults to a task form
  const applyTemplateDefaults = useCallback((
    template: TaskTemplate
  ): Partial<CreateTemplateRequest> => {
    return {
      default_title: template.default_title,
      default_body: template.default_body || undefined,
      default_send_in_app: template.default_send_in_app,
      default_send_email: template.default_send_email,
      default_priority: template.default_priority,
      default_reminder_days: template.default_reminder_days,
      default_task_type: template.default_task_type,
      default_target_scope: template.default_target_scope || undefined,
    };
  }, []);

  return {
    templates,
    isLoading,
    error,
    total,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplateDefaults,
  };
}
