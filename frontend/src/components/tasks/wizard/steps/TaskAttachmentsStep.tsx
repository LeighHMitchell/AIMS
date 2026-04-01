'use client';

import React, { useCallback, useState } from 'react';
import { Paperclip, Upload, X, FileText, Image, Table, File, Pencil, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WizardFormData } from '../useTaskWizard';
import { formatFileSize, isValidAttachmentType, getFileIcon } from '@/hooks/useTaskAttachments';

interface TaskAttachmentsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Image,
  Table,
  File,
  Code: FileText,
  Presentation: FileText,
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function TaskAttachmentsStep({
  formData,
  updateFormData,
}: TaskAttachmentsStepProps) {
  const attachments = formData.attachments || [];
  const attachmentNames = formData.attachmentNames || {};
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check total count
      if (attachments.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 50MB limit`);
        continue;
      }

      // Check file type
      if (!isValidAttachmentType(file)) {
        errors.push(`${file.name} is not a supported file type`);
        continue;
      }

      // Check for duplicates
      if (attachments.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} is already added`);
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      updateFormData({ attachments: [...attachments, ...newFiles] });
    }

    if (errors.length > 0) {
      // Could show toast or error message here
      console.warn('File upload errors:', errors);
    }

    // Reset input
    e.target.value = '';
  }, [attachments, updateFormData]);

  const removeFile = useCallback((index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    // Shift attachment names for indices above the removed one
    const newNames: Record<number, string> = {};
    Object.entries(attachmentNames).forEach(([key, value]) => {
      const k = parseInt(key);
      if (k < index) newNames[k] = value;
      else if (k > index) newNames[k - 1] = value;
    });
    updateFormData({ attachments: newAttachments, attachmentNames: newNames });
  }, [attachments, attachmentNames, updateFormData]);

  const startRename = (index: number) => {
    const currentName = attachmentNames[index] || attachments[index].name;
    // Remove file extension for editing
    const lastDot = currentName.lastIndexOf('.');
    setEditName(lastDot > 0 ? currentName.substring(0, lastDot) : currentName);
    setEditingIndex(index);
  };

  const confirmRename = (index: number) => {
    if (editName.trim()) {
      const originalName = attachments[index].name;
      const lastDot = originalName.lastIndexOf('.');
      const ext = lastDot > 0 ? originalName.substring(lastDot) : '';
      const newName = editName.trim() + ext;
      updateFormData({
        attachmentNames: { ...attachmentNames, [index]: newName },
      });
    }
    setEditingIndex(null);
    setEditName('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a fake event to reuse the handler
      const fakeEvent = {
        target: { files },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const getIcon = (file: File) => {
    const iconName = getFileIcon(file.type);
    const IconComponent = ICON_MAP[iconName] || File;
    return IconComponent;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-start gap-3">
          <Paperclip className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">Attach Supporting Documents</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Add documents, templates, or guidance notes that recipients may need.
              Supported formats: PDF, Word, Excel, PowerPoint, images, CSV, JSON, XML.
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          attachments.length >= MAX_FILES
            ? 'border-muted bg-muted/30 cursor-not-allowed'
            : 'border-muted-foreground/20 hover:border-primary/50 cursor-pointer'
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={attachments.length >= MAX_FILES}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.xml,.jpg,.jpeg,.png,.gif,.webp"
        />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <div className="font-medium text-sm">
          {attachments.length >= MAX_FILES
            ? 'Maximum files reached'
            : 'Drop files here or click to upload'}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {attachments.length} / {MAX_FILES} files · Max 50MB per file
        </div>
      </div>

      {/* File List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Attached Files</Label>
          <div className="space-y-2">
            {attachments.map((file, index) => {
              const IconComponent = getIcon(file);
              const displayName = attachmentNames[index] || file.name;
              const isEditing = editingIndex === index;
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="p-2 rounded bg-muted">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(index);
                            if (e.key === 'Escape') { setEditingIndex(null); setEditName(''); }
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {file.name.substring(file.name.lastIndexOf('.'))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmRename(index)}
                          className="h-7 w-7 text-[hsl(var(--success-icon))] hover:text-green-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{displayName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startRename(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No attachments added. This step is optional.
        </p>
      )}
    </div>
  );
}
