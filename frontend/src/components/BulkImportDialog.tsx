"use client";

import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle, Download, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { format } from "date-fns";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => Promise<void>;
  entityType: "activities" | "partners" | "transactions";
}

export function BulkImportDialog({ open, onOpenChange, onImport, entityType }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  const getTemplateHeaders = () => {
    switch (entityType) {
      case "activities":
        return [
          "Partner ID",
          "IATI ID", 
          "Title",
          "Description",
          "Activity Status",
          "Start Date (YYYY-MM-DD)",
          "End Date (YYYY-MM-DD)",
          "Objectives",
          "Target Groups",
          "Collaboration Type",
          "Sectors (semicolon separated)",
          "Tags (semicolon separated)"
        ];
      case "partners":
        return [
          "Full Name",
          "Acronym",
          "IATI Org ID",
          "Organisation Type",
          "Country Represented",
          "Description",
          "Website",
          "Email",
          "Phone",
          "Address"
        ];
      case "transactions":
        return [
          "Activity ID",
          "Transaction Type",
          "Value",
          "Currency",
          "Transaction Date (YYYY-MM-DD)",
          "Provider Organisation",
          "Receiver Organisation",
          "Description"
        ];
      default:
        return [];
    }
  };

  const downloadTemplate = () => {
    const headers = getTemplateHeaders();
    const csv = headers.join(",");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-import-template-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): Promise<any[]> => {
    return new Promise((resolve) => {
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^,]+)/g) || [];
        const row: any = {};
        headers.forEach((header, index) => {
          const value = values[index] ? values[index].replace(/^"|"$/g, '').trim() : '';
          row[header] = value;
        });
        return row;
      });
      
      resolve(data);
    });
  };

  const validateData = (data: any[]): string[] => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of header row and 0-index
      
      switch (entityType) {
        case "activities":
          if (!row["Title"]) {
            errors.push(`Row ${rowNum}: Title is required`);
          }
          if (row["Start Date (YYYY-MM-DD)"] && !row["Start Date (YYYY-MM-DD)"].match(/^\d{4}-\d{2}-\d{2}$/)) {
            errors.push(`Row ${rowNum}: Invalid start date format`);
          }
          break;
        case "partners":
          if (!row["Full Name"] || !row["Acronym"]) {
            errors.push(`Row ${rowNum}: Full Name and Acronym are required`);
          }
          break;
        case "transactions":
          if (!row["Activity ID"] || !row["Transaction Type"] || !row["Value"]) {
            errors.push(`Row ${rowNum}: Activity ID, Transaction Type, and Value are required`);
          }
          if (isNaN(parseFloat(row["Value"]))) {
            errors.push(`Row ${rowNum}: Value must be a number`);
          }
          break;
      }
    });
    
    return errors;
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setProgress(0);
    setErrors([]);
    setImportSummary(null);
    
    try {
      const text = await file.text();
      const data = await parseCSV(text);
      
      // Validate data
      const validationErrors = validateData(data);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setImporting(false);
        return;
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Process import
      try {
        await onImport(data);
        setProgress(100);
        setImportSummary({
          total: data.length,
          success: data.length,
          failed: 0
        });
        toast.success(`Successfully imported ${data.length} ${entityType}`);
      } catch (error: any) {
        setErrors([error.message || "Import failed"]);
        setImportSummary({
          total: data.length,
          success: 0,
          failed: data.length
        });
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      setErrors(["Failed to parse CSV file"]);
    } finally {
      setImporting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === "text/csv") {
      setFile(file);
      setErrors([]);
      setImportSummary(null);
    } else {
      toast.error("Please upload a CSV file");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: importing
  });

  const reset = () => {
    setFile(null);
    setErrors([]);
    setImportSummary(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}</DialogTitle>
          <DialogDescription>
            Import multiple {entityType} from a CSV file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Need a template?</p>
              <p className="text-sm text-muted-foreground">
                Download our CSV template with all required fields
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!file && !importSummary && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
                ${importing ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-1">
                {isDragActive ? "Drop the CSV file here" : "Drag & drop your CSV file here"}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          )}

          {/* File Selected */}
          {file && !importSummary && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={reset}
                  disabled={importing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Import errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {errors.length > 5 && (
                      <li>... and {errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Summary */}
          {importSummary && (
            <Alert className={importSummary.failed > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Import completed</p>
                  <div className="text-sm space-y-1">
                    <p>Total records: {importSummary.total}</p>
                    <p className="text-green-600">Successful: {importSummary.success}</p>
                    {importSummary.failed > 0 && (
                      <p className="text-red-600">Failed: {importSummary.failed}</p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!importSummary ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || importing || errors.length > 0}
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 