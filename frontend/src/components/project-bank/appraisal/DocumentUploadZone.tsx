"use client"

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import type { ProjectDocument, DocumentType } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface DocumentUploadZoneProps {
  projectId: string | null;
  stage: string;
  documents: ProjectDocument[];
  onDocumentsChange: () => void;
  acceptedTypes?: DocumentType[];
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  concept_note: 'Concept Note',
  project_proposal: 'Project Proposal',
  preliminary_fs_report: 'Preliminary FS Report',
  cost_estimate: 'Cost Estimate',
  environmental_screening: 'Environmental Screening',
  msdp_alignment_justification: 'MSDP Alignment Justification',
  firr_calculation_workbook: 'FIRR Calculation Workbook',
  eirr_calculation_workbook: 'EIRR Calculation Workbook',
  cost_benefit_analysis: 'Cost-Benefit Analysis',
  detailed_fs_report: 'Detailed FS Report',
  vgf_calculation: 'VGF Calculation',
  risk_allocation_matrix: 'Risk Allocation Matrix',
  funding_request: 'Funding Request',
  cabinet_approval: 'Cabinet Approval',
  monitoring_report: 'Monitoring Report',
  other: 'Other',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentUploadZone({
  projectId,
  stage,
  documents,
  onDocumentsChange,
  acceptedTypes,
}: DocumentUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>(acceptedTypes?.[0] || 'other');

  const stageDocuments = documents.filter(d => d.upload_stage === stage);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!projectId || acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', selectedType);
        formData.append('upload_stage', stage);

        await apiFetch(`/api/project-bank/${projectId}/documents`, {
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
  }, [projectId, stage, selectedType, onDocumentsChange]);

  const handleDelete = async (docId: string) => {
    if (!projectId) return;
    setDeleting(docId);
    try {
      await apiFetch(`/api/project-bank/${projectId}/documents/${docId}`, {
        method: 'DELETE',
      });
      onDocumentsChange();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !projectId || uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const typeOptions = acceptedTypes || (['other'] as DocumentType[]);

  return (
    <div className="space-y-3">
      {/* Document type selector */}
      {typeOptions.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Document type:</label>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as DocumentType)}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            {typeOptions.map(type => (
              <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Dropzone */}
      {projectId ? (
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
                {isDragActive ? 'Drop files here' : 'Drag files here or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">PDF, Excel, Word, CSV, images (max 50 MB)</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-4 text-center opacity-50">
          <p className="text-sm text-muted-foreground">Save the project first to upload documents</p>
        </div>
      )}

      {/* Existing documents */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
              >
                {deleting === doc.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
