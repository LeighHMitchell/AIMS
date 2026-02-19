'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  Trash2, 
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { ReadinessEvidenceDocument } from '@/types/readiness';

interface ReadinessDocumentUploadProps {
  documents: ReadinessEvidenceDocument[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  isUploading: boolean;
  readOnly: boolean;
  isRequired?: boolean;
}

export function ReadinessDocumentUpload({
  documents,
  onUpload,
  onDelete,
  isUploading,
  readOnly,
  isRequired = false,
}: ReadinessDocumentUploadProps) {
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

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Supporting Document
        {isRequired && (
          <span className="text-xs text-orange-600">(Recommended)</span>
        )}
      </Label>

      {/* Uploaded Documents List */}
      {hasDocuments && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center text-lg">
                  {getFileIcon(doc.file_type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
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
              <div className="flex items-center gap-2">
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
            isUploading && "opacity-50 cursor-wait",
            readOnly && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="h-6 w-6 mx-auto text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : isDragActive ? (
            <div className="space-y-2">
              <Upload className="h-6 w-6 mx-auto text-blue-500" />
              <p className="text-sm font-medium text-blue-600">Drop file here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-6 w-6 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600">
                {hasDocuments ? 'Add another document' : 'Drag & drop evidence document'}
                <br />
                <span className="text-xs text-gray-500">or click to browse (PDF, Word, Images - max 10MB)</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Required warning */}
      {isRequired && !hasDocuments && !readOnly && (
        <div className="flex items-center gap-2 text-xs text-orange-600">
          <AlertCircle className="h-3 w-3" />
          <span>Uploading evidence is recommended for completed items</span>
        </div>
      )}
    </div>
  );
}

export default ReadinessDocumentUpload;
