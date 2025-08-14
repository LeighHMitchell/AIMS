import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, Upload, HelpCircle, FileText, CheckCircle2, Circle, CircleSlash } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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

// Sample data - in real app, these would come from API
const NATIONAL_PLANS = [
  "National Strategic Development Plan 2019-2023",
  "Cambodia SDGs 2016-2030",
  "Rectangular Strategy Phase IV",
  "National Social Protection Policy Framework 2016-2025",
  "Education Strategic Plan 2019-2023",
  "Health Strategic Plan 2016-2020"
];

const MINISTRIES = [
  "Ministry of Economy and Finance",
  "Ministry of Planning",
  "Ministry of Education, Youth and Sport",
  "Ministry of Health",
  "Ministry of Agriculture, Forestry and Fisheries",
  "Ministry of Rural Development",
  "Ministry of Public Works and Transport",
  "Ministry of Social Affairs, Veterans and Youth Rehabilitation",
  "Ministry of Women's Affairs",
  "Ministry of Environment"
];

const TWG_LIST = [
  "TWG on Agriculture and Water",
  "TWG on Education",
  "TWG on Fisheries",
  "TWG on Forestry and Environment",
  "TWG on Gender",
  "TWG on Health",
  "TWG on HIV/AIDS",
  "TWG on Infrastructure and Regional Integration",
  "TWG on Legal and Judicial Reform",
  "TWG on Local Governance",
  "TWG on Mine Action",
  "TWG on Partnership and Harmonization",
  "TWG on Planning and Poverty Reduction",
  "TWG on Private Sector Development",
  "TWG on Public Administration Reform",
  "TWG on Public Financial Management Reform"
];

const PROVINCES = [
  "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang",
  "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep",
  "Koh Kong", "Kratie", "Mondulkiri", "Oddar Meanchey", "Pailin",
  "Phnom Penh", "Preah Sihanouk", "Preah Vihear", "Prey Veng",
  "Pursat", "Ratanakiri", "Siem Reap", "Stung Treng", "Svay Rieng",
  "Takeo", "Tboung Khmum"
];

