"use client"

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  GitBranch, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileDown,
  Shield
} from 'lucide-react';
import { 
  ImportEntityType, 
  ImportState, 
  SystemField, 
  FieldMapping,
  ImportResults as ImportResultsType,
  getFieldsForEntityType 
} from '@/types/import';
import { parseFile } from '@/lib/file-parser';
import { downloadTemplate, ImportLogger } from '@/lib/import-utils';
import { FileUpload } from './FileUpload';
import { FieldMapper } from './FieldMapper';
import { ImportResults } from './ImportResults';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

interface ImportWizardProps {
  entityType: ImportEntityType;
  onImport: (data: any[], mappings: FieldMapping[], fileName?: string) => Promise<ImportResultsType>;
  requiredPermission?: string;
}

const STEPS = [
  { id: 'upload', title: 'Upload File', icon: Upload },
  { id: 'map', title: 'Map Fields', icon: GitBranch },
  { id: 'results', title: 'Import Results', icon: CheckCircle },
];

export function ImportWizard({ entityType, onImport, requiredPermission }: ImportWizardProps) {
  const router = useRouter();
  const { user, permissions } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  
  const [importState, setImportState] = useState<ImportState>({
    file: null,
    fileData: [],
    columns: [],
    mappings: [],
    validationErrors: [],
    importResults: undefined,
  });

  const systemFields = getFieldsForEntityType(entityType);

  // Check permissions
  const hasPermission = React.useMemo(() => {
    if (!requiredPermission) return true;
    if (!user) return true; // Allow if no user context (demo mode)
    if (user?.role === 'super_user') return true;
    if (requiredPermission === 'admin' && (user?.role === 'gov_partner_tier_1' || user?.role === 'dev_partner_tier_1')) return true;
    return false;
  }, [user, requiredPermission]);

  // Initialize mappings when fields are loaded
  React.useEffect(() => {
    setImportState(prev => ({
      ...prev,
      mappings: systemFields.map(field => ({
        systemFieldId: field.id,
        fileColumnIndex: null,
      })),
    }));
  }, [systemFields]);

  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(entityType, systemFields);
  }, [entityType, systemFields]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data, columns } = await parseFile(file);
      
      if (data.length === 0) {
        setError("The file appears to be empty");
        return;
      }

      setImportState(prev => ({
        ...prev,
        file,
        fileData: data,
        columns,
        validationErrors: [],
      }));
      
      setCurrentStep(1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMappingsChange = useCallback((mappings: FieldMapping[]) => {
    setImportState(prev => ({
      ...prev,
      mappings,
    }));
  }, []);

  const handleImport = useCallback(async () => {
    setError(null);
    
    // Validate required fields are mapped
    const unmappedRequired = systemFields.filter(
      field => field.required && 
      !importState.mappings.find(m => m.systemFieldId === field.id && m.fileColumnIndex !== null)
    );

    if (unmappedRequired.length > 0) {
      setError(`Please map all required fields: ${unmappedRequired.map(f => f.name).join(', ')}`);
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const results = await onImport(importState.fileData, importState.mappings, importState.file?.name);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Log the import
      if (user && importState.file) {
        await ImportLogger.logImport(
          entityType,
          importState.fileData.length,
          results.successful,
          results.failed,
          user.id,
          importState.file.name
        );
      }
      
      setImportState(prev => ({
        ...prev,
        importResults: results,
      }));
      
      setCurrentStep(2);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred during import");
    } finally {
      setIsProcessing(false);
      setImportProgress(0);
    }
  }, [importState.fileData, importState.mappings, importState.file, onImport, systemFields, entityType, user]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setImportState({
      file: null,
      fileData: [],
      columns: [],
      mappings: systemFields.map(field => ({
        systemFieldId: field.id,
        fileColumnIndex: null,
      })),
      validationErrors: [],
      importResults: undefined,
    });
    setCurrentStep(0);
    setError(null);
    setImportProgress(0);
  }, [systemFields]);

  const handleViewImported = useCallback(() => {
    router.push(`/${entityType}`);
  }, [entityType, router]);

  // Show permission denied if user doesn't have access
  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to perform bulk imports. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      rounded-full p-2 transition-colors
                      ${isActive ? 'bg-primary text-primary-foreground' : 
                        isCompleted ? 'bg-primary/20 text-primary' : 
                        'bg-muted text-muted-foreground'}
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`
                      font-medium hidden sm:block
                      ${isActive ? 'text-primary' : 
                        isCompleted ? 'text-primary' : 
                        'text-muted-foreground'}
                    `}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-4 transition-colors
                      ${isCompleted ? 'bg-primary' : 'bg-muted'}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Upload {entityType} Data</h2>
                <p className="text-muted-foreground mt-1">
                  Select a CSV or Excel file containing your {entityType} data
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            <FileUpload 
              onFileSelect={handleFileSelect}
              isLoading={isProcessing}
            />
          </div>
        )}

        {currentStep === 1 && importState.file && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Map Your Fields</h2>
              <p className="text-muted-foreground mt-1">
                Drag and drop file columns to match with system fields
              </p>
            </div>
            
            {/* File Preview */}
            <Alert>
              <AlertDescription>
                <strong>File:</strong> {importState.file.name} | 
                <strong> Rows:</strong> {importState.fileData.length} | 
                <strong> Columns:</strong> {importState.columns.length}
              </AlertDescription>
            </Alert>

            <FieldMapper
              systemFields={systemFields}
              fileColumns={importState.columns}
              mappings={importState.mappings}
              onMappingsChange={handleMappingsChange}
              entityType={entityType}
            />

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isProcessing}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Import Data
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            {isProcessing && importProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Importing...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && importState.importResults && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Import Complete</h2>
              <p className="text-muted-foreground mt-1">
                Your {entityType} data has been processed
              </p>
            </div>
            
            <ImportResults
              results={importState.importResults}
              entityType={entityType}
              onBack={handleReset}
              onViewImported={handleViewImported}
            />
          </div>
        )}
      </Card>
    </div>
  );
}