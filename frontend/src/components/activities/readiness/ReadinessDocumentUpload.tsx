'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
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
}

export function ReadinessDocumentUpload({
  documents,
  onUpload,
  onDelete,
  onRename,
  isUploading,
  readOnly,
  isRequired = false,
}: ReadinessDocumentUploadProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const hasDocuments = documents.length > 0;

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith('image/')) {
      return '🖼️';
    }
    if (fileType === 'application/pdf') {
      return '📄';
    }
    return '📎';
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

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Supporting Document
      </Label>

      {/* Uploaded Documents List */}
      {hasDocuments && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg flex-shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="min-w-0 flex-1">
                  {editingDocId === doc.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(doc.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(doc.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditing}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.file_name}
                      </p>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); startEditing(doc); }}
                          title="Rename document"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                    {doc.uploaded_at && (
                      <> • Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</>
                    )}
                    {doc.uploaded_by_user?.name && (
                      <> by {doc.uploaded_by_user.name}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  title="Open document"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(doc.id)}
                    disabled={isUploading}
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Drop Zone */}
      {!readOnly && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer",
            isDragActive
              ? "border-foreground/50 bg-muted"
              : "border-border hover:border-muted-foreground hover:bg-muted/50",
            isUploading && "opacity-50 cursor-wait",
            readOnly && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="h-6 w-6 mx-auto text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : isDragActive ? (
            <div className="space-y-2">
              <Upload className="h-6 w-6 mx-auto text-foreground" />
              <p className="text-sm font-medium text-foreground">Drop file here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {hasDocuments ? 'Add another document' : 'Drag & drop evidence document'}
                <br />
                <span className="text-xs text-muted-foreground/60">
                  or click to browse (PDF, Word, Images - max 10MB)
                  {isRequired && ' · Recommended for completed items'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReadinessDocumentUpload;
