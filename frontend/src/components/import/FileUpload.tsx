"use client"

import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
}

export function FileUpload({ 
  onFileSelect, 
  accept = '.csv,.xls,.xlsx',
  isLoading = false 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['csv', 'xls', 'xlsx'];
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      setError('Please upload a CSV or Excel file (.csv, .xls, .xlsx)');
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div>
      <Card
        className={cn(
          "border-2 border-dashed p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          isLoading && "opacity-50 pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">Upload your file</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop your CSV or Excel file here, or click to browse
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            <span>Supported formats: CSV, XLS, XLSX (Max 10MB)</span>
          </div>
          
          <label htmlFor="file-upload">
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileInput}
              disabled={isLoading}
            />
            <Button
              asChild
              variant="outline"
              disabled={isLoading}
            >
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}