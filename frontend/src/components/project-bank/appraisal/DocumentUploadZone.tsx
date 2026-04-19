"use client"

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apiFetch } from '@/lib/api-fetch';
import type { ProjectDocument, DocumentType } from '@/types/project-bank';
import type { PendingFile } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';

interface DocumentUploadZoneProps {
  projectId: string | null;
  stage: string;
  documents: ProjectDocument[];
  onDocumentsChange: () => void;
  acceptedTypes?: DocumentType[];
  pendingFiles?: PendingFile[];
  onPendingFilesChange?: (files: PendingFile[]) => void;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  concept_note: 'Concept Note',
  project_proposal: 'Project Proposal',
  preliminary_fs_report: 'Preliminary Feasibility Study Report',
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
  dap_compliance: 'DAP Compliance Justification',
  terms_of_reference: 'Terms of Reference (TOR)',
  budget_estimate: 'Budget Estimate',
  site_map: 'Site / Location Map',
  stakeholder_analysis: 'Stakeholder Analysis',
  endorsement_letter: 'Government Endorsement Letter',
  proponent_profile: 'Proponent Company Profile',
  environmental_impact_assessment: 'Environmental Impact Assessment',
  social_impact_assessment: 'Social Impact Assessment',
  land_acquisition_plan: 'Land Acquisition Plan',
  resettlement_plan: 'Resettlement Plan',
  technical_design: 'Technical Design',
  market_assessment: 'Market Assessment',
  other: 'Other',
};

const DOCUMENT_TYPE_CODES: Record<DocumentType, string> = {
  concept_note: 'CN',
  project_proposal: 'PP',
  preliminary_fs_report: 'PFS',
  cost_estimate: 'CE',
  environmental_screening: 'ES',
  msdp_alignment_justification: 'MAJ',
  firr_calculation_workbook: 'FIRR',
  eirr_calculation_workbook: 'EIRR',
  cost_benefit_analysis: 'CBA',
  detailed_fs_report: 'DFS',
  vgf_calculation: 'VGF',
  risk_allocation_matrix: 'RAM',
  funding_request: 'FR',
  cabinet_approval: 'CA',
  monitoring_report: 'MR',
  dap_compliance: 'DAP',
  terms_of_reference: 'TOR',
  budget_estimate: 'BE',
  site_map: 'SM',
  stakeholder_analysis: 'SA',
  endorsement_letter: 'EL',
  proponent_profile: 'CPR',
  environmental_impact_assessment: 'EIA',
  social_impact_assessment: 'SIA',
  land_acquisition_plan: 'LAP',
  resettlement_plan: 'RP',
  technical_design: 'TD',
  market_assessment: 'MA',
  other: 'OTH',
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
  pendingFiles = [],
  onPendingFilesChange,
}: DocumentUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>(acceptedTypes?.[0] || 'other');
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editDocType, setEditDocType] = useState<DocumentType>('other');
  const [saving, setSaving] = useState(false);

  const stageDocuments = documents.filter(d => d.upload_stage === stage);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // If no projectId yet, stage files locally
    if (!projectId) {
      if (onPendingFilesChange) {
        const newPending: PendingFile[] = acceptedFiles.map(file => ({
          file,
          type: selectedType,
          stage,
        }));
        onPendingFilesChange([...pendingFiles, ...newPending]);
      }
      return;
    }

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
  }, [projectId, stage, selectedType, onDocumentsChange, pendingFiles, onPendingFilesChange]);

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

  const handleRemovePending = (index: number) => {
    if (onPendingFilesChange) {
      const updated = pendingFiles.filter((_, i) => i !== index);
      onPendingFilesChange(updated);
    }
  };

  const handleStartEdit = (doc: ProjectDocument) => {
    setEditingDoc(doc.id);
    setEditFileName(doc.file_name);
    setEditDocType(doc.document_type);
  };

  const handleSaveEdit = async () => {
    if (!projectId || !editingDoc) return;
    setSaving(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/documents/${editingDoc}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: editFileName, document_type: editDocType }),
      });
      onDocumentsChange();
      setEditingDoc(null);
    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setSaving(false);
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
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const typeOptions = acceptedTypes || (['other'] as DocumentType[]);

  return (
    <div className="space-y-3">
      {/* Document type selector — label removed per plan L.1 */}
      {typeOptions.length > 1 && (
        <Select value={selectedType} onValueChange={v => setSelectedType(v as DocumentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(type => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{DOCUMENT_TYPE_CODES[type]}</span>
                  {DOCUMENT_TYPE_LABELS[type]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Dropzone — always active (staging when no projectId) */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-[#5f7f7a] bg-[#f6f5f3]' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          uploading && 'opacity-50 cursor-wait',
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-body text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-body text-muted-foreground">
              {isDragActive ? 'Drop files here' : 'Drag files here or click to upload'}
            </p>
            <p className="text-helper text-muted-foreground">PDF, Excel, Word, CSV, images (max 50 MB)</p>
          </div>
        )}
      </div>

      {/* Pending files (pre-save staging) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-1.5">
          {pendingFiles.map((pf, idx) => (
            <div
              key={`pending-${idx}`}
              className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-body truncate">{pf.file.name}</div>
                  <div className="text-helper text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending upload
                    {' · '}
                    {DOCUMENT_TYPE_LABELS[pf.type] || pf.type}
                    {' · '}
                    {formatFileSize(pf.file.size)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePending(idx)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
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
                  <div className="text-body truncate">{doc.file_name}</div>
                  <div className="text-helper text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    {doc.file_size && ` · ${formatFileSize(doc.file_size)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Popover open={editingDoc === doc.id} onOpenChange={(open) => {
                  if (open) handleStartEdit(doc);
                  else setEditingDoc(null);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 space-y-3" align="end">
                    <div>
                      <label className="text-helper font-medium text-muted-foreground">File Name</label>
                      <Input
                        value={editFileName}
                        onChange={e => setEditFileName(e.target.value)}
                        className="mt-1 h-8 text-body"
                      />
                    </div>
                    <div>
                      <label className="text-helper font-medium text-muted-foreground">Document Type</label>
                      <Select value={editDocType} onValueChange={v => setEditDocType(v as DocumentType)}>
                        <SelectTrigger className="mt-1 h-8 text-body">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {typeOptions.map(type => (
                            <SelectItem key={type} value={type}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{DOCUMENT_TYPE_CODES[type]}</span>
                                {DOCUMENT_TYPE_LABELS[type]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      Save
                    </Button>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
