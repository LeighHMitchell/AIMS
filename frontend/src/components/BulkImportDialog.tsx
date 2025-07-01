"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface BulkImportDialogProps {
  trigger?: React.ReactNode;
  onImportComplete?: (result: any) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onImport?: (data: any[]) => Promise<any>;
  entityType?: string;
}

export function BulkImportDialog({ 
  trigger, 
  onImportComplete, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  onImport,
  entityType = "items"
}: BulkImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange || setInternalOpen;
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please select a valid CSV or Excel file');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      if (onImport) {
        // Use the provided onImport function
        const result = await onImport([]);
        if (onImportComplete) {
          onImportComplete(result);
        }
      } else {
        // Default file upload behavior
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/activities/bulk-import', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Import failed');
        }

        const result = await response.json();
        
        if (onImportComplete) {
          onImportComplete(result);
        }
      }
      
      setIsOpen(false);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <Upload className="h-4 w-4" />
      Bulk Import
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}