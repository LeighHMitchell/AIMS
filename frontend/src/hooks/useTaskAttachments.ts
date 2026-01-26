'use client';

import { useState, useCallback } from 'react';
import type {
  TaskAttachment,
  TaskAttachmentType,
  TaskAttachmentsResponse,
} from '@/types/task';
import { apiFetch } from '@/lib/api-fetch';

interface UseTaskAttachmentsOptions {
  userId?: string;
  taskId?: string;
}

interface UploadOptions {
  file: File;
  description?: string;
  attachmentType?: TaskAttachmentType;
  onProgress?: (progress: number) => void;
}

interface UseTaskAttachmentsReturn {
  attachments: TaskAttachment[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  fetchAttachments: () => Promise<void>;
  uploadAttachment: (options: UploadOptions) => Promise<TaskAttachment | null>;
  deleteAttachment: (attachmentId: string) => Promise<boolean>;
  getDownloadUrl: (attachmentId: string) => Promise<string | null>;
}

export function useTaskAttachments({
  userId,
  taskId,
}: UseTaskAttachmentsOptions = {}): UseTaskAttachmentsReturn {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch attachments for the task
  const fetchAttachments = useCallback(async () => {
    if (!userId || !taskId) {
      setError('User ID and Task ID are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/tasks/${taskId}/attachments?userId=${userId}`
      );
      const data: TaskAttachmentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch attachments');
      }

      setAttachments(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskAttachments] Error fetching attachments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, taskId]);

  // Upload attachment
  const uploadAttachment = useCallback(async ({
    file,
    description,
    attachmentType = 'document',
    onProgress,
  }: UploadOptions): Promise<TaskAttachment | null> => {
    if (!userId || !taskId) {
      setError('User ID and Task ID are required');
      return null;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 50MB limit');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('attachment_type', attachmentType);
      if (description) {
        formData.append('description', description);
      }

      // Using XMLHttpRequest for progress tracking
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              // Add to local state
              setAttachments(prev => [result.data, ...prev]);
              resolve(result.data);
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } else {
            const result = JSON.parse(xhr.responseText);
            reject(new Error(result.error || 'Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `/api/tasks/${taskId}/attachments`);
        xhr.send(formData);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskAttachments] Error uploading attachment:', err);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, taskId]);

  // Delete attachment
  const deleteAttachment = useCallback(async (
    attachmentId: string
  ): Promise<boolean> => {
    if (!userId || !taskId) {
      setError('User ID and Task ID are required');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/tasks/${taskId}/attachments?userId=${userId}&attachmentId=${attachmentId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete attachment');
      }

      // Remove from local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskAttachments] Error deleting attachment:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, taskId]);

  // Get download URL
  const getDownloadUrl = useCallback(async (
    attachmentId: string
  ): Promise<string | null> => {
    if (!userId || !taskId) {
      setError('User ID and Task ID are required');
      return null;
    }

    try {
      const response = await apiFetch(`/api/tasks/${taskId}/attachments/${attachmentId}?userId=${userId}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get download URL');
      }

      return result.data.download_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTaskAttachments] Error getting download URL:', err);
      return null;
    }
  }, [userId, taskId]);

  return {
    attachments,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    fetchAttachments,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get icon name based on file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'FileText';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Table';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'FileText';
  if (mimeType === 'text/plain') return 'FileText';
  if (mimeType === 'text/csv') return 'Table';
  if (mimeType.includes('json') || mimeType.includes('xml')) return 'Code';
  return 'File';
}

/**
 * Validate file type for task attachments
 */
export function isValidAttachmentType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
  ];
  return allowedTypes.includes(file.type);
}
