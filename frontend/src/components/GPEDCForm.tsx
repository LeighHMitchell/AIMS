'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, Download, Check, Loader2, FileText, Link } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { GPEDCFormData, GPEDCValidationErrors } from '@/types/gpedc';
import { validateGPEDCForm, formatPhoneNumber } from '@/lib/gpedc-validation';
import { gpedcTooltips } from '@/lib/gpedc-tooltips';
import { supabase } from '@/lib/supabase';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GPEDCDynamicFeatures } from './GPEDCDynamicFeatures';

interface GPEDCFormProps {
  projectId?: string;
  initialData?: Partial<GPEDCFormData>;
  onSubmit?: (data: GPEDCFormData) => Promise<void>;
  currentUser?: { id: string; name: string; role: string };
}

// Extended form data with dynamic fields
interface ExtendedGPEDCFormData extends GPEDCFormData {
  dynamicFields?: {
    budgetExecutionReason?: string;
    financialReportingReason?: string;
    auditingReason?: string;
    procurementReason?: string;
    evaluationDate?: string;
  };
}

export function GPEDCForm({
  projectId,
  initialData,
  onSubmit,
  currentUser
}: GPEDCFormProps) {
  // Form state with extended data
  const [formData, setFormData] = useState<ExtendedGPEDCFormData>({
    developmentEffectiveness: {
      implementingPartner: initialData?.developmentEffectiveness?.implementingPartner,
      linkedToGovFramework: initialData?.developmentEffectiveness?.linkedToGovFramework,
      supportsPublicSector: initialData?.developmentEffectiveness?.supportsPublicSector,
      numberOfOutcomeIndicators: initialData?.developmentEffectiveness?.numberOfOutcomeIndicators,
      indicatorsFromGovPlans: initialData?.developmentEffectiveness?.indicatorsFromGovPlans,
      indicatorsMonitoredByGov: initialData?.developmentEffectiveness?.indicatorsMonitoredByGov,
      finalEvaluationPlanned: initialData?.developmentEffectiveness?.finalEvaluationPlanned,
    },
    governmentSystems: {
      budgetExecutionSystem: initialData?.governmentSystems?.budgetExecutionSystem,
      financialReportingSystem: initialData?.governmentSystems?.financialReportingSystem,
      auditingSystem: initialData?.governmentSystems?.auditingSystem,
      procurementSystem: initialData?.governmentSystems?.procurementSystem,
    },
    budgetPlanning: {
      annualBudgetShared: initialData?.budgetPlanning?.annualBudgetShared,
      threeYearPlanShared: initialData?.budgetPlanning?.threeYearPlanShared,
      tiedStatus: initialData?.budgetPlanning?.tiedStatus,
    },
    contact: {
      name: initialData?.contact?.name || currentUser?.name || '',
      organisation: initialData?.contact?.organisation || '',
      email: initialData?.contact?.email || '',
      phoneNumber: initialData?.contact?.phoneNumber || '',
    },
    documents: {
      uploadedFile: null,
      externalLink: initialData?.documents?.externalLink || '',
    },
    remarks: initialData?.remarks || '',
    metadata: {
      projectId: projectId || '',
      status: initialData?.metadata?.status || 'draft',
      createdBy: initialData?.metadata?.createdBy || currentUser?.id || '',
      updatedBy: currentUser?.id || '',
    },
    dynamicFields: {}
  });

  const [validationErrors, setValidationErrors] = useState<GPEDCValidationErrors>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('output1');

  // Load organizations from Supabase
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setOrganizations(data || []);
      } catch (error) {
        console.error('Error loading organizations:', error);
      }
    };

    loadOrganizations();
  }, []);

  // Auto-save functionality
  const saveFormData = async (data: ExtendedGPEDCFormData) => {
    // Here you would implement the actual save logic to your backend
    console.log('Auto-saving form data:', data);
    // For example:
    // await supabase.from('gpedc_forms').upsert({ ...data, project_id: projectId });
  };

  const { updateData, triggerSave, autoSaveState } = useAutoSave({
    onSave: saveFormData,
    interval: 30000, // 30 seconds
    debounce: 1000, // 1 second
  });

  // Update form data and trigger auto-save
  const handleFieldChange = useCallback((field: string, value: any) => {
    const newData = { ...formData };
    const keys = field.split('.');
    let current: any = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    setFormData(newData);
    updateData(newData);
  }, [formData, updateData]);

  // Handle dynamic field changes
  const handleDynamicReasonChange = useCallback((field: string, value: string) => {
    handleFieldChange(`dynamicFields.${field}`, value);
  }, [handleFieldChange]);

  const handleEvaluationDateChange = useCallback((date: string) => {
    handleFieldChange('dynamicFields.evaluationDate', date);
  }, [handleFieldChange]);

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        handleFieldChange('documents.uploadedFile', file);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  }, [handleFieldChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  // Form submission
  const handleSubmit = async () => {
    const validation = validateGPEDCForm(formData);
    setValidationErrors(validation.errors);

    if (!validation.isValid) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      toast.success('Form submitted successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export form as PDF snapshot
  const handleExportPDF = () => {
    // This would integrate with a PDF generation library
    toast.info('PDF export feature coming soon');
  };

  // Tooltip wrapper component
  const TooltipField = ({ 
    children, 
    tooltip 
  }: { 
    children: React.ReactNode; 
    tooltip: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{children}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GPEDC Monitoring Form</h1>
          <p className="text-muted-foreground">
            Development Partner Data Entry aligned with GPEDC Indicators
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            {autoSaveState.isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : autoSaveState.lastSaved ? (
              <>
                <Check className="w-3 h-3" />
                Saved {format(autoSaveState.lastSaved, 'HH:mm')}
              </>
            ) : (
              'Not saved'
            )}
          </Badge>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="output1">Output 1</TabsTrigger>
          <TabsTrigger value="output2">Output 2</TabsTrigger>
          <TabsTrigger value="output3">Output 3</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* Output 1: Development Effectiveness */}
        <TabsContent value="output1">
          <Card>
            <CardHeader>
              <CardTitle>Output 1: Implementation and Results Framework</CardTitle>
              <CardDescription>
                Development effectiveness indicators for the project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Implementing Partner */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.implementingPartner}>
                  <Label htmlFor="implementingPartner">
                    Implementing / Point of Delivery Partner
                  </Label>
                </TooltipField>
                <Select
                  value={formData.developmentEffectiveness.implementingPartner || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.implementingPartner', value)}
                >
                  <SelectTrigger id="implementingPartner">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linked to Government Framework */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.linkedToGovFramework}>
                  <Label>Linked to Government Framework?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.developmentEffectiveness.linkedToGovFramework || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.linkedToGovFramework', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="linked-yes" />
                    <Label htmlFor="linked-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="linked-no" />
                    <Label htmlFor="linked-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Supports Public Sector */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.supportsPublicSector}>
                  <Label>Supports Public Sector?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.developmentEffectiveness.supportsPublicSector || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.supportsPublicSector', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="public-yes" />
                    <Label htmlFor="public-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="public-no" />
                    <Label htmlFor="public-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Number of Outcome Indicators */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.numberOfOutcomeIndicators}>
                  <Label htmlFor="outcomeIndicators">Number of Outcome Indicators</Label>
                </TooltipField>
                <Input
                  id="outcomeIndicators"
                  type="number"
                  min="0"
                  value={formData.developmentEffectiveness.numberOfOutcomeIndicators || ''}
                  onChange={(e) => handleFieldChange('developmentEffectiveness.numberOfOutcomeIndicators', parseInt(e.target.value) || 0)}
                />
                {validationErrors['developmentEffectiveness.numberOfOutcomeIndicators'] && (
                  <p className="text-sm text-destructive">{validationErrors['developmentEffectiveness.numberOfOutcomeIndicators']}</p>
                )}
              </div>

              {/* Indicators from Government Plans */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.indicatorsFromGovPlans}>
                  <Label>Indicators Sourced from Government Plans?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.developmentEffectiveness.indicatorsFromGovPlans || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.indicatorsFromGovPlans', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="indicators-gov-yes" />
                    <Label htmlFor="indicators-gov-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="indicators-gov-no" />
                    <Label htmlFor="indicators-gov-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Indicators Monitored by Government */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.indicatorsMonitoredByGov}>
                  <Label>Indicators Monitored via Government Data?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.developmentEffectiveness.indicatorsMonitoredByGov || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.indicatorsMonitoredByGov', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="monitored-yes" />
                    <Label htmlFor="monitored-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="monitored-no" />
                    <Label htmlFor="monitored-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Final Evaluation Planned */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.developmentEffectiveness.finalEvaluationPlanned}>
                  <Label>Final Evaluation Planned?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.developmentEffectiveness.finalEvaluationPlanned || ''}
                  onValueChange={(value) => handleFieldChange('developmentEffectiveness.finalEvaluationPlanned', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="evaluation-yes" />
                    <Label htmlFor="evaluation-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="evaluation-no" />
                    <Label htmlFor="evaluation-no">No</Label>
                  </div>
                </RadioGroup>
                
                {/* Dynamic evaluation date */}
                <GPEDCDynamicFeatures
                  governmentSystemUse={{}}
                  finalEvaluationPlanned={formData.developmentEffectiveness.finalEvaluationPlanned}
                  onReasonChange={handleDynamicReasonChange}
                  onEvaluationDateChange={handleEvaluationDateChange}
                  evaluationDate={formData.dynamicFields?.evaluationDate}
                />
              </div>

              {validationErrors['developmentEffectiveness'] && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{validationErrors['developmentEffectiveness']}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Output 2: Government Systems */}
        <TabsContent value="output2">
          <Card>
            <CardHeader>
              <CardTitle>Output 2: Financial and Procurement Systems</CardTitle>
              <CardDescription>
                Use of government systems for project implementation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Execution System */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.governmentSystems.budgetExecutionSystem}>
                  <Label>Government Budget Execution System</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.governmentSystems.budgetExecutionSystem || ''}
                  onValueChange={(value) => handleFieldChange('governmentSystems.budgetExecutionSystem', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="budget-yes" />
                    <Label htmlFor="budget-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="budget-no" />
                    <Label htmlFor="budget-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Financial Reporting System */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.governmentSystems.financialReportingSystem}>
                  <Label>Government Financial Reporting System</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.governmentSystems.financialReportingSystem || ''}
                  onValueChange={(value) => handleFieldChange('governmentSystems.financialReportingSystem', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="financial-yes" />
                    <Label htmlFor="financial-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="financial-no" />
                    <Label htmlFor="financial-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Auditing System */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.governmentSystems.auditingSystem}>
                  <Label>Government Auditing System</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.governmentSystems.auditingSystem || ''}
                  onValueChange={(value) => handleFieldChange('governmentSystems.auditingSystem', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="audit-yes" />
                    <Label htmlFor="audit-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="audit-no" />
                    <Label htmlFor="audit-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Procurement System */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.governmentSystems.procurementSystem}>
                  <Label>Uses Government Procurement System</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.governmentSystems.procurementSystem || ''}
                  onValueChange={(value) => handleFieldChange('governmentSystems.procurementSystem', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="procurement-yes" />
                    <Label htmlFor="procurement-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="procurement-no" />
                    <Label htmlFor="procurement-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Dynamic follow-up questions */}
              <GPEDCDynamicFeatures
                governmentSystemUse={formData.governmentSystems}
                onReasonChange={handleDynamicReasonChange}
                onEvaluationDateChange={handleEvaluationDateChange}
                reasons={formData.dynamicFields}
              />

              {validationErrors['governmentSystems'] && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{validationErrors['governmentSystems']}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Output 3: Budget Planning */}
        <TabsContent value="output3">
          <Card>
            <CardHeader>
              <CardTitle>Output 3: Planning & Predictability</CardTitle>
              <CardDescription>
                Budget planning and aid effectiveness measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Annual Budget Shared */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.budgetPlanning.annualBudgetShared}>
                  <Label>Annual Budget Shared with Government?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.budgetPlanning.annualBudgetShared || ''}
                  onValueChange={(value) => handleFieldChange('budgetPlanning.annualBudgetShared', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="annual-yes" />
                    <Label htmlFor="annual-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="annual-no" />
                    <Label htmlFor="annual-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 3-Year Plan Shared */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.budgetPlanning.threeYearPlanShared}>
                  <Label>3-Year Forward Plan Shared?</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.budgetPlanning.threeYearPlanShared || ''}
                  onValueChange={(value) => handleFieldChange('budgetPlanning.threeYearPlanShared', value as 'yes' | 'no')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="three-year-yes" />
                    <Label htmlFor="three-year-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="three-year-no" />
                    <Label htmlFor="three-year-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tied Status */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.budgetPlanning.tiedStatus}>
                  <Label>Tied Status of Resources</Label>
                </TooltipField>
                <RadioGroup
                  value={formData.budgetPlanning.tiedStatus || ''}
                  onValueChange={(value) => handleFieldChange('budgetPlanning.tiedStatus', value as 'fully_tied' | 'partially_tied' | 'untied')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fully_tied" id="fully-tied" />
                    <Label htmlFor="fully-tied">Fully Tied</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partially_tied" id="partially-tied" />
                    <Label htmlFor="partially-tied">Partially Tied</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="untied" id="untied" />
                    <Label htmlFor="untied">Untied</Label>
                  </div>
                </RadioGroup>
              </div>

              {validationErrors['budgetPlanning'] && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{validationErrors['budgetPlanning']}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Details */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>
                Person responsible for this project record
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Name */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.contact.name}>
                  <Label htmlFor="contactName">Contact Name *</Label>
                </TooltipField>
                <Input
                  id="contactName"
                  value={formData.contact.name || ''}
                  onChange={(e) => handleFieldChange('contact.name', e.target.value)}
                  className={validationErrors['contact.name'] ? 'border-destructive' : ''}
                />
                {validationErrors['contact.name'] && (
                  <p className="text-sm text-destructive">{validationErrors['contact.name']}</p>
                )}
              </div>

              {/* Organisation */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.contact.organisation}>
                  <Label htmlFor="contactOrg">Organisation *</Label>
                </TooltipField>
                <Select
                  value={formData.contact.organisation || ''}
                  onValueChange={(value) => handleFieldChange('contact.organisation', value)}
                >
                  <SelectTrigger id="contactOrg" className={validationErrors['contact.organisation'] ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors['contact.organisation'] && (
                  <p className="text-sm text-destructive">{validationErrors['contact.organisation']}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.contact.email}>
                  <Label htmlFor="contactEmail">Email *</Label>
                </TooltipField>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contact.email || ''}
                  onChange={(e) => handleFieldChange('contact.email', e.target.value)}
                  className={validationErrors['contact.email'] ? 'border-destructive' : ''}
                />
                {validationErrors['contact.email'] && (
                  <p className="text-sm text-destructive">{validationErrors['contact.email']}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.contact.phoneNumber}>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                </TooltipField>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contact.phoneNumber || ''}
                  onChange={(e) => handleFieldChange('contact.phoneNumber', formatPhoneNumber(e.target.value))}
                  placeholder="+855 23 456 789"
                  className={validationErrors['contact.phoneNumber'] ? 'border-destructive' : ''}
                />
                {validationErrors['contact.phoneNumber'] && (
                  <p className="text-sm text-destructive">{validationErrors['contact.phoneNumber']}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Project Document Uploads</CardTitle>
              <CardDescription>
                Attach relevant project documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.documents.uploadPdf}>
                  <Label>Upload PDF</Label>
                </TooltipField>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  {formData.documents.uploadedFile ? (
                    <p className="text-sm">
                      Selected: {formData.documents.uploadedFile.name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Drag & drop a PDF file here, or click to select
                    </p>
                  )}
                </div>
              </div>

              {/* External Link */}
              <div className="space-y-2">
                <TooltipField tooltip={gpedcTooltips.documents.externalLink}>
                  <Label htmlFor="externalLink">External Document Link</Label>
                </TooltipField>
                <div className="flex gap-2">
                  <Link className="w-4 h-4 mt-2 text-muted-foreground" />
                  <Input
                    id="externalLink"
                    type="url"
                    value={formData.documents.externalLink || ''}
                    onChange={(e) => handleFieldChange('documents.externalLink', e.target.value)}
                    placeholder="https://example.com/document.pdf"
                    className={validationErrors['documents.externalLink'] ? 'border-destructive' : ''}
                  />
                </div>
                {validationErrors['documents.externalLink'] && (
                  <p className="text-sm text-destructive">{validationErrors['documents.externalLink']}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remarks */}
        <TabsContent value="remarks">
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
              <CardDescription>
                Additional comments or notes about this entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipField tooltip={gpedcTooltips.remarks}>
                <Textarea
                  value={formData.remarks || ''}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  placeholder="Enter any additional notes, explanations, or pending updates..."
                  className="min-h-[200px]"
                />
              </TooltipField>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          <Badge variant="secondary">GPEDC Compliant</Badge>
          <span className="ml-2">Aligned with indicators 5, 6, 9, and 10</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={triggerSave}
            disabled={!autoSaveState.hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Form'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}