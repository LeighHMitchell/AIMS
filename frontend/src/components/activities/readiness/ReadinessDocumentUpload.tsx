'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  Trash2,
  Loader2,
  Pencil,
  Check,
  X,
  HelpCircle,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { ReadinessEvidenceDocument } from '@/types/readiness';

interface ReadinessDocumentUploadProps {
  documents: ReadinessEvidenceDocument[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onRename: (documentId: string, fileName: string) => Promise<void>;
  isUploading: boolean;
  readOnly: boolean;
  isRequired?: boolean;
  guidanceText?: string | null;
}

export function ReadinessDocumentUpload({
  documents,
  onUpload,
  onDelete,
  onRename,
  isUploading,
  readOnly,
  isRequired = false,
  guidanceText,
}: ReadinessDocumentUploadProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Docs the user has confirmed removal for but whose DELETE call is still
  // pending (holds inside the undo window). They're hidden from the table
  // and their timer is kept in deferredRef so the undo toast can cancel it.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deferredRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // On unmount, flush any still-pending deletions so we don't orphan rows
  useEffect(() => {
    return () => {
      deferredRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      deferredRef.current.clear();
    };
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: readOnly || isUploading,
  });

  const getFileIcon = (fileType: string | null) => {
    const t = fileType || '';
    if (t.startsWith('image/'))
      return <FileImage className="h-4 w-4 text-muted-foreground" />;
    if (t.includes('pdf'))
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    if (t.includes('spreadsheet') || t.includes('excel') || t.includes('csv'))
      return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
    return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const startEditing = (doc: ReadinessEvidenceDocument) => {
    setEditingDocId(doc.id);
    setEditName(doc.file_name);
  };

  const cancelEditing = () => {
    setEditingDocId(null);
    setEditName('');
  };

  const saveEdit = async (docId: string) => {
    if (editName.trim()) {
      await onRename(docId, editName.trim());
    }
    setEditingDocId(null);
    setEditName('');
  };

  // Filter out docs whose deletion is in the undo window
  const visibleDocuments = documents.filter((d) => !pendingDeleteIds.has(d.id));
  const hasDocuments = visibleDocuments.length > 0;

  const confirmDeletion = () => {
    const docId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!docId) return;

    // Optimistically hide the row and start a 5s deferred deletion
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });

    const timeoutId = setTimeout(async () => {
      deferredRef.current.delete(docId);
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      try {
        await onDelete(docId);
      } catch {
        // onDelete already toasts on failure; nothing else to do
      }
    }, 5000);
    deferredRef.current.set(docId, timeoutId);

    toast('Document removed', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const t = deferredRef.current.get(docId);
          if (t) {
            clearTimeout(t);
            deferredRef.current.delete(docId);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(docId);
            return next;
          });
        },
      },
    });
  };

  const pendingDoc = confirmDeleteId
    ? documents.find((d) => d.id === confirmDeleteId) || null
    : null;

  return (
    <div className="space-y-3">
      <Label className="text-body font-medium text-foreground flex items-center gap-1.5">
        Supporting Documents
        {guidanceText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-body">{guidanceText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Label>

      {/* Upload Drop Zone — matches DocumentDropzone (Gov Inputs / Evaluation) */}
      {!readOnly && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-input hover:border-slate-400",
            (isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-body text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-body font-medium text-primary">Drop files here</p>
              ) : (
                <>
                  <p className="text-body font-medium text-foreground">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-helper text-muted-foreground">
                    PDF, Word, images up to 10.0 MB
                    {isRequired && ' · Recommended for completed items'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Uploaded Documents Table */}
      {hasDocuments && (
        <div className="relative w-full overflow-x-auto overflow-y-visible">
          <table className="w-full caption-bottom text-body border border-border dark:border-gray-700 rounded-lg">
            <thead className="bg-surface-muted">
              <tr>
                <th className="w-8 p-2" />
                <th className="text-left p-2 font-medium text-helper">File name</th>
                <th className="text-right p-2 font-medium text-helper w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleDocuments.map((doc) => {
                const isRenaming = editingDocId === doc.id;
                return (
                  <tr key={doc.id} className="hover:bg-muted/50 group">
                    <td className="p-2 align-top">{getFileIcon(doc.file_type)}</td>
                    <td className="p-2 align-top">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEdit(doc.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditing();
                            }
                          }}
                          onBlur={() => saveEdit(doc.id)}
                          className="w-full px-2 py-1 text-body font-medium border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <div className="min-w-0">
                          <span
                            className="text-body font-medium truncate block cursor-text"
                            onDoubleClick={() => !readOnly && startEditing(doc)}
                            title="Double-click to rename"
                          >
                            {doc.file_name}
                          </span>
                          <span className="text-helper text-muted-foreground block">
                            {formatFileSize(doc.file_size)}
                            {doc.uploaded_at && (
                              <> · Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</>
                            )}
                            {doc.uploaded_by_user?.name && (
                              <> by {doc.uploaded_by_user.name}</>
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isRenaming ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => saveEdit(doc.id)}
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={cancelEditing}
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {doc.file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.file_url, '_blank');
                                }}
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(doc);
                                }}
                                title="Rename"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(doc.id);
                                }}
                                disabled={isUploading}
                                title="Remove"
                              >
                                {isUploading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDoc ? (
                <>You're about to remove <span className="font-medium">{pendingDoc.file_name}</span>. You'll have 5 seconds to undo before it's permanently deleted.</>
              ) : (
                <>You'll have 5 seconds to undo before it's permanently deleted.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeletion}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ReadinessDocumentUpload;