export default function GovernmentInputsSection({ 
  governmentInputs, 
  onChange 
}: GovernmentInputsSectionProps) {
  const [annualContribution, setAnnualContribution] = useState({
    year: new Date().getFullYear(),
    amountLocal: 0,
    amountUSD: 0
  });

  // Calculate on-budget dimensions met
  const calculateDimensionsMet = () => {
    const classification = governmentInputs.onBudgetClassification || {};
    const dimensions = ['onPlan', 'onBudget', 'onTreasury', 'onParliament', 'onProcurement', 'onAudit'];
    const met = dimensions.filter(dim => classification[dim as keyof typeof classification] === 'Yes').length;
    const partial = dimensions.filter(dim => classification[dim as keyof typeof classification] === 'Partial').length;
    return { met, partial, total: dimensions.length };
  };

  const dimensionsMet = calculateDimensionsMet();

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const updated = { ...governmentInputs };
    let current: any = updated;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = current[key] || {};
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    onChange(updated);
  };

  const addAnnualContribution = () => {
    if (!annualContribution.year || annualContribution.amountLocal <= 0) {
      toast.error("Please enter valid year and amount");
      return;
    }

    const annual = governmentInputs.rgcContribution?.annual || [];
    const exists = annual.find(a => a.year === annualContribution.year);
    
    if (exists) {
      toast.error("Contribution for this year already exists");
      return;
    }

    updateField('rgcContribution.annual', [...annual, annualContribution]);
    setAnnualContribution({
      year: new Date().getFullYear(),
      amountLocal: 0,
      amountUSD: 0
    });
    toast.success("Annual contribution added");
  };

  const removeAnnualContribution = (year: number) => {
    const annual = governmentInputs.rgcContribution?.annual || [];
    updateField('rgcContribution.annual', annual.filter(a => a.year !== year));
  };

  const handleFileUpload = async (field: string, file: File) => {
    // In real implementation, this would upload to server
    // For now, we'll just store the filename
    updateField(field, file.name);
    toast.success(`File "${file.name}" uploaded successfully`);
  };

  return (
    <TooltipProvider>
      <div className="max-w-6xl space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Government Inputs</h2>
          <p className="text-gray-600 mt-2">
            Government-specific information and alignment details
          </p>
        </div>

        <Tabs defaultValue="budget-classification" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 border border-gray-200">
            <TabsTrigger value="budget-classification" className="text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Budget Classification
            </TabsTrigger>
            <TabsTrigger value="planning-coordination" className="text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Planning & Coordination
            </TabsTrigger>
            <TabsTrigger value="oversight-context" className="text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Oversight & Context
            </TabsTrigger>
            <TabsTrigger value="evaluation-results" className="text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900">
              Evaluation & Results
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Budget Classification & Financial Contribution */}
          <TabsContent value="budget-classification" className="mt-6 border-0 p-0 bg-transparent">
            <div className="space-y-6">

            {/* 1. On-Budget Classification */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  On-Budget Classification (per CABRI/SPA model)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Classification based on the CABRI/SPA 2008 "Putting Aid on Budget" Good Practice Note six dimensions</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                {/* Dimensions Status Badge */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="border-gray-300 text-gray-700">
                    {dimensionsMet.met} of {dimensionsMet.total} dimensions met
                  </Badge>
                  {dimensionsMet.partial > 0 && (
                    <Badge variant="outline" className="border-gray-300 text-gray-600">{dimensionsMet.partial} partial</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* On Plan */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Plan
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Reflected in government strategic planning documents or sector strategies</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onPlan || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onPlan', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="plan-yes" />
                  <label htmlFor="plan-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="plan-no" />
                  <label htmlFor="plan-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="plan-partial" />
                  <label htmlFor="plan-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* On Budget */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Budget
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Included in the government budget documentation (national budget book)</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onBudget || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onBudget', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="budget-yes" />
                  <label htmlFor="budget-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="budget-no" />
                  <label htmlFor="budget-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="budget-partial" />
                  <label htmlFor="budget-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* On Treasury */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Treasury
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Funds are disbursed through the government's main Treasury system</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onTreasury || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onTreasury', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="treasury-yes" />
                  <label htmlFor="treasury-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="treasury-no" />
                  <label htmlFor="treasury-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="treasury-partial" />
                  <label htmlFor="treasury-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* On Parliament */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Parliament
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Subject to parliamentary scrutiny (appropriated or reported in public financial statements)</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onParliament || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onParliament', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="parliament-yes" />
                  <label htmlFor="parliament-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="parliament-no" />
                  <label htmlFor="parliament-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="parliament-partial" />
                  <label htmlFor="parliament-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* On Procurement */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Procurement
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Uses national procurement systems and follows national procurement rules</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onProcurement || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onProcurement', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="procurement-yes" />
                  <label htmlFor="procurement-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="procurement-no" />
                  <label htmlFor="procurement-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="procurement-partial" />
                  <label htmlFor="procurement-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* On Accounting/Audit */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <label className="text-sm font-medium flex items-center gap-2 text-gray-900">
                      On Accounting/Audit
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Reported through the government's accounting system and audited by national audit systems</p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  </div>
              <RadioGroup
                value={governmentInputs.onBudgetClassification?.onAudit || ""}
                onValueChange={(value) => updateField('onBudgetClassification.onAudit', value)}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Yes" id="audit-yes" />
                  <label htmlFor="audit-yes" className="cursor-pointer text-sm">Yes</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="No" id="audit-no" />
                  <label htmlFor="audit-no" className="cursor-pointer text-sm">No</label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="Partial" id="audit-partial" />
                  <label htmlFor="audit-partial" className="cursor-pointer text-sm">Partial</label>
                </div>
              </RadioGroup>
            </div>

                {/* Supporting Documents Section */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium mb-2 text-gray-900">Supporting Documents</h4>
                  <p className="text-xs text-gray-600 mb-3">Upload or link documents that support "Yes" classifications</p>
                  <div className="space-y-2">
                    {(governmentInputs.onBudgetClassification?.supportingDocs || []).map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{doc.dimension}:</span>
                        <span className="text-gray-700">{doc.docName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const docs = governmentInputs.onBudgetClassification?.supportingDocs || [];
                            updateField('onBudgetClassification.supportingDocs', docs.filter((_, i) => i !== index));
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dimension = prompt("Which dimension does this document support? (e.g., On Plan, On Budget)");
                        if (dimension) {
                          const docName = prompt("Document name or description:");
                          if (docName) {
                            const docs = governmentInputs.onBudgetClassification?.supportingDocs || [];
                            updateField('onBudgetClassification.supportingDocs', [...docs, { dimension, docName }]);
                          }
                        }
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Document Reference
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Government Financial Contribution */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Government Financial Contribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Is counterpart (RGC) funding provided?</label>
                  <RadioGroup
                    value={governmentInputs.rgcContribution?.isProvided ? "yes" : "no"}
                    onValueChange={(value) => updateField('rgcContribution.isProvided', value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="rgc-yes" />
                      <label htmlFor="rgc-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="rgc-no" />
                      <label htmlFor="rgc-no" className="cursor-pointer text-sm text-gray-700">No</label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.rgcContribution?.isProvided && (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-900">Annual breakdown</label>
                      <div className="space-y-2">
                        {(governmentInputs.rgcContribution?.annual || []).map((item) => (
                          <div key={item.year} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <span className="font-medium text-gray-900">{item.year}:</span>
                            <span className="text-gray-700">{item.amountLocal.toLocaleString()} KHR</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-gray-700">${item.amountUSD.toLocaleString()}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAnnualContribution(item.year)}
                              className="ml-auto text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          type="number"
                          placeholder="Year"
                          value={annualContribution.year}
                          onChange={(e) => setAnnualContribution({
                            ...annualContribution,
                            year: parseInt(e.target.value) || new Date().getFullYear()
                          })}
                          className="border-gray-300"
                        />
                        <Input
                          type="number"
                          placeholder="Amount (KHR)"
                          value={annualContribution.amountLocal || ""}
                          onChange={(e) => setAnnualContribution({
                            ...annualContribution,
                            amountLocal: parseFloat(e.target.value) || 0
                          })}
                          className="border-gray-300"
                        />
                        <Input
                          type="number"
                          placeholder="Amount (USD)"
                          value={annualContribution.amountUSD || ""}
                          onChange={(e) => setAnnualContribution({
                            ...annualContribution,
                            amountUSD: parseFloat(e.target.value) || 0
                          })}
                          className="border-gray-300"
                        />
                        <Button onClick={addAnnualContribution} className="bg-gray-800 text-white hover:bg-gray-700">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="in-kind">In-kind contributions</label>
                      <Textarea
                        id="in-kind"
                        placeholder="Describe any in-kind contributions..."
                        value={governmentInputs.rgcContribution?.inKindContributions || ""}
                        onChange={(e) => updateField('rgcContribution.inKindContributions', e.target.value)}
                        rows={3}
                        className="border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="funding-source">Source of funding</label>
                      <Input
                        id="funding-source"
                        placeholder="e.g., Treasury, subnational, external loan repayment"
                        value={governmentInputs.rgcContribution?.sourceOfFunding || ""}
                        onChange={(e) => updateField('rgcContribution.sourceOfFunding', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Planning & Coordination */}
          <TabsContent value="planning-coordination" className="mt-6 border-0 p-0 bg-transparent">
            <div className="space-y-6">

            {/* National Planning Alignment */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">National Planning Alignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Aligned with national/sector plans?</label>
                  <RadioGroup
                    value={governmentInputs.nationalPlanAlignment?.isAligned ? "yes" : "no"}
                    onValueChange={(value) => updateField('nationalPlanAlignment.isAligned', value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="aligned-yes" />
                      <label htmlFor="aligned-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="aligned-no" />
                      <label htmlFor="aligned-no" className="cursor-pointer text-sm text-gray-700">No</label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.nationalPlanAlignment?.isAligned && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Select plan name</label>
                      <Select
                        value={governmentInputs.nationalPlanAlignment?.planName || ""}
                        onValueChange={(value) => updateField('nationalPlanAlignment.planName', value)}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select a national plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {NATIONAL_PLANS.map((plan) => (
                            <SelectItem key={plan} value={plan}>
                              {plan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="sub-goal">Sub-goal / Priority area</label>
                      <Input
                        id="sub-goal"
                        value={governmentInputs.nationalPlanAlignment?.subGoal || ""}
                        onChange={(e) => updateField('nationalPlanAlignment.subGoal', e.target.value)}
                        placeholder="e.g., Goal 2.1 - Improve primary education access"
                        className="border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="indicator-code">National indicator code (optional)</label>
                      <Input
                        id="indicator-code"
                        value={governmentInputs.nationalPlanAlignment?.nationalIndicatorCode || ""}
                        onChange={(e) => updateField('nationalPlanAlignment.nationalIndicatorCode', e.target.value)}
                        placeholder="e.g., NSP-EDU-12"
                        className="border-gray-300"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Technical Coordination */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Technical Coordination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Which Technical Working Groups (TWGs) are associated?</label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const current = governmentInputs.technicalCoordination?.workingGroups || [];
                      if (!current.includes(value)) {
                        updateField('technicalCoordination.workingGroups', [...current, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select TWGs" />
                    </SelectTrigger>
                    <SelectContent>
                      {TWG_LIST.map((twg) => (
                        <SelectItem key={twg} value={twg}>
                          {twg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(governmentInputs.technicalCoordination?.workingGroups || []).map((twg) => (
                      <div key={twg} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                        {twg}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            const current = governmentInputs.technicalCoordination?.workingGroups || [];
                            updateField('technicalCoordination.workingGroups', current.filter(t => t !== twg));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Accountable Ministry or Subnational Body</label>
                  <Select
                    value={governmentInputs.technicalCoordination?.accountableMinistry || ""}
                    onValueChange={(value) => updateField('technicalCoordination.accountableMinistry', value)}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select ministry/department" />
                    </SelectTrigger>
                    <SelectContent>
                      {MINISTRIES.map((ministry) => (
                        <SelectItem key={ministry} value={ministry}>
                          {ministry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Region/Province</label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const current = governmentInputs.technicalCoordination?.regions || [];
                      if (!current.includes(value)) {
                        updateField('technicalCoordination.regions', [...current, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select provinces" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(governmentInputs.technicalCoordination?.regions || []).map((region) => (
                      <div key={region} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                        {region}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            const current = governmentInputs.technicalCoordination?.regions || [];
                            updateField('technicalCoordination.regions', current.filter(r => r !== region));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900">Government Focal Point</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="focal-name">Name</label>
                      <Input
                        id="focal-name"
                        value={governmentInputs.technicalCoordination?.focalPoint?.name || ""}
                        onChange={(e) => updateField('technicalCoordination.focalPoint.name', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="focal-title">Title</label>
                      <Input
                        id="focal-title"
                        value={governmentInputs.technicalCoordination?.focalPoint?.title || ""}
                        onChange={(e) => updateField('technicalCoordination.focalPoint.title', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="focal-email">Email</label>
                      <Input
                        id="focal-email"
                        type="email"
                        value={governmentInputs.technicalCoordination?.focalPoint?.email || ""}
                        onChange={(e) => updateField('technicalCoordination.focalPoint.email', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900" htmlFor="focal-phone">Phone</label>
                      <Input
                        id="focal-phone"
                        value={governmentInputs.technicalCoordination?.focalPoint?.phone || ""}
                        onChange={(e) => updateField('technicalCoordination.focalPoint.phone', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Oversight & Context */}
          <TabsContent value="oversight-context" className="mt-6 border-0 p-0 bg-transparent">
            <div className="space-y-6">

            {/* Oversight & Agreement Status */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Oversight & Agreement Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">MOU or Agreement Signed?</label>
                  <RadioGroup
                    value={governmentInputs.oversightAgreement?.mouStatus || ""}
                    onValueChange={(value) => updateField('oversightAgreement.mouStatus', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="mou-yes" />
                      <label htmlFor="mou-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="mou-no" />
                      <label htmlFor="mou-no" className="cursor-pointer text-sm text-gray-700">No</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="drafted" id="mou-drafted" />
                      <label htmlFor="mou-drafted" className="cursor-pointer text-sm text-gray-700">Drafted</label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.oversightAgreement?.mouStatus === "yes" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Upload scanned agreement</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('oversightAgreement.agreementFile', file);
                          }}
                          className="hidden"
                          id="agreement-upload"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('agreement-upload')?.click()}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                        {governmentInputs.oversightAgreement?.agreementFile && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {governmentInputs.oversightAgreement.agreementFile}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Name of signing agency/department</label>
                      <Select
                        value={governmentInputs.oversightAgreement?.signingAgency || ""}
                        onValueChange={(value) => updateField('oversightAgreement.signingAgency', value)}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select agency/department" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINISTRIES.map((ministry) => (
                            <SelectItem key={ministry} value={ministry}>
                              {ministry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900" htmlFor="oversight-ministry">Oversight Ministry or Coordination Department</label>
                  <Input
                    id="oversight-ministry"
                    value={governmentInputs.oversightAgreement?.oversightMinistry || ""}
                    onChange={(e) => updateField('oversightAgreement.oversightMinistry', e.target.value)}
                    placeholder="Enter ministry or department name"
                    className="border-gray-300"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Geographic and Risk Context */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Geographic and Risk Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Location-specific context: Provinces/Districts</label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const current = governmentInputs.geographicContext?.locations || [];
                      if (!current.includes(value)) {
                        updateField('geographicContext.locations', [...current, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select provinces/districts" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(governmentInputs.geographicContext?.locations || []).map((location) => (
                      <div key={location} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-gray-300">
                        {location}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            const current = governmentInputs.geographicContext?.locations || [];
                            updateField('geographicContext.locations', current.filter(l => l !== location));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Is the project in a high-risk or special classification area?</label>
                  <div className="space-y-2">
                    {["Conflict-affected", "Disaster-prone", "Mine-affected", "Other"].map((risk) => (
                      <div key={risk} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(governmentInputs.geographicContext?.riskClassifications || []).includes(risk)}
                          onCheckedChange={(checked: boolean) => {
                            const current = governmentInputs.geographicContext?.riskClassifications || [];
                            if (checked) {
                              updateField('geographicContext.riskClassifications', [...current, risk]);
                            } else {
                              updateField('geographicContext.riskClassifications', current.filter(r => r !== risk));
                            }
                          }}
                        />
                        <label htmlFor={`risk-${risk}`} className="cursor-pointer text-sm text-gray-700">
                          {risk}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {(governmentInputs.geographicContext?.riskClassifications || []).includes("Other") && (
                    <Input
                      placeholder="Please specify..."
                      value={governmentInputs.geographicContext?.otherRiskSpecification || ""}
                      onChange={(e) => updateField('geographicContext.otherRiskSpecification', e.target.value)}
                      className="border-gray-300"
                    />
                  )}
                </div>

                {/* Strategic and Funding Considerations */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900">Strategic Considerations</h4>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900">Is the project politically sensitive or visibility-restricted?</label>
                    <RadioGroup
                      value={governmentInputs.strategicConsiderations?.isPoliticallySensitive ? "yes" : "no"}
                      onValueChange={(value) => updateField('strategicConsiderations.isPoliticallySensitive', value === "yes")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="sensitive-yes" />
                        <label htmlFor="sensitive-yes" className="cursor-pointer text-sm text-gray-700">
                          Yes — limit visibility to government and lead development partner
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="sensitive-no" />
                        <label htmlFor="sensitive-no" className="cursor-pointer text-sm text-gray-700">
                          No — open visibility
                        </label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900">Pooled Funding Eligibility</label>
                    <RadioGroup
                      value={governmentInputs.strategicConsiderations?.pooledFundingEligible ? "yes" : "no"}
                      onValueChange={(value) => updateField('strategicConsiderations.pooledFundingEligible', value === "yes")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="pooled-yes" />
                        <label htmlFor="pooled-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="pooled-no" />
                        <label htmlFor="pooled-no" className="cursor-pointer text-sm text-gray-700">No</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {governmentInputs.strategicConsiderations?.pooledFundingEligible && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900" htmlFor="pooled-fund-name">Name of pooled fund</label>
                        <Input
                          id="pooled-fund-name"
                          value={governmentInputs.strategicConsiderations?.pooledFundName || ""}
                          onChange={(e) => updateField('strategicConsiderations.pooledFundName', e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900" htmlFor="fund-manager">Fund manager</label>
                        <Input
                          id="fund-manager"
                          value={governmentInputs.strategicConsiderations?.fundManager || ""}
                          onChange={(e) => updateField('strategicConsiderations.fundManager', e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Tab 4: Evaluation & Results */}
          <TabsContent value="evaluation-results" className="mt-6 border-0 p-0 bg-transparent">
            <div className="space-y-6">

            {/* Evaluation and Results */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Evaluation and Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Has the government received an evaluation from the partner?</label>
                  <RadioGroup
                    value={governmentInputs.evaluationResults?.hasEvaluation ? "yes" : "no"}
                    onValueChange={(value) => updateField('evaluationResults.hasEvaluation', value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="eval-yes" />
                      <label htmlFor="eval-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="eval-no" />
                      <label htmlFor="eval-no" className="cursor-pointer text-sm text-gray-700">No</label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.evaluationResults?.hasEvaluation && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Upload document or paste link</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('evaluationResults.evaluationDocument', file);
                        }}
                        className="hidden"
                        id="evaluation-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('evaluation-upload')?.click()}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                      <span className="text-sm text-gray-500">or</span>
                      <Input
                        placeholder="Paste document link"
                        value={governmentInputs.evaluationResults?.evaluationDocument || ""}
                        onChange={(e) => updateField('evaluationResults.evaluationDocument', e.target.value)}
                        className="flex-1 border-gray-300"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Is this activity in the national results framework?</label>
                  <RadioGroup
                    value={governmentInputs.evaluationResults?.inNationalFramework ? "yes" : "no"}
                    onValueChange={(value) => updateField('evaluationResults.inNationalFramework', value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="framework-yes" />
                      <label htmlFor="framework-yes" className="cursor-pointer text-sm text-gray-700">Yes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="framework-no" />
                      <label htmlFor="framework-no" className="cursor-pointer text-sm text-gray-700">No</label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.evaluationResults?.inNationalFramework && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900" htmlFor="national-ref">National indicator reference code</label>
                    <Input
                      id="national-ref"
                      value={governmentInputs.evaluationResults?.nationalIndicatorRef || ""}
                      onChange={(e) => updateField('evaluationResults.nationalIndicatorRef', e.target.value)}
                      placeholder="e.g., NSP-GEN-01"
                      className="border-gray-300"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
} 