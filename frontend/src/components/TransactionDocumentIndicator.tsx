"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  FileText, 
  ExternalLink, 
  Eye, 
  Download,
  Paperclip
} from 'lucide-react';
import { TransactionDocument } from './TransactionDocumentUpload';

interface TransactionDocumentIndicatorProps {
  transactionId: string;
  compactView?: boolean;
}

export function TransactionDocumentIndicator({ 
  transactionId, 
  compactView = false 
}: TransactionDocumentIndicatorProps) {
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions/documents?transactionId=${transactionId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (dialogOpen || !compactView) {
      fetchDocuments();
    }
  }, [fetchDocuments, dialogOpen, compactView]);

  const getFileIcon = (fileType: string) => {
    if (fileType === 'external') return <ExternalLink className="h-3 w-3" />;
    if (fileType.includes('pdf')) return <FileText className="h-3 w-3 text-red-500" />;
    if (fileType.includes('image')) return <Eye className="h-3 w-3 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileText className="h-3 w-3 text-green-500" />;
    return <FileText className="h-3 w-3" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compact view for table cells
  if (compactView) {
    if (documents.length === 0) {
      return (
        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
          -
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <Paperclip className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Transaction Documents</DialogTitle>
                </DialogHeader>
                <DocumentsList documents={documents} loading={loading} />
              </DialogContent>
            </Dialog>
          </TooltipTrigger>
          <TooltipContent>
            <p>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full view
  return (
    <DocumentsList documents={documents} loading={loading} />
  );
}

function DocumentsList({ 
  documents, 
  loading 
}: { 
  documents: TransactionDocument[], 
  loading: boolean 
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No supporting documents
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'external') return <ExternalLink className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes('image')) return <Eye className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileText className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
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
                <ExternalLink className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}