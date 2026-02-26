"use client"

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import type { SEETransferDocument, SEEDocumentType } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface SEEDocumentUploadZoneProps {
  transferId: string;
  stage: string;
  documentType: SEEDocumentType;
  documents: SEETransferDocument[];
  onDocumentsChange: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<SEEDocumentType, string> = {
  financial_statements: 'Financial Statements',
  audit_report: 'Audit Report',
  valuation_certificate: 'Valuation Certificate',
  asset_register: 'Asset Register',
  restructuring_plan: 'Restructuring Plan',
  tender_document: 'Tender Document',
  transfer_agreement: 'Transfer Agreement',
  other: 'Other',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function SEEDocumentUploadZone({
  transferId,
  stage,
  documentType,
  documents,
  onDocumentsChange,
}: SEEDocumentUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const stageDocuments = documents.filter(d => d.upload_stage === stage);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        formData.append('upload_stage', stage);

        await apiFetch(`/api/see-transfers/${transferId}/documents`, {
          method: 'POST',
          body: formData,
        });
      }
      onDocumentsChange();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [transferId, stage, documentType, onDocumentsChange]);

  const handleDelete = async (docId: string) => {
    setDeleting(docId);
    try {
      // Note: DELETE endpoint would need to be added for individual docs
      // For now, just refresh
      onDocumentsChange();
    } finally {
      setDeleting(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          uploading && 'opacity-50 cursor-wait',
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'Drop files here' : `Drag ${DOCUMENT_TYPE_LABELS[documentType]} here or click to upload`}
            </p>
            <p className="text-xs text-muted-foreground">PDF, Excel, Word, CSV, images (max 50 MB)</p>
          </div>
        )}
      </div>

      {stageDocuments.length > 0 && (
        <div className="space-y-1.5">
          {stageDocuments.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm truncate">{doc.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    {doc.file_size && ` · ${formatFileSize(doc.file_size)}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
