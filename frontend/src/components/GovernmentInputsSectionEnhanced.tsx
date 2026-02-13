import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, Upload, HelpCircle, FileText, CheckCircle2, Circle, CircleSlash, AlertCircle, Info, ChevronRight, TrendingUp, Globe, Shield, Users, Building, Target, Wallet, DollarSign, Calendar, MapPin, UserCheck, FileCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GovernmentInputs {
  onBudgetClassification?: {
    onPlan?: string;
    onBudget?: string;
    onTreasury?: string;
    onParliament?: string;
    onProcurement?: string;
    onAudit?: string;
    supportingDocs?: {
      dimension: string;
      docName: string;
      docUrl?: string;
    }[];
  };
  
  rgcContribution?: {
    isProvided?: boolean;
    totalAmountLocal?: number;
    totalAmountUSD?: number;
    valueDate?: string;
    annual?: Array<{
      year: number;
      amountLocal: number;
      amountUSD: number;
    }>;
    inKindContributions?: string;
    sourceOfFunding?: string;
  };
  
  nationalPlanAlignment?: {
    isAligned?: boolean;
    planName?: string;
    subGoal?: string;
    nationalIndicatorCode?: string;
  };
  
  technicalCoordination?: {
    workingGroups?: string[];
    accountableMinistry?: string;
    regions?: string[];
    focalPoint?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
    };
  };
  
  oversightAgreement?: {
    mouStatus?: string;
    agreementFile?: string;
    signingAgency?: string;
    oversightMinistry?: string;
  };
  
  geographicContext?: {
    locations?: string[];
    riskClassifications?: string[];
    otherRiskSpecification?: string;
  };
  
  strategicConsiderations?: {
    isPoliticallySensitive?: boolean;
    pooledFundingEligible?: boolean;
    pooledFundName?: string;
    fundManager?: string;
  };
  
  evaluationResults?: {
    hasEvaluation?: boolean;
    evaluationDocument?: string;
    inNationalFramework?: boolean;
    nationalIndicatorRef?: string;
  };
}

interface GovernmentInputsSectionProps {
  governmentInputs: GovernmentInputs;
  onChange: (inputs: GovernmentInputs) => void;
}

