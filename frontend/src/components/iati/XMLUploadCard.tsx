'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface XMLUploadCardProps {
  onFileSelect: (file: File, xmlContent: string) => void;
  isProcessing?: boolean;
}

export function XMLUploadCard({ onFileSelect, isProcessing = false }: XMLUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setUploadProgress(0);

    if (acceptedFiles.length === 0) {
      return;
    }

    const xmlFile = acceptedFiles[0];

    // Validate file type
    if (!xmlFile.name.endsWith('.xml')) {
      setError('Please upload a valid XML file');
      return;
    }

    // Validate file size (max 50MB)
    if (xmlFile.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }

    setFile(xmlFile);

    // Read file content
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
      }
    };

    reader.onload = (event) => {
      const xmlContent = event.target?.result as string;
      setUploadProgress(100);
      
      // Basic XML validation
      const trimmedContent = xmlContent.trim();
      
      // Check if file is empty or just has XML declaration
      if (!trimmedContent || trimmedContent === '<?xml version="1.0" encoding="UTF-8"?>') {
        setError('XML file is empty. Please provide a valid IATI activities file with content.');
        setFile(null);
        return;
      }
      
      // Check for root element
      if (!xmlContent.includes('<iati-activities')) {
        setError('Invalid IATI XML: Missing <iati-activities> root element. Please ensure your XML file follows the IATI standard format.');
        setFile(null);
        return;
      }
      
      // Check for at least one activity
      if (!xmlContent.includes('<iati-activity')) {
        setError('No activities found in XML file. Please ensure your file contains at least one <iati-activity> element.');
        setFile(null);
        return;
      }

      onFileSelect(xmlFile, xmlContent);
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setFile(null);
    };

    reader.readAsText(xmlFile);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    multiple: false,
    disabled: isProcessing
  });

  const removeFile = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload IATI XML File</CardTitle>
        <CardDescription>
          Drag and drop your IATI XML file here or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200 ease-in-out
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              {isDragActive
                ? 'Drop the XML file here...'
                : 'Drag & drop your IATI XML file here, or click to select'}
            </p>
            <p className="text-xs text-gray-500">
              Supports IATI 2.x format • Maximum file size: 50MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Reading file...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {isProcessing && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Processing XML file... This may take a moment for large files.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 