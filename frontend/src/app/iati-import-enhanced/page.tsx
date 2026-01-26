'use client';

import React, { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { XMLUploadCard } from '@/components/iati/XMLUploadCard';
import { ValidationSummaryPanel } from '@/components/iati/ValidationSummaryPanel';
import { FixWizardModal } from '@/components/iati/FixWizardModal';
import { FixOrphanedTransactionsStep } from '@/components/iati/FixOrphanedTransactionsStep';
import { AssignTransactionsModal } from '@/components/iati/AssignTransactionsModal';
import { AssignOrganizationsModal } from '@/components/iati/AssignOrganizationsModal';
import { MapCodesModal } from '@/components/iati/MapCodesModal';
import { PreviewTable } from '@/components/iati/PreviewTable';
import { showImportResult, showImportProgress } from '@/components/iati/ImportResultToast';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileUp, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Eye, 
  Upload,
  ChevronRight,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

interface ParseResult {
  activities: any[];
  transactions: any[];
  validationIssues: ValidationIssue[];
  statistics?: {
    totalActivities: number;
    totalTransactions: number;
    totalValue: number;
    currencies: string[];
  };
  summary?: {
    totalActivities: number;
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    transactionsNeedingAssignment: number;
    unmappedCodesCount?: number;
  };
  orphanTransactions?: { index: number; activityRef: string; transaction: any }[];
  existingActivities?: Array<{
    id: string;
    iati_id: string;
    title: string;
  }>;
  unmappedCodes?: {
    [codeType: string]: string[];
  };
}

interface ValidationIssue {
  type: 'missing_currency' | 'missing_activity' | 'unmapped_code' | 'missing_org' | 'missing_required' | 'invalid_value';
  severity: 'error' | 'warning';
  count: number;
  details: {
    activityId?: string;
    transactionIndex?: number;
    field?: string;
    value?: any;
    message: string;
  }[];
}

interface FixSet {
  currencyFixes: Record<number, string>;
  activityMappings: Record<string, string>;
  codeMappings: Record<string, Record<string, string>>;
  organizationFixes: Record<number, { provider?: string; receiver?: string }>;
  skipTransactions: number[];
}

const steps = [
  { label: 'Upload', description: 'Upload IATI XML file', icon: FileUp },
  { label: 'Validate', description: 'Check for issues', icon: AlertTriangle },
  { label: 'Fix', description: 'Resolve problems', icon: Wrench },
  { label: 'Preview', description: 'Review data', icon: Eye },
  { label: 'Import', description: 'Save to database', icon: Upload }
];

export default function IATIImportEnhancedPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFixWizard, setShowFixWizard] = useState(false);
  const [showOrphanFix, setShowOrphanFix] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [showMapCodesModal, setShowMapCodesModal] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<FixSet | null>(null);
  const [orphanResolutions, setOrphanResolutions] = useState<{
    resolved: Record<number, string>;
    skipped: number[];
  }>({ resolved: {}, skipped: [] });
  const [existingActivities, setExistingActivities] = useState<any[]>([]);
  const [existingOrganizations, setExistingOrganizations] = useState<any[]>([]);
  const [transactionAssignments, setTransactionAssignments] = useState<Record<number, string>>({});
  const [organizationAssignments, setOrganizationAssignments] = useState<Record<number, {
    provider_org_id?: string;
    receiver_org_id?: string;
  }>>({});
  const [codeMappings, setCodeMappings] = useState<Record<string, Record<string, string>>>({});

  // Handle file upload
  const handleFileUpload = async (file: File, xmlContent: string) => {
    setXmlFile(file);
    setIsLoading(true);
    
    try {
      const response = await apiFetch('/api/iati/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xmlContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to parse XML file');
      }

      const result = await response.json();
      setParseResult(result);
      setExistingActivities(result.existingActivities || []);
      
      // Auto-advance to validation step
      setCurrentStep(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply fixes to data
  const handleApplyFixes = (fixes: FixSet) => {
    setAppliedFixes(fixes);
    setShowFixWizard(false);
    
    // Apply fixes to parsed data
    if (parseResult) {
      const updatedTransactions = parseResult.transactions.map((tx, index) => {
        const updated = { ...tx };
        
        // Apply currency fix
        if (fixes.currencyFixes[index]) {
          updated.currency = fixes.currencyFixes[index];
        }
        
        // Apply organization fixes
        if (fixes.organizationFixes[index]) {
          if (fixes.organizationFixes[index].provider) {
            updated.provider_org_name = fixes.organizationFixes[index].provider;
          }
          if (fixes.organizationFixes[index].receiver) {
            updated.receiver_org_name = fixes.organizationFixes[index].receiver;
          }
        }
        
        // Mark for skipping if needed
        if (fixes.skipTransactions.includes(index)) {
          updated._skipImport = true;
        }
        
        return updated;
      });
      
      setParseResult({
        ...parseResult,
        transactions: updatedTransactions
      });
      
      // Check if we have orphaned transactions to fix
      if (parseResult.orphanTransactions && parseResult.orphanTransactions.length > 0) {
        setShowOrphanFix(true);
        setCurrentStep(2); // Move to orphan fix step
      } else {
        // Check for transactions needing assignment
        const hasUnlinkedTransactions = updatedTransactions.some(tx => tx._needsActivityAssignment);
        if (hasUnlinkedTransactions) {
          setShowAssignmentModal(true);
        } else {
          setCurrentStep(3); // Move to preview step
        }
      }
    }
  };

  // Handle orphan transaction resolutions
  const handleOrphanResolutions = (resolved: Record<number, string>, skipped: number[]) => {
    setOrphanResolutions({ resolved, skipped });
    setShowOrphanFix(false);
    setCurrentStep(3); // Move to preview step
  };
  
  // Handle transaction assignments
  const handleTransactionAssignments = (assignments: Record<number, string>) => {
    setTransactionAssignments(assignments);
    setShowAssignmentModal(false);
    
    // Apply assignments to transactions
    if (parseResult) {
      const updatedTransactions = parseResult.transactions.map((tx, index) => {
        if (assignments[index]) {
          return {
            ...tx,
            activity_id: assignments[index],
            _needsActivityAssignment: false
          };
        }
        return tx;
      });
      
      // Recalculate the summary
      const transactionsNeedingAssignment = updatedTransactions.filter(tx => tx._needsActivityAssignment).length;
      
      const updatedParseResult = {
        ...parseResult,
        transactions: updatedTransactions,
        summary: {
          totalActivities: parseResult.summary?.totalActivities || parseResult.activities.length,
          totalTransactions: parseResult.summary?.totalTransactions || parseResult.transactions.length,
          validTransactions: parseResult.summary?.validTransactions || 0,
          invalidTransactions: parseResult.summary?.invalidTransactions || 0,
          transactionsNeedingAssignment,
          unmappedCodesCount: parseResult.summary?.unmappedCodesCount
        }
      };
      
      // Remove unlinked transaction issues from validation issues
      const updatedValidationIssues = parseResult.validationIssues.filter(issue => 
        issue.type !== 'missing_activity'
      );
      
      // If there were unlinked transaction issues, update the count
      if (transactionsNeedingAssignment === 0) {
        updatedParseResult.validationIssues = updatedValidationIssues;
      }
      
      setParseResult(updatedParseResult);
      
      // Show success toast
      const assignedCount = Object.keys(assignments).length;
      toast.success(`Successfully assigned ${assignedCount} transaction${assignedCount !== 1 ? 's' : ''} to activities`);
    }
    
    // Check if we need to map codes
    if (parseResult?.summary?.unmappedCodesCount && parseResult.summary.unmappedCodesCount > 0) {
      setShowMapCodesModal(true);
    } else if (parseResult && needsOrganizationAssignment(parseResult)) {
      // Check if we need to assign organizations
      fetchOrganizations();
      setShowOrganizationModal(true);
    } else {
      setCurrentStep(3); // Move to preview step
    }
  };
  
  // Handle code mappings
  const handleCodeMappings = (mappings: Record<string, Record<string, string>>) => {
    setCodeMappings(mappings);
    setShowMapCodesModal(false);
    
    // Apply mappings to transactions
    if (parseResult) {
      const updatedTransactions = parseResult.transactions.map(tx => {
        let updated = { ...tx };
        
        // Apply code mappings
        if (mappings.transaction_type?.[tx.transaction_type]) {
          updated.transaction_type = mappings.transaction_type[tx.transaction_type];
        }
        if (mappings.flow_type?.[tx.flow_type || '']) {
          updated.flow_type = mappings.flow_type[tx.flow_type || ''];
        }
        if (mappings.finance_type?.[tx.finance_type || '']) {
          updated.finance_type = mappings.finance_type[tx.finance_type || ''];
        }
        if (mappings.aid_type?.[tx.aid_type || '']) {
          updated.aid_type = mappings.aid_type[tx.aid_type || ''];
        }
        if (mappings.tied_status?.[tx.tied_status || '']) {
          updated.tied_status = mappings.tied_status[tx.tied_status || ''];
        }
        if (mappings.disbursement_channel?.[tx.disbursement_channel || '']) {
          updated.disbursement_channel = mappings.disbursement_channel[tx.disbursement_channel || ''];
        }
        if (mappings.sector_code?.[tx.sector_code || '']) {
          updated.sector_code = mappings.sector_code[tx.sector_code || ''];
        }
        
        return updated;
      });
      
      // Clear unmapped codes that have been mapped
      const updatedUnmappedCodes = { ...parseResult.unmappedCodes };
      Object.keys(mappings).forEach(codeType => {
        if (updatedUnmappedCodes[codeType]) {
          updatedUnmappedCodes[codeType] = updatedUnmappedCodes[codeType].filter(
            code => !mappings[codeType][code]
          );
          if (updatedUnmappedCodes[codeType].length === 0) {
            delete updatedUnmappedCodes[codeType];
          }
        }
      });
      
      // Recalculate unmapped codes count
      const unmappedCodesCount = Object.values(updatedUnmappedCodes).reduce(
        (sum, codes) => sum + codes.length, 
        0
      );
      
      const updatedParseResult = {
        ...parseResult,
        transactions: updatedTransactions,
        unmappedCodes: updatedUnmappedCodes,
        summary: {
          totalActivities: parseResult.summary?.totalActivities || parseResult.activities.length,
          totalTransactions: parseResult.summary?.totalTransactions || parseResult.transactions.length,
          validTransactions: parseResult.summary?.validTransactions || 0,
          invalidTransactions: parseResult.summary?.invalidTransactions || 0,
          transactionsNeedingAssignment: parseResult.summary?.transactionsNeedingAssignment || 0,
          unmappedCodesCount
        }
      };
      
      // Remove unmapped code issues from validation issues
      const updatedValidationIssues = parseResult.validationIssues.filter(issue => 
        issue.type !== 'unmapped_code'
      );
      
      // If all codes are mapped, update validation issues
      if (unmappedCodesCount === 0) {
        updatedParseResult.validationIssues = updatedValidationIssues;
      }
      
      setParseResult(updatedParseResult);
      
      // Show success toast
      const mappedCount = Object.values(mappings).reduce((sum, typeMapping) => {
        return sum + Object.keys(typeMapping).length;
      }, 0);
      toast.success(`Successfully mapped ${mappedCount} code${mappedCount !== 1 ? 's' : ''}`);
    }
    
    setCurrentStep(3); // Move to preview step
  };

  // Handle final import
  const handleImport = async () => {
    if (!parseResult) return;
    
    const progressToast = showImportProgress('Importing activities and transactions...');
    setIsLoading(true);
    
    try {
      const response = await apiFetch('/api/iati/import-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activities: parseResult.activities,
          transactions: parseResult.transactions.filter(tx => !tx._skipImport),
          fixes: appliedFixes,
          orphanResolutions: orphanResolutions,
          codeMappings: codeMappings,
          organizationAssignments: organizationAssignments,
          organizationId: user?.organizationId
        })
      });

      const result = await response.json();
      
      toast.dismiss(progressToast);
      
      if (result.success) {
        showImportResult(result);
        setCurrentStep(4); // Move to complete step
      } else {
        showImportResult(result);
      }
    } catch (error) {
      toast.dismiss(progressToast);
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Export data as CSV
  const handleExportCSV = (type: 'activities' | 'transactions') => {
    if (!parseResult) return;
    
    const data = type === 'activities' ? parseResult.activities : parseResult.transactions;
    const headers = Object.keys(data[0] || {});
    
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
      csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iati-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get validation summary
  const getValidationSummary = () => {
    if (!parseResult) return { hasErrors: false, errorCount: 0, warningCount: 0 };
    
    const errors = parseResult.validationIssues.filter(i => i.severity === 'error');
    const warnings = parseResult.validationIssues.filter(i => i.severity === 'warning');
    
    return {
      hasErrors: errors.length > 0,
      errorCount: errors.reduce((sum, e) => sum + e.count, 0),
      warningCount: warnings.reduce((sum, w) => sum + w.count, 0)
    };
  };

  const validationSummary = getValidationSummary();

  // Check if transactions need organization assignment
  const needsOrganizationAssignment = (result: ParseResult) => {
    if (!result) return false;
    return result.transactions.some(tx => 
      (!tx.provider_org_id && tx.provider_org_name) || 
      (!tx.receiver_org_id && tx.receiver_org_name)
    );
  };

  // Fetch organizations for assignment
  const fetchOrganizations = async () => {
    try {
      const response = await apiFetch('/api/organizations');
      if (response.ok) {
        const orgs = await response.json();
        setExistingOrganizations(orgs);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  // Handle organization assignments
  const handleOrganizationAssignments = (assignments: Record<number, { provider_org_id?: string; receiver_org_id?: string }>) => {
    setOrganizationAssignments(assignments);
    setShowOrganizationModal(false);
    
    // Apply assignments to transactions
    if (parseResult) {
      const updatedTransactions = parseResult.transactions.map((tx, index) => {
        const assignment = assignments[index];
        if (assignment) {
          return {
            ...tx,
            provider_org_id: assignment.provider_org_id || tx.provider_org_id,
            receiver_org_id: assignment.receiver_org_id || tx.receiver_org_id
          };
        }
        return tx;
      });
      
      setParseResult({
        ...parseResult,
        transactions: updatedTransactions
      });
      
      // Show success toast
      const assignedCount = Object.keys(assignments).length;
      toast.success(`Successfully assigned organizations for ${assignedCount} transaction${assignedCount !== 1 ? 's' : ''}`);
    }
    
    setCurrentStep(3); // Move to preview step
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Enhanced IATI Import Tool</h1>
          <p className="text-muted-foreground">
            Import and validate IATI data with comprehensive validation and error fixing capabilities
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <React.Fragment key={step.label}>
                  <div className={`flex flex-col items-center ${index > 0 ? 'flex-1' : ''}`}>
                    {index > 0 && (
                      <div className={`h-0.5 w-full mb-4 ${
                        isComplete ? 'bg-primary' : 'bg-gray-200'
                      }`} />
                    )}
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2
                      ${isActive ? 'bg-primary text-primary-foreground' : 
                        isComplete ? 'bg-primary/20 text-primary' : 
                        'bg-gray-100 text-gray-400'}
                    `}>
                      {isComplete ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-primary' : 
                        isComplete ? 'text-gray-700' : 
                        'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 0: Upload */}
          {currentStep === 0 && (
            <XMLUploadCard
              onFileSelect={handleFileUpload}
              isProcessing={isLoading}
            />
          )}

                   {/* Step 1: Validate */}
          {currentStep === 1 && parseResult && (
            <>
              <ValidationSummaryPanel
                validationIssues={parseResult.validationIssues}
                summary={{
                  totalActivities: parseResult.activities.length,
                  totalTransactions: parseResult.transactions.length,
                  validTransactions: parseResult.transactions.filter(tx => !tx._hasIssues).length,
                  invalidTransactions: parseResult.transactions.filter(tx => tx._hasIssues).length
                }}
                onViewDetails={(issueType) => {
                  console.log('View details for:', issueType);
                  // Open appropriate modal based on issue type
                  if (issueType === 'missing_activity') {
                    setShowAssignmentModal(true);
                  } else if (issueType === 'unmapped_code') {
                    setShowMapCodesModal(true);
                  } else if (issueType === 'missing_org') {
                    fetchOrganizations();
                    setShowOrganizationModal(true);
                  } else if (issueType === 'missing_currency' || issueType === 'missing_required' || issueType === 'invalid_value') {
                    setShowFixWizard(true);
                  }
                }}
                onProceedToFix={() => {
                  // Check what needs fixing
                  const hasUnlinkedTransactions = parseResult?.summary?.transactionsNeedingAssignment && 
                                                 parseResult.summary.transactionsNeedingAssignment > 0;
                  const hasUnmappedCodes = parseResult?.summary?.unmappedCodesCount && 
                                          parseResult.summary.unmappedCodesCount > 0;
                  
                  if (hasUnlinkedTransactions) {
                    setShowAssignmentModal(true);
                  } else if (hasUnmappedCodes) {
                    setShowMapCodesModal(true);
                  } else if (validationSummary.hasErrors) {
                    setShowFixWizard(true);
                  } else {
                    setCurrentStep(3); // Skip to preview if no errors
                  }
                }}
              />

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(0)}
                >
                  Back to Upload
                </Button>
                <Button
                  onClick={() => {
                    // Check what needs fixing
                    const hasUnlinkedTransactions = parseResult?.summary?.transactionsNeedingAssignment && 
                                                   parseResult.summary.transactionsNeedingAssignment > 0;
                    const hasUnmappedCodes = parseResult?.summary?.unmappedCodesCount && 
                                            parseResult.summary.unmappedCodesCount > 0;
                    
                    if (hasUnlinkedTransactions) {
                      setShowAssignmentModal(true);
                    } else if (hasUnmappedCodes) {
                      setShowMapCodesModal(true);
                    } else if (validationSummary.hasErrors) {
                      setShowFixWizard(true);
                    } else {
                      setCurrentStep(3);
                    }
                  }}
                >
                  {validationSummary.hasErrors || 
                   parseResult?.summary?.transactionsNeedingAssignment || 
                   parseResult?.summary?.unmappedCodesCount ? 'Fix Issues' : 'Continue to Preview'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Fix Orphaned Transactions */}
          {currentStep === 2 && parseResult && parseResult.orphanTransactions && parseResult.orphanTransactions.length > 0 && (
            <FixOrphanedTransactionsStep
              orphanTransactions={parseResult.orphanTransactions}
              onComplete={handleOrphanResolutions}
            />
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && parseResult && (
            <>
              <PreviewTable
                activities={parseResult.activities}
                transactions={parseResult.transactions}
                orphanTransactions={parseResult.orphanTransactions}
                onExportCSV={handleExportCSV}
              />

              {/* Blocking message if there are unresolved issues */}
              {(parseResult.summary?.transactionsNeedingAssignment || parseResult.summary?.unmappedCodesCount) && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>Import Blocked:</strong> Please resolve all issues before proceeding:
                    {parseResult.summary.transactionsNeedingAssignment && parseResult.summary.transactionsNeedingAssignment > 0 && (
                      <div className="mt-1">
                        • {parseResult.summary.transactionsNeedingAssignment} transaction{parseResult.summary.transactionsNeedingAssignment !== 1 ? 's' : ''} need activity assignment
                      </div>
                    )}
                    {parseResult.summary.unmappedCodesCount && parseResult.summary.unmappedCodesCount > 0 && (
                      <div className="mt-1">
                        • {parseResult.summary.unmappedCodesCount} code{parseResult.summary.unmappedCodesCount !== 1 ? 's' : ''} need mapping
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Back to Validation
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isLoading || 
                    Boolean(parseResult?.summary?.transactionsNeedingAssignment && parseResult.summary.transactionsNeedingAssignment > 0) ||
                    Boolean(parseResult?.summary?.unmappedCodesCount && parseResult.summary.unmappedCodesCount > 0)
                  }
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import to Database
                      <Upload className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Your IATI data has been successfully imported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      The import process has completed. Check the import results in the notification area.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(0);
                        setParseResult(null);
                        setXmlFile(null);
                        setAppliedFixes(null);
                      }}
                    >
                      Import Another File
                    </Button>
                    <Button onClick={() => window.location.href = '/activities'}>
                      View Activities
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Fix Wizard Modal */}
        {showFixWizard && parseResult && (
          <FixWizardModal
            isOpen={showFixWizard}
            onClose={() => setShowFixWizard(false)}
            validationIssues={parseResult.validationIssues}
            transactions={parseResult.transactions}
            activities={existingActivities}
            onApplyFixes={handleApplyFixes}
          />
        )}
        
        {/* Assignment Modal */}
        {showAssignmentModal && parseResult && (
          <AssignTransactionsModal
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false);
              setCurrentStep(3); // Skip to preview even if not all assigned
            }}
            transactions={parseResult.transactions}
            existingActivities={parseResult.existingActivities || []}
            newActivities={parseResult.activities}
            onComplete={handleTransactionAssignments}
          />
        )}
        
        {/* Code Mapping Modal */}
        {showMapCodesModal && parseResult && parseResult.unmappedCodes && (
          <MapCodesModal
            isOpen={showMapCodesModal}
            onClose={() => {
              setShowMapCodesModal(false);
              setCurrentStep(3); // Skip to preview even if not all mapped
            }}
            unmappedCodes={parseResult.unmappedCodes}
            onComplete={handleCodeMappings}
          />
        )}
        
        {/* Organization Assignment Modal */}
        {showOrganizationModal && parseResult && (
          <AssignOrganizationsModal
            isOpen={showOrganizationModal}
            onClose={() => {
              setShowOrganizationModal(false);
              setCurrentStep(3); // Skip to preview even if not all assigned
            }}
            transactions={parseResult.transactions}
            organizations={existingOrganizations}
            onComplete={handleOrganizationAssignments}
          />
        )}
      </div>
    </MainLayout>
  );
} 