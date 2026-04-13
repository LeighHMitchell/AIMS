"use client"

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, ExternalLink, X, Eye, Download, AlertCircle, Check, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

export interface TransactionDocument {
  id: string;
  transactionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  externalUrl?: string;
  description?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

interface TransactionDocumentUploadProps {
  transactionId?: string;
  activityId?: string;
  documents: TransactionDocument[];
  onDocumentsChange: (documents: TransactionDocument[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export function TransactionDocumentUpload({
  transactionId,
  activityId,
  documents = [],
  onDocumentsChange,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 50 // 50MB default
}: TransactionDocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // External links state
  const [externalUrl, setExternalUrl] = useState('');
  const [urlDescription, setUrlDescription] = useState('');
  const [externalLinks, setExternalLinks] = useState<{ url: string; description: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accepted file types for transaction evidence
  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const acceptedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xlsx', 'xls', 'csv', 'doc', 'docx'];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(file.type) && !acceptedExtensions.includes(fileExtension || '')) {
      return 'Unsupported file type. Please upload PDF, images, Excel, Word, or CSV files.';
    }

    // Check max files limit
    if (documents.length >= maxFiles) {
      return `Maximum ${maxFiles} documents allowed per transaction`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<TransactionDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transactionId', transactionId || 'temp');
    if (activityId) {
      formData.append('activityId', activityId);
    }

    try {
      const response = await apiFetch('/api/transactions/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      return {
        id: result.id,
        transactionId: transactionId || 'temp',
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
        fileUrl: result.fileUrl,
        uploadedAt: new Date(result.uploadedAt),
        uploadedBy: 'current-user' // Will be set by API
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (disabled) return;

    const newDocuments: TransactionDocument[] = [];
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const error = validateFile(file);
        
        if (error) {
          toast.error(`Error uploading ${file.name}: ${error}`);
          continue;
        }

        const document = await uploadFile(file);
        newDocuments.push(document);
      }

      if (newDocuments.length > 0) {
        onDocumentsChange([...documents, ...newDocuments]);
        toast.success(`${newDocuments.length} document(s) uploaded successfully`);
      }
    } catch (error) {
      toast.error('Failed to upload documents');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [disabled, documents, onDocumentsChange, validateFile, uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  }, [handleFileUpload]);

  // Add handler to add a link to the list
  const handleAddExternalLink = async () => {
    if (!externalUrl.trim()) {
      toast.error('Please enter a URL.');
      return;
    }
    try {
      let url = externalUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      const response = await apiFetch('/api/transactions/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transactionId || 'temp',
          activityId: activityId || null,
          externalUrl: url,
          fileName: urlDescription.trim() || url,
          description: urlDescription.trim() || null,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const newDoc: TransactionDocument = {
          id: result.id,
          transactionId: transactionId || 'temp',
          fileName: result.fileName,
          fileSize: 0,
          fileType: 'external',
          fileUrl: '',
          externalUrl: result.externalUrl,
          uploadedAt: new Date(result.uploadedAt),
          uploadedBy: 'current-user',
        };
        onDocumentsChange([...documents, newDoc]);
        toast.success('Link added successfully');
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to add link');
      }
    } catch {
      toast.error('Failed to add link');
    }
    setExternalUrl('');
    setUrlDescription('');
  };

  // Add handler to remove a link from the list
  const handleRemoveExternalLink = (idx: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== idx));
  };

  const removeDocument = async (documentId: string) => {
    try {
      const response = await apiFetch(`/api/transactions/documents?id=${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      onDocumentsChange(documents.filter(doc => doc.id !== documentId));
      toast.success('Document removed');
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove document');
    }
  };

  const handleRename = useCallback(async (docId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const response = await apiFetch(`/api/transactions/documents?id=${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newName.trim() }),
      });
      if (response.ok) {
        onDocumentsChange(documents.map(d => d.id === docId ? { ...d, fileName: newName.trim() } : d));
      } else {
        toast.error('Failed to rename document');
      }
    } catch {
      toast.error('Failed to rename document');
    }
    setRenamingId(null);
  }, [documents, onDocumentsChange]);

  const getFileIcon = (fileType: string | undefined | null) => {
    if (!fileType) return <FileText className="h-4 w-4 text-muted-foreground" />;
    if (fileType === 'external') return <ExternalLink className="h-4 w-4 text-muted-foreground" />;
    if (fileType.includes('image')) return <Eye className="h-4 w-4 text-muted-foreground" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold">Upload Transaction Evidence</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop documents here, or click to browse
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Supported: PDF, Images, Excel, Word, CSV (Max {maxFileSize}MB each)</p>
              <p>Maximum {maxFiles} documents per transaction</p>
            </div>
            
            <div className="flex gap-2 justify-center">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={acceptedExtensions.map(ext => `.${ext}`).join(',')}
                onChange={handleFileInput}
                disabled={disabled || uploading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading || documents.length >= maxFiles}
              >
                Browse Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Document Links Section */}
      <div>
        <h4 className="text-sm font-medium mb-3">Add External Document Links</h4>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="external-url">URL</Label>
            <Input
              id="external-url"
              type="url"
              placeholder="https://example.com/doc.pdf"
              value={externalUrl}
              onChange={e => setExternalUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url-description">
              Description
            </Label>
            <Input
              id="url-description"
              type="text"
              placeholder="Invoice, contract, etc."
              value={urlDescription}
              onChange={e => setUrlDescription(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleAddExternalLink}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Add Link
          </Button>
          {externalLinks.length > 0 && (
            <div className="space-y-2 mt-3">
              {externalLinks.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-blue-700 truncate">{link.url}</p>
                    {link.description && <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExternalLink(idx)}
                    aria-label="Remove link"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Documents and Links */}
      {documents.length > 0 && (
        <div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: '0.375rem', overflow: 'hidden' }}>
            <div className="bg-surface-muted px-3 py-2" style={{ borderBottom: '1px solid #d1d5db' }}>
              <h4 className="text-sm font-medium">Uploaded Documents and Links</h4>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-surface-muted">
                <tr className="bg-muted/50 text-muted-foreground border-b">
                  <th className="text-left py-2 px-3 font-medium w-8"></th>
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium w-28">Size</th>
                  <th className="text-left py-2 px-3 font-medium w-24">Date</th>
                  <th className="py-2 px-1 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-2 px-3">{getFileIcon(doc.fileType)}</td>
                    <td className="py-2 px-3">
                      {renamingId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(doc.id, renameValue);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRename(doc.id, renameValue)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRenamingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm truncate block">{doc.fileName}</span>
                          {doc.externalUrl && (
                            <span className="text-blue-600 truncate block font-mono">{doc.externalUrl}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{doc.fileSize > 0 ? formatFileSize(doc.fileSize) : '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</td>
                    <td className="py-1 px-1">
                      <div className="flex items-center">
                        {renamingId !== doc.id && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setRenamingId(doc.id); setRenameValue(doc.fileName); }} disabled={disabled}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => doc.externalUrl ? window.open(doc.externalUrl, '_blank') : doc.fileUrl && window.open(doc.fileUrl, '_blank')}>
                          {doc.externalUrl ? <ExternalLink className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-red-700" onClick={() => removeDocument(doc.id)} disabled={disabled}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}