export function GovernmentInputsSectionEnhanced({
  governmentInputs, 
  onChange,
}: GovernmentInputsSectionProps) {
  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newInputs = { ...governmentInputs };
    
    let current: any = newInputs;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    onChange(newInputs);
  };

  const handleFileUpload = (file: File, docType: string) => {
    // Placeholder for file upload logic
    toast.success(`${docType} document uploaded successfully`);
  };

  // Calculate budget classification completion
  const budgetDimensions = [
    { key: 'onPlan', label: 'On Plan' },
    { key: 'onBudget', label: 'On Budget' },
    { key: 'onTreasury', label: 'On Treasury' },
    { key: 'onParliament', label: 'On Parliament' },
    { key: 'onProcurement', label: 'On Procurement' },
    { key: 'onAudit', label: 'On Accounting/Audit' }
  ];

  const completedDimensions = budgetDimensions.filter(dim => {
    const value = governmentInputs.onBudgetClassification?.[dim.key as keyof typeof governmentInputs.onBudgetClassification];
    return typeof value === 'string' && value.length > 0;
  }).length;

  const budgetProgress = (completedDimensions / budgetDimensions.length) * 100;

  return (
    <TooltipProvider>
      <div className="space-y-6">
          
        <Tabs defaultValue="budget-finance" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="budget-finance" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              Budget & Finance
            </TabsTrigger>
            <TabsTrigger value="coordination" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              Coordination
            </TabsTrigger>
            <TabsTrigger value="oversight" className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-600" />
              Oversight
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-600" />
              Evaluation
            </TabsTrigger>
          </TabsList>

          {/* Budget & Finance Tab */}
          <TabsContent value="budget-finance" className="space-y-6 mt-6">
            
            {/* Budget Classification Card */}
            <Card>
              <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                      <FileCheck className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                      <CardTitle className="text-lg">Budget Classification</CardTitle>
                      <CardDescription>
                        Assess how this activity aligns with government budget systems
                      </CardDescription>
                </div>
              </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">
                      {completedDimensions} of {budgetDimensions.length} completed
                </div>
                    <Progress value={budgetProgress} className="w-24 h-2 mt-1" />
              </div>
            </div>
          </CardHeader>
              <CardContent className="space-y-4">
                {budgetDimensions.map((dimension) => (
                  <div key={dimension.key} className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">{dimension.label}</h4>
                        <HelpTextTooltip content={getDimensionHelp(dimension.key)} />
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(
                          typeof governmentInputs.onBudgetClassification?.[dimension.key as keyof typeof governmentInputs.onBudgetClassification] === 'string' 
                            ? governmentInputs.onBudgetClassification[dimension.key as keyof typeof governmentInputs.onBudgetClassification] as string
                            : undefined
                        )}
                      </div>
                </div>
                
                    <RadioGroup
                      value={
                        typeof governmentInputs.onBudgetClassification?.[dimension.key as keyof typeof governmentInputs.onBudgetClassification] === 'string'
                          ? governmentInputs.onBudgetClassification[dimension.key as keyof typeof governmentInputs.onBudgetClassification] as string
                          : ""
                      }
                      onValueChange={(value) => updateField(`onBudgetClassification.${dimension.key}`, value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id={`${dimension.key}-yes`} />
                        <label htmlFor={`${dimension.key}-yes`} className="text-sm font-medium cursor-pointer">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Partial" id={`${dimension.key}-partial`} />
                        <label htmlFor={`${dimension.key}-partial`} className="text-sm font-medium cursor-pointer">
                          Partial
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id={`${dimension.key}-no`} />
                        <label htmlFor={`${dimension.key}-no`} className="text-sm font-medium cursor-pointer">
                          No
                        </label>
                      </div>
                    </RadioGroup>
                    </div>
                  ))}
                  
                {/* Supporting Documents */}
                <div className="mt-6 p-4 border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h4 className="font-medium text-slate-900">Supporting Documents</h4>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">Optional</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Upload documents that support your "Yes" or "Partial" classifications
                  </p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
              </div>
            </CardContent>
        </Card>

            {/* Government Financial Contribution */}
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Government Financial Contribution</CardTitle>
                    <CardDescription>
                      Track government co-financing and resource commitments
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Is Government Contributing */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Does the government provide financial contribution?</h4>
                <RadioGroup
                  value={governmentInputs.rgcContribution?.isProvided ? "yes" : "no"}
                  onValueChange={(value) => updateField('rgcContribution.isProvided', value === "yes")}
                    className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="contrib-yes" />
                      <label htmlFor="contrib-yes" className="text-sm font-medium cursor-pointer">
                        Yes, government contributes
                      </label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="contrib-no" />
                      <label htmlFor="contrib-no" className="text-sm font-medium cursor-pointer">
                        No contribution
                      </label>
                  </div>
                </RadioGroup>
              </div>

                {/* Contribution Details */}
              {governmentInputs.rgcContribution?.isProvided && (
                <>
                    {/* Total Contribution Summary */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">Total Government Contribution</h4>
                    </div>
                    
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Local Currency Amount
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g., 1,000,000"
                            value={governmentInputs.rgcContribution?.totalAmountLocal || ""}
                            onChange={(e) => updateField('rgcContribution.totalAmountLocal', parseFloat(e.target.value) || 0)}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            USD Equivalent
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g., 250,000"
                            value={governmentInputs.rgcContribution?.totalAmountUSD || ""}
                            onChange={(e) => updateField('rgcContribution.totalAmountUSD', parseFloat(e.target.value) || 0)}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Value Date
                          </label>
                          <Input
                            type="date"
                            value={governmentInputs.rgcContribution?.valueDate || ""}
                            onChange={(e) => updateField('rgcContribution.valueDate', e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Annual Breakdown */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-900">Annual Breakdown</h4>
                          <Button
                          variant="outline"
                            size="sm"
                          onClick={() => {
                            const currentAnnual = governmentInputs.rgcContribution?.annual || [];
                            const newYear = new Date().getFullYear() + currentAnnual.length;
                            updateField('rgcContribution.annual', [
                              ...currentAnnual,
                              { year: newYear, amountLocal: 0, amountUSD: 0 }
                            ]);
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Year
                          </Button>
                    </div>
                    
                      <div className="space-y-3">
                        {(governmentInputs.rgcContribution?.annual || []).map((item, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded">
                      <Input
                        type="number"
                        placeholder="Year"
                              value={item.year}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, year: parseInt(e.target.value) || 0 };
                                updateField('rgcContribution.annual', newAnnual);
                              }}
                      />
                      <Input
                        type="number"
                              placeholder="Local amount"
                              value={item.amountLocal}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, amountLocal: parseFloat(e.target.value) || 0 };
                                updateField('rgcContribution.annual', newAnnual);
                              }}
                      />
                      <Input
                        type="number"
                              placeholder="USD amount"
                              value={item.amountUSD}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, amountUSD: parseFloat(e.target.value) || 0 };
                                updateField('rgcContribution.annual', newAnnual);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAnnual = (governmentInputs.rgcContribution?.annual || []).filter((_, i) => i !== index);
                                updateField('rgcContribution.annual', newAnnual);
                              }}
                            >
                              <X className="h-4 w-4" />
                      </Button>
                    </div>
                        ))}
                  </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          In-Kind Contributions
                        </label>
                    <Textarea
                          placeholder="Describe any in-kind contributions (staff time, facilities, equipment, etc.)"
                      value={governmentInputs.rgcContribution?.inKindContributions || ""}
                      onChange={(e) => updateField('rgcContribution.inKindContributions', e.target.value)}
                      rows={3}
                    />
                  </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Source of Funding
                        </label>
                        <Textarea
                          placeholder="Specify the government budget line or funding source"
                      value={governmentInputs.rgcContribution?.sourceOfFunding || ""}
                      onChange={(e) => updateField('rgcContribution.sourceOfFunding', e.target.value)}
                          rows={3}
                    />
                      </div>
                  </div>
                </>
              )}
            </CardContent>
        </Card>
          </TabsContent>

          {/* Coordination Tab */}
          <TabsContent value="coordination" className="space-y-6 mt-6">
            
            {/* National Plan Alignment */}
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Target className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                    <CardTitle className="text-lg">National Plan Alignment</CardTitle>
                    <CardDescription>
                      Link this activity to national development plans and strategies
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Is this activity aligned with national development plans?</h4>
                <RadioGroup
                  value={governmentInputs.nationalPlanAlignment?.isAligned ? "yes" : "no"}
                  onValueChange={(value) => updateField('nationalPlanAlignment.isAligned', value === "yes")}
                    className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="aligned-yes" />
                      <label htmlFor="aligned-yes" className="text-sm font-medium cursor-pointer">
                        Yes, aligned with national plans
                      </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="aligned-no" />
                      <label htmlFor="aligned-no" className="text-sm font-medium cursor-pointer">
                        Not aligned
                      </label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.nationalPlanAlignment?.isAligned && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        National Plan/Strategy Name
                      </label>
                      <Input
                        placeholder="e.g., National Development Plan 2021-2025"
                      value={governmentInputs.nationalPlanAlignment?.planName || ""}
                        onChange={(e) => updateField('nationalPlanAlignment.planName', e.target.value)}
                      />
                  </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Specific Goal/Objective
                      </label>
                    <Input
                        placeholder="e.g., Goal 3: Improve Healthcare Access"
                      value={governmentInputs.nationalPlanAlignment?.subGoal || ""}
                      onChange={(e) => updateField('nationalPlanAlignment.subGoal', e.target.value)}
                    />
                  </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        National Indicator Code
                      </label>
                    <Input
                        placeholder="e.g., NDP-3.2.1"
                      value={governmentInputs.nationalPlanAlignment?.nationalIndicatorCode || ""}
                      onChange={(e) => updateField('nationalPlanAlignment.nationalIndicatorCode', e.target.value)}
                    />
                  </div>
                  </div>
              )}
            </CardContent>
        </Card>

            {/* Technical Coordination */}
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Technical Coordination</CardTitle>
                    <CardDescription>
                      Identify coordination mechanisms and responsible parties
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Accountable Ministry/Agency
                    </label>
                    <Input
                      placeholder="e.g., Ministry of Health"
                  value={governmentInputs.technicalCoordination?.accountableMinistry || ""}
                      onChange={(e) => updateField('technicalCoordination.accountableMinistry', e.target.value)}
                    />
              </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Working Groups/Committees
                    </label>
                    <Input
                      placeholder="e.g., Health Sector Working Group"
                      value={(governmentInputs.technicalCoordination?.workingGroups || []).join(', ')}
                      onChange={(e) => updateField('technicalCoordination.workingGroups', e.target.value.split(', ').filter(Boolean))}
                    />
                </div>
              </div>

                {/* Government Focal Point */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Government Focal Point</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Full Name"
                      value={governmentInputs.technicalCoordination?.focalPoint?.name || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.name', e.target.value)}
                    />
                    <Input
                      placeholder="Job Title"
                      value={governmentInputs.technicalCoordination?.focalPoint?.title || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.title', e.target.value)}
                    />
                    <Input
                      placeholder="Email Address"
                      type="email"
                      value={governmentInputs.technicalCoordination?.focalPoint?.email || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.email', e.target.value)}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={governmentInputs.technicalCoordination?.focalPoint?.phone || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.phone', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Geographic Regions/States
                  </label>
                  <Input
                    placeholder="e.g., Yangon, Mandalay, Shan State"
                    value={(governmentInputs.technicalCoordination?.regions || []).join(', ')}
                    onChange={(e) => updateField('technicalCoordination.regions', e.target.value.split(', ').filter(Boolean))}
                  />
              </div>
            </CardContent>
        </Card>
          </TabsContent>

          {/* Oversight Tab */}
          <TabsContent value="oversight" className="space-y-6 mt-6">
            
            {/* Oversight Agreement */}
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                    <CardTitle className="text-lg">Oversight & Agreements</CardTitle>
                    <CardDescription>
                      Formal agreements and oversight arrangements with government
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    MOU/Agreement Status
                  </label>
                  <Select
                  value={governmentInputs.oversightAgreement?.mouStatus || ""}
                  onValueChange={(value) => updateField('oversightAgreement.mouStatus', value)}
                    >
                      <SelectTrigger>
                      <SelectValue placeholder="Select agreement status" />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="signed">Signed and Active</SelectItem>
                      <SelectItem value="pending">Pending Signature</SelectItem>
                      <SelectItem value="draft">In Draft</SelectItem>
                      <SelectItem value="none">No Agreement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Signing Agency
                    </label>
                    <Input
                      placeholder="e.g., Ministry of Planning"
                      value={governmentInputs.oversightAgreement?.signingAgency || ""}
                      onChange={(e) => updateField('oversightAgreement.signingAgency', e.target.value)}
                    />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Oversight Ministry
                    </label>
                <Input
                      placeholder="e.g., Ministry of Finance"
                  value={governmentInputs.oversightAgreement?.oversightMinistry || ""}
                  onChange={(e) => updateField('oversightAgreement.oversightMinistry', e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-900">Agreement Document</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">Upload the signed MOU or agreement document</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Agreement
                  </Button>
              </div>
            </CardContent>
        </Card>

            {/* Geographic & Risk Context */}
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                    <CardTitle className="text-lg">Geographic & Risk Context</CardTitle>
                    <CardDescription>
                      Location-specific considerations and risk factors
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Implementation Locations
                  </label>
                  <Input
                    placeholder="e.g., Yangon Region, Mandalay Region"
                    value={(governmentInputs.geographicContext?.locations || []).join(', ')}
                    onChange={(e) => updateField('geographicContext.locations', e.target.value.split(', ').filter(Boolean))}
                  />
              </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Risk Classifications
                  </label>
                  <div className="space-y-2">
                    {['Low Risk', 'Medium Risk', 'High Risk', 'Conflict-Affected', 'Other'].map((risk) => (
                      <div key={risk} className="flex items-center space-x-2">
                        <Checkbox
                          id={risk}
                          checked={(governmentInputs.geographicContext?.riskClassifications || []).includes(risk)}
                          onCheckedChange={(checked) => {
                            const current = governmentInputs.geographicContext?.riskClassifications || [];
                            if (checked) {
                              updateField('geographicContext.riskClassifications', [...current, risk]);
                            } else {
                              updateField('geographicContext.riskClassifications', current.filter(r => r !== risk));
                            }
                          }}
                        />
                        <label htmlFor={risk} className="text-sm font-medium cursor-pointer">
                          {risk}
                        </label>
                      </div>
                    ))}
                  </div>
                  </div>
                  
                {(governmentInputs.geographicContext?.riskClassifications || []).includes('Other') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Other Risk Specification
                    </label>
                    <Textarea
                      placeholder="Describe other risk factors..."
                        value={governmentInputs.geographicContext?.otherRiskSpecification || ""}
                        onChange={(e) => updateField('geographicContext.otherRiskSpecification', e.target.value)}
                      rows={3}
                      />
                    </div>
                  )}

                {/* Strategic Considerations */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Strategic Considerations</h4>
              <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                      <Checkbox
                        id="politically-sensitive"
                        checked={governmentInputs.strategicConsiderations?.isPoliticallySensitive || false}
                        onCheckedChange={(checked) => updateField('strategicConsiderations.isPoliticallySensitive', checked)}
                      />
                      <label htmlFor="politically-sensitive" className="text-sm font-medium cursor-pointer">
                        Politically sensitive activity
                    </label>
                  </div>
                    
                  <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pooled-funding"
                        checked={governmentInputs.strategicConsiderations?.pooledFundingEligible || false}
                        onCheckedChange={(checked) => updateField('strategicConsiderations.pooledFundingEligible', checked)}
                      />
                      <label htmlFor="pooled-funding" className="text-sm font-medium cursor-pointer">
                        Eligible for pooled funding mechanisms
                    </label>
                  </div>
              </div>

              {governmentInputs.strategicConsiderations?.pooledFundingEligible && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                    <Input
                        placeholder="Pooled Fund Name"
                      value={governmentInputs.strategicConsiderations?.pooledFundName || ""}
                      onChange={(e) => updateField('strategicConsiderations.pooledFundName', e.target.value)}
                    />
                    <Input
                        placeholder="Fund Manager"
                      value={governmentInputs.strategicConsiderations?.fundManager || ""}
                      onChange={(e) => updateField('strategicConsiderations.fundManager', e.target.value)}
                    />
                </div>
              )}
                </div>
            </CardContent>
        </Card>
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation" className="space-y-6 mt-6">
            
            <Card>
              <CardHeader>
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                    <CardTitle className="text-lg">Evaluation & Results Framework</CardTitle>
                    <CardDescription>
                      Link to national monitoring and evaluation systems
                    </CardDescription>
              </div>
            </div>
          </CardHeader>
            <CardContent className="space-y-4">
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Has this activity been evaluated by government?</h4>
                <RadioGroup
                  value={governmentInputs.evaluationResults?.hasEvaluation ? "yes" : "no"}
                  onValueChange={(value) => updateField('evaluationResults.hasEvaluation', value === "yes")}
                    className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="eval-yes" />
                      <label htmlFor="eval-yes" className="text-sm font-medium cursor-pointer">
                        Yes, evaluated
                      </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="eval-no" />
                      <label htmlFor="eval-no" className="text-sm font-medium cursor-pointer">
                        Not evaluated
                      </label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.evaluationResults?.hasEvaluation && (
                  <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <span className="font-medium text-slate-900">Evaluation Document</span>
                    </div>
                      <p className="text-sm text-slate-600 mb-3">Upload the government evaluation report</p>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Evaluation
                        </Button>
                      </div>
                      
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-3">Is this included in national results framework?</h4>
                <RadioGroup
                  value={governmentInputs.evaluationResults?.inNationalFramework ? "yes" : "no"}
                  onValueChange={(value) => updateField('evaluationResults.inNationalFramework', value === "yes")}
                        className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="framework-yes" />
                          <label htmlFor="framework-yes" className="text-sm font-medium cursor-pointer">
                            Yes, in national framework
                          </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="framework-no" />
                          <label htmlFor="framework-no" className="text-sm font-medium cursor-pointer">
                            Not in framework
                          </label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.evaluationResults?.inNationalFramework && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          National Indicator Reference
                        </label>
                  <Input
                          placeholder="e.g., NRF-2.3.1"
                    value={governmentInputs.evaluationResults?.nationalIndicatorRef || ""}
                    onChange={(e) => updateField('evaluationResults.nationalIndicatorRef', e.target.value)}
                  />
                </div>
              )}
                  </div>
                )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Helper functions
function getDimensionHelp(key: string): string {
  const helpTexts: Record<string, string> = {
    onPlan: "Reflected in government strategic planning documents or sector strategies",
    onBudget: "Included in the government budget documentation (national budget book)",
    onTreasury: "Funds are disbursed through the government's main Treasury system",
    onParliament: "Subject to parliamentary scrutiny (appropriated or reported in public financial statements)",
    onProcurement: "Uses national procurement systems and follows national procurement rules",
    onAudit: "Reported through the government's accounting system and audited by national audit systems"
  };
  return helpTexts[key] || "";
}

function getStatusIcon(status: string | undefined) {
  switch (status) {
    case "Yes":
      return <CheckCircle2 className="h-4 w-4 text-gray-600" />;
    case "Partial":
      return <CircleSlash className="h-4 w-4 text-gray-500" />;
    case "No":
      return <Circle className="h-4 w-4 text-gray-400" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
}