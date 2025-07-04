"use client"

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, ExternalLink, X, Eye, Download, AlertCircle, Check, Loader2 } from 'lucide-react';
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
  const [externalUrl, setExternalUrl] = useState('');
  const [urlDescription, setUrlDescription] = useState('');
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
      const response = await fetch('/api/transactions/documents/upload', {
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

  const addExternalUrl = async () => {
    if (!externalUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      new URL(externalUrl); // Validate URL
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      const response = await fetch('/api/transactions/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transactionId || 'temp',
          activityId: activityId,
          externalUrl: externalUrl,
          fileName: urlDescription || 'External Document',
          description: urlDescription,
          documentType: 'evidence'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add external document');
      }

      const result = await response.json();
      
      const newDocument: TransactionDocument = {
        id: result.id,
        transactionId: transactionId || 'temp',
        fileName: result.fileName,
        fileSize: 0,
        fileType: 'external',
        externalUrl: result.externalUrl,
        description: result.description,
        uploadedAt: new Date(result.uploadedAt),
        uploadedBy: 'current-user'
      };

      onDocumentsChange([...documents, newDocument]);
      setExternalUrl('');
      setUrlDescription('');
      toast.success('External document link added');
    } catch (error) {
      console.error('Error adding external URL:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add external document');
    }
  };

  const removeDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/transactions/documents?id=${documentId}`, {
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

  const getFileIcon = (fileType: string) => {
    if (fileType === 'external') return <ExternalLink className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes('image')) return <Eye className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileText className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4" />;
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

      {/* External URL Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add External Document Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="external-url" className="text-sm">Document URL</Label>
            <Input
              id="external-url"
              type="url"
              placeholder="https://example.com/document.pdf"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url-description" className="text-sm">Description (optional)</Label>
            <Input
              id="url-description"
              placeholder="Invoice receipt, contract agreement, etc."
              value={urlDescription}
              onChange={(e) => setUrlDescription(e.target.value)}
              disabled={disabled}
            />
          </div>
          <Button
            size="sm"
            onClick={addExternalUrl}
            disabled={!externalUrl.trim() || disabled}
          >
            Add Link
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Uploaded Documents ({documents.length}/{maxFiles})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={doc.id}>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(doc.fileType)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          {doc.fileSize > 0 && <span>{formatFileSize(doc.fileSize)}</span>}
                          <span>{doc.uploadedAt.toLocaleDateString()}</span>
                          {doc.externalUrl && <Badge variant="outline" className="text-xs">External</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {doc.externalUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(doc.externalUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeDocument(doc.id)}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {index < documents.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No supporting documents uploaded yet. Add documents to provide evidence for this transaction.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}