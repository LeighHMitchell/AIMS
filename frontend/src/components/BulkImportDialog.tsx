"use client"

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => Promise<any>;
  entityType?: string;
}

export function BulkImportDialog({ open, onOpenChange, onImport, entityType = "activities" }: BulkImportDialogProps) {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            return row;
          });

          setCsvData(data);
          setErrors([]);
          
          // Validate required fields
          const requiredFields = ['Title'];
          const validationErrors: string[] = [];
          
          data.forEach((row, index) => {
            requiredFields.forEach(field => {
              if (!row[field]) {
                validationErrors.push(`Row ${index + 2}: Missing required field "${field}"`);
              }
            });
          });
          
          setErrors(validationErrors);
          
          if (validationErrors.length === 0) {
            toast.success(`Successfully parsed ${data.length} activities from CSV`);
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          toast.error('Error parsing CSV file');
          setErrors(['Invalid CSV format']);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const handleImport = async () => {
    if (csvData.length === 0 || errors.length > 0) return;
    
    setImporting(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      const result = await onImport(csvData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1000);
      
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import activities');
      setProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setCsvData([]);
    setErrors([]);
    setFileName("");
    setProgress(0);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = [
      'Partner ID,IATI ID,Title,Description,Activity Status,Start Date (YYYY-MM-DD),End Date (YYYY-MM-DD),Objectives,Target Groups,Collaboration Type,Sectors (semicolon separated),Tags (semicolon separated)',
      'PART001,XM-DAC-12345-001,Sample Activity,This is a sample activity description,planning,2024-01-01,2024-12-31,Improve access to education,Children and youth,Bilateral,"Education; Health","SDG4; Education"'
    ].join('\n');
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activities-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entityType?.charAt(0).toUpperCase() + entityType?.slice(1) || "Activities"}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple {entityType || "activities"} at once. 
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={downloadTemplate}
            >
              Download template
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fileName && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Drag & drop a CSV file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .csv files only
                  </p>
                </div>
              )}
            </div>
          )}

          {fileName && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-gray-500">
                    {csvData.length} {entityType || "activities"} ready to import
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    resetState();
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <h4 className="text-red-800 font-medium">Validation Errors</h4>
                <ul className="text-red-700 text-sm mt-1 space-y-1">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-red-600">... and {errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing {entityType || "activities"}...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {progress === 100 && !importing && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2 text-green-800">
                {entityType?.charAt(0).toUpperCase() + entityType?.slice(1) || "Activities"} imported successfully!
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={csvData.length === 0 || errors.length > 0 || importing}
          >
            {importing ? 'Importing...' : `Import ${csvData.length} ${entityType?.charAt(0).toUpperCase() + entityType?.slice(1) || "Activities"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}