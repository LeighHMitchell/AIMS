"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Download,
  FileText,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { ImportResults as ImportResultsType, ValidationError } from '@/types/import';

interface ImportResultsProps {
  results: ImportResultsType;
  entityType: string;
  onBack: () => void;
  onViewImported?: () => void;
}

export function ImportResults({
  results,
  entityType,
  onBack,
  onViewImported,
}: ImportResultsProps) {
  const { successful, failed, errors } = results;
  const total = successful + failed;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  // Group errors by field
  const errorsByField = errors.reduce((acc, error) => {
    const key = error.field;
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const downloadErrorLog = () => {
    const errorLog = errors.map(error => ({
      row: error.row,
      field: error.field,
      message: error.message,
      value: error.value,
    }));

    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${entityType}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Processed</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6 border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Successfully Imported</p>
              <p className="text-2xl font-bold text-green-700">{successful}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Failed</p>
              <p className="text-2xl font-bold text-red-700">{failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Success Rate */}
      <Card className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Import Success Rate</span>
            <Badge variant={successRate >= 80 ? "success" : successRate >= 50 ? "secondary" : "destructive"}>
              {successRate}%
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                successRate >= 80 ? 'bg-green-500' : 
                successRate >= 50 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Errors Section */}
      {failed > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Import Errors
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorLog}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Error Log
              </Button>
            </div>

            {/* Error Summary by Field */}
            <div className="space-y-3">
              {Object.entries(errorsByField).slice(0, 5).map(([field, fieldErrors]) => (
                <Alert key={field} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{field}:</strong> {fieldErrors.length} error{fieldErrors.length > 1 ? 's' : ''}
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      {fieldErrors.slice(0, 3).map((error, idx) => (
                        <li key={idx}>
                          Row {error.row}: {error.message}
                          {error.value && ` (value: "${error.value}")`}
                        </li>
                      ))}
                      {fieldErrors.length > 3 && (
                        <li>...and {fieldErrors.length - 3} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              ))}
              {Object.keys(errorsByField).length > 5 && (
                <p className="text-sm text-muted-foreground">
                  And {Object.keys(errorsByField).length - 5} more fields with errors...
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Import More
        </Button>
        
        {successful > 0 && onViewImported && (
          <Button
            onClick={onViewImported}
          >
            View Imported {entityType}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}