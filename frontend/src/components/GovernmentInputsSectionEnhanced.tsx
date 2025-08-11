import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Upload, HelpCircle, FileText, CheckCircle2, Circle, CircleSlash, AlertCircle, Info, ChevronRight, TrendingUp, Globe, Shield, Users, Building, Target, Wallet } from "lucide-react";
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

// Help text definitions
const HELP_TEXT = {
  onPlan: "Indicates whether the activity is included in government strategic planning documents, sector strategies, or annual work plans. This shows alignment with national priorities.",
  onBudget: "Shows if the activity is included in the national budget book or budget documentation presented to parliament. This demonstrates transparency and formal budget allocation.",
  onTreasury: "Indicates if funds flow through the government's main treasury system or single treasury account, ensuring financial controls and oversight.",
  onParliament: "Shows whether the activity is subject to parliamentary scrutiny through appropriation acts or public financial reporting, ensuring democratic oversight.",
  onProcurement: "Indicates if the activity uses national procurement systems and follows government procurement rules, supporting local capacity and systems.",
  onAudit: "Shows if the activity is reported through government accounting systems and subject to national audit processes, ensuring accountability.",
  counterpartFunding: "Government financial contribution demonstrates ownership and commitment. Include both cash and in-kind contributions.",
  nationalAlignment: "Linking to national plans ensures activities support country priorities and contribute to national development goals.",
  twgCoordination: "Technical Working Groups provide sector coordination and ensure activities are harmonized with other initiatives.",
  mouStatus: "Formal agreements clarify roles, responsibilities, and implementation arrangements between government and partners.",
  geographicRisk: "Understanding location-specific risks helps in planning appropriate mitigation measures and resource allocation.",
  politicalSensitivity: "Some activities may require restricted visibility due to political sensitivities or security concerns.",
  pooledFunding: "Pooled funds allow multiple partners to contribute to common objectives with reduced transaction costs.",
  evaluationSharing: "Sharing evaluation results helps government learn from experience and improve future programming.",
  resultsFramework: "Linking to the national results framework ensures activities contribute to measurable national outcomes."
};

// Section icons and colors
const SECTION_CONFIG = {
  onBudget: { icon: TrendingUp, color: "blue" },
  contribution: { icon: Wallet, color: "green" },
  alignment: { icon: Target, color: "purple" },
  coordination: { icon: Users, color: "orange" },
  oversight: { icon: Shield, color: "red" },
  geographic: { icon: Globe, color: "teal" },
  strategic: { icon: Building, color: "indigo" },
  evaluation: { icon: CheckCircle2, color: "pink" }
};

export default function GovernmentInputsSectionEnhanced({ 
  governmentInputs, 
  onChange 
}: GovernmentInputsSectionProps) {
  const [annualContribution, setAnnualContribution] = useState({
    year: new Date().getFullYear(),
    amountLocal: 0,
    amountUSD: 0
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['onBudget']);

  // Calculate on-budget dimensions met
  const calculateDimensionsMet = () => {
    const classification = governmentInputs.onBudgetClassification || {};
    const dimensions = ['onPlan', 'onBudget', 'onTreasury', 'onParliament', 'onProcurement', 'onAudit'];
    const met = dimensions.filter(dim => classification[dim as keyof typeof classification] === 'Yes').length;
    const partial = dimensions.filter(dim => classification[dim as keyof typeof classification] === 'Partial').length;
    return { met, partial, total: dimensions.length };
  };

  // Calculate overall completion percentage
  const calculateCompletion = () => {
    let totalFields = 0;
    let completedFields = 0;

    // On-budget classification (6 fields)
    const classification = governmentInputs.onBudgetClassification || {};
    ['onPlan', 'onBudget', 'onTreasury', 'onParliament', 'onProcurement', 'onAudit'].forEach(field => {
      totalFields++;
      if (classification[field as keyof typeof classification]) completedFields++;
    });

    // Government contribution (1 field minimum)
    totalFields++;
    if (governmentInputs.rgcContribution?.isProvided !== undefined) completedFields++;

    // National alignment (1 field minimum)
    totalFields++;
    if (governmentInputs.nationalPlanAlignment?.isAligned !== undefined) completedFields++;

    // Technical coordination (2 fields minimum)
    totalFields += 2;
    if (governmentInputs.technicalCoordination?.workingGroups?.length) completedFields++;
    if (governmentInputs.technicalCoordination?.accountableMinistry) completedFields++;

    // Oversight (1 field minimum)
    totalFields++;
    if (governmentInputs.oversightAgreement?.mouStatus) completedFields++;

    // Geographic context (1 field minimum)
    totalFields++;
    if (governmentInputs.geographicContext?.locations?.length) completedFields++;

    // Strategic considerations (2 fields)
    totalFields += 2;
    if (governmentInputs.strategicConsiderations?.isPoliticallySensitive !== undefined) completedFields++;
    if (governmentInputs.strategicConsiderations?.pooledFundingEligible !== undefined) completedFields++;

    // Evaluation (2 fields)
    totalFields += 2;
    if (governmentInputs.evaluationResults?.hasEvaluation !== undefined) completedFields++;
    if (governmentInputs.evaluationResults?.inNationalFramework !== undefined) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  const dimensionsMet = calculateDimensionsMet();
  const completionPercentage = calculateCompletion();

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
    updateField(field, file.name);
    toast.success(`File "${file.name}" uploaded successfully`);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const BudgetDimensionItem = ({ 
    dimension, 
    label, 
    helpText, 
    field 
  }: { 
    dimension: string; 
    label: string; 
    helpText: string; 
    field: string;
  }) => {
    const rawValue = governmentInputs.onBudgetClassification?.[field as keyof typeof governmentInputs.onBudgetClassification];
    const value = typeof rawValue === 'string' ? rawValue : "";
    const getStatusIcon = () => {
      switch (value) {
        case 'Yes': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'Partial': return <CircleSlash className="h-4 w-4 text-yellow-600" />;
        case 'No': return <X className="h-4 w-4 text-red-600" />;
        default: return <Circle className="h-4 w-4 text-gray-400" />;
      }
    };

    return (
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        value === 'Yes' && "bg-green-50 border-green-200",
        value === 'Partial' && "bg-yellow-50 border-yellow-200",
        value === 'No' && "bg-red-50 border-red-200",
        !value && "bg-gray-50 border-gray-200 hover:bg-gray-100"
      )}>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <label className="text-sm font-medium flex items-center gap-2">
            {label}
            <HelpTextTooltip content={helpText} />
          </label>
        </div>
        <RadioGroup
          value={value}
          onValueChange={(value) => updateField(`onBudgetClassification.${field}`, value)}
          className="flex gap-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="Yes" id={`${field}-yes`} className="border-gray-300" />
            <label htmlFor={`${field}-yes`} className="cursor-pointer text-sm">Yes</label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="Partial" id={`${field}-partial`} className="border-gray-300" />
            <label htmlFor={`${field}-partial`} className="cursor-pointer text-sm">Partial</label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="No" id={`${field}-no`} className="border-gray-300" />
            <label htmlFor={`${field}-no`} className="cursor-pointer text-sm">No</label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="max-w-5xl space-y-6">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Government Inputs</h2>
              <p className="text-gray-600 mt-1">
                Capture government-specific information and alignment details
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Overall Completion</div>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="w-32" />
                <span className="text-sm font-medium">{completionPercentage}%</span>
              </div>
            </div>
          </div>
          
          {/* Quick Overview Alert */}
          {completionPercentage < 30 && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Getting Started:</strong> Begin with the On-Budget Classification to establish how this activity aligns with government systems. Each section builds upon the previous one.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 1. On-Budget Classification */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('onBudget') && "border-blue-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('onBudget')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">On-Budget Classification</CardTitle>
                  <CardDescription>CABRI/SPA 2008 six dimensions assessment</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={dimensionsMet.met >= 4 ? "success" : dimensionsMet.met >= 2 ? "default" : "secondary"}>
                    {dimensionsMet.met}/{dimensionsMet.total} met
                  </Badge>
                  {dimensionsMet.partial > 0 && (
                    <Badge variant="outline">{dimensionsMet.partial} partial</Badge>
                  )}
                </div>
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('onBudget') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('onBudget') && (
            <CardContent className="space-y-3">
              <BudgetDimensionItem
                dimension="onPlan"
                label="On Plan"
                helpText={HELP_TEXT.onPlan}
                field="onPlan"
              />
              <BudgetDimensionItem
                dimension="onBudget"
                label="On Budget"
                helpText={HELP_TEXT.onBudget}
                field="onBudget"
              />
              <BudgetDimensionItem
                dimension="onTreasury"
                label="On Treasury"
                helpText={HELP_TEXT.onTreasury}
                field="onTreasury"
              />
              <BudgetDimensionItem
                dimension="onParliament"
                label="On Parliament"
                helpText={HELP_TEXT.onParliament}
                field="onParliament"
              />
              <BudgetDimensionItem
                dimension="onProcurement"
                label="On Procurement"
                helpText={HELP_TEXT.onProcurement}
                field="onProcurement"
              />
              <BudgetDimensionItem
                dimension="onAudit"
                label="On Accounting/Audit"
                helpText={HELP_TEXT.onAudit}
                field="onAudit"
              />

              {/* Supporting Documents Section */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium">Supporting Documents</h4>
                  <HelpTextTooltip content="Upload documents that validate your 'Yes' classifications, such as budget books, treasury reports, or audit documents." />
                </div>
                
                <div className="space-y-2">
                  {(governmentInputs.onBudgetClassification?.supportingDocs || []).map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{doc.dimension}:</span>
                      <span className="flex-1">{doc.docName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const docs = governmentInputs.onBudgetClassification?.supportingDocs || [];
                          updateField('onBudgetClassification.supportingDocs', docs.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
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
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Document Reference
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 2. Government Financial Contribution */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('contribution') && "border-green-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('contribution')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Government Financial Contribution</CardTitle>
                  <CardDescription>Counterpart funding and in-kind contributions</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {governmentInputs.rgcContribution?.isProvided && (
                  <Badge variant="success">Provided</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('contribution') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('contribution') && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Is counterpart (RGC) funding provided?</label>
                  <HelpTextTooltip content={HELP_TEXT.counterpartFunding} />
                </div>
                <RadioGroup
                  value={governmentInputs.rgcContribution?.isProvided ? "yes" : "no"}
                  onValueChange={(value) => updateField('rgcContribution.isProvided', value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="rgc-yes" />
                    <label htmlFor="rgc-yes" className="cursor-pointer text-sm">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="rgc-no" />
                    <label htmlFor="rgc-no" className="cursor-pointer text-sm">No</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.rgcContribution?.isProvided && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Annual breakdown</label>
                      <HelpTextTooltip content="Add government contributions by year. You can specify amounts in both local currency and USD." />
                    </div>
                    
                    {/* Annual contributions list */}
                    <div className="space-y-2">
                      {(governmentInputs.rgcContribution?.annual || []).map((item) => (
                        <div key={item.year} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="font-medium text-green-900">{item.year}</span>
                          <span className="text-green-700">{item.amountLocal.toLocaleString()} KHR</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-green-700">${item.amountUSD.toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAnnualContribution(item.year)}
                            className="ml-auto hover:bg-green-100"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add new contribution form */}
                    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                      <Input
                        type="number"
                        placeholder="Year"
                        value={annualContribution.year}
                        onChange={(e) => setAnnualContribution({
                          ...annualContribution,
                          year: parseInt(e.target.value) || new Date().getFullYear()
                        })}
                        className="bg-white"
                      />
                      <Input
                        type="number"
                        placeholder="Amount (KHR)"
                        value={annualContribution.amountLocal || ""}
                        onChange={(e) => setAnnualContribution({
                          ...annualContribution,
                          amountLocal: parseFloat(e.target.value) || 0
                        })}
                        className="bg-white"
                      />
                      <Input
                        type="number"
                        placeholder="Amount (USD)"
                        value={annualContribution.amountUSD || ""}
                        onChange={(e) => setAnnualContribution({
                          ...annualContribution,
                          amountUSD: parseFloat(e.target.value) || 0
                        })}
                        className="bg-white"
                      />
                      <Button onClick={addAnnualContribution} className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium" htmlFor="in-kind">In-kind contributions</label>
                      <HelpTextTooltip content="Describe non-financial contributions such as office space, staff time, equipment, or other resources provided by the government." />
                    </div>
                    <Textarea
                      id="in-kind"
                      placeholder="e.g., Office space in ministry building, 2 full-time staff assigned, vehicle for field visits..."
                      value={governmentInputs.rgcContribution?.inKindContributions || ""}
                      onChange={(e) => updateField('rgcContribution.inKindContributions', e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium" htmlFor="funding-source">Source of funding</label>
                      <HelpTextTooltip content="Specify where the government contribution comes from: national treasury, subnational budgets, external loan repayment, etc." />
                    </div>
                    <Input
                      id="funding-source"
                      placeholder="e.g., National treasury allocation, Provincial budget, External loan repayment..."
                      value={governmentInputs.rgcContribution?.sourceOfFunding || ""}
                      onChange={(e) => updateField('rgcContribution.sourceOfFunding', e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* 3. National Planning Alignment */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('alignment') && "border-purple-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('alignment')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">National Planning Alignment</CardTitle>
                  <CardDescription>Link to national and sector development plans</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {governmentInputs.nationalPlanAlignment?.isAligned && (
                  <Badge variant="success">Aligned</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('alignment') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('alignment') && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Aligned with national/sector plans?</label>
                  <HelpTextTooltip content={HELP_TEXT.nationalAlignment} />
                </div>
                <RadioGroup
                  value={governmentInputs.nationalPlanAlignment?.isAligned ? "yes" : "no"}
                  onValueChange={(value) => updateField('nationalPlanAlignment.isAligned', value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="aligned-yes" />
                    <label htmlFor="aligned-yes" className="cursor-pointer text-sm">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="aligned-no" />
                    <label htmlFor="aligned-no" className="cursor-pointer text-sm">No</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.nationalPlanAlignment?.isAligned && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Select plan name</label>
                      <HelpTextTooltip content="Choose the primary national or sector plan this activity supports. You can add sub-goals in the next field." />
                    </div>
                    <Select
                      value={governmentInputs.nationalPlanAlignment?.planName || ""}
                      onValueChange={(value) => updateField('nationalPlanAlignment.planName', value)}
                    >
                      <SelectTrigger>
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
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium" htmlFor="sub-goal">Sub-goal / Priority area</label>
                      <HelpTextTooltip content="Specify the exact goal, objective, or priority area within the plan that this activity contributes to." />
                    </div>
                    <Input
                      id="sub-goal"
                      value={governmentInputs.nationalPlanAlignment?.subGoal || ""}
                      onChange={(e) => updateField('nationalPlanAlignment.subGoal', e.target.value)}
                      placeholder="e.g., Goal 2.1 - Improve primary education access and quality"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium" htmlFor="indicator-code">National indicator code (optional)</label>
                      <HelpTextTooltip content="If this activity contributes to a specific national indicator, enter its code here for tracking purposes." />
                    </div>
                    <Input
                      id="indicator-code"
                      value={governmentInputs.nationalPlanAlignment?.nationalIndicatorCode || ""}
                      onChange={(e) => updateField('nationalPlanAlignment.nationalIndicatorCode', e.target.value)}
                      placeholder="e.g., NSDP-EDU-2.1.3"
                    />
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* 4. Technical Coordination */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('coordination') && "border-orange-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('coordination')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Technical Coordination</CardTitle>
                  <CardDescription>Working groups, ministries, and focal points</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(governmentInputs.technicalCoordination?.workingGroups?.length || 0) > 0 && (
                  <Badge variant="outline">{governmentInputs.technicalCoordination?.workingGroups?.length} TWGs</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('coordination') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('coordination') && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Technical Working Groups (TWGs)</label>
                  <HelpTextTooltip content={HELP_TEXT.twgCoordination} />
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const current = governmentInputs.technicalCoordination?.workingGroups || [];
                    if (!current.includes(value)) {
                      updateField('technicalCoordination.workingGroups', [...current, value]);
                    }
                  }}
                >
                  <SelectTrigger>
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
                    <Badge key={twg} variant="secondary" className="pr-1">
                      {twg}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={() => {
                          const current = governmentInputs.technicalCoordination?.workingGroups || [];
                          updateField('technicalCoordination.workingGroups', current.filter(t => t !== twg));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Accountable Ministry or Subnational Body</label>
                  <HelpTextTooltip content="Select the primary government body responsible for overseeing this activity's implementation." />
                </div>
                <Select
                  value={governmentInputs.technicalCoordination?.accountableMinistry || ""}
                  onValueChange={(value) => updateField('technicalCoordination.accountableMinistry', value)}
                >
                  <SelectTrigger>
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
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Region/Province</label>
                  <HelpTextTooltip content="Select all provinces where this activity will be implemented. This helps with geographic coordination." />
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const current = governmentInputs.technicalCoordination?.regions || [];
                    if (!current.includes(value)) {
                      updateField('technicalCoordination.regions', [...current, value]);
                    }
                  }}
                >
                  <SelectTrigger>
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
                    <Badge key={region} variant="outline" className="pr-1">
                      {region}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={() => {
                          const current = governmentInputs.technicalCoordination?.regions || [];
                          updateField('technicalCoordination.regions', current.filter(r => r !== region));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Government Focal Point</h4>
                  <HelpTextTooltip content="Enter contact details for the primary government official responsible for this activity." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="focal-name">Name</label>
                    <Input
                      id="focal-name"
                      placeholder="Full name"
                      value={governmentInputs.technicalCoordination?.focalPoint?.name || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="focal-title">Title</label>
                    <Input
                      id="focal-title"
                      placeholder="Job title/position"
                      value={governmentInputs.technicalCoordination?.focalPoint?.title || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="focal-email">Email</label>
                    <Input
                      id="focal-email"
                      type="email"
                      placeholder="email@gov.kh"
                      value={governmentInputs.technicalCoordination?.focalPoint?.email || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="focal-phone">Phone</label>
                    <Input
                      id="focal-phone"
                      placeholder="+855 12 345 678"
                      value={governmentInputs.technicalCoordination?.focalPoint?.phone || ""}
                      onChange={(e) => updateField('technicalCoordination.focalPoint.phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 5. Oversight & Agreement Status */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('oversight') && "border-red-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('oversight')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Oversight & Agreement Status</CardTitle>
                  <CardDescription>MOU status and implementing arrangements</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {governmentInputs.oversightAgreement?.mouStatus === "yes" && (
                  <Badge variant="success">MOU Signed</Badge>
                )}
                {governmentInputs.oversightAgreement?.mouStatus === "drafted" && (
                  <Badge variant="outline">Drafted</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('oversight') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('oversight') && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">MOU or Agreement Status</label>
                  <HelpTextTooltip content={HELP_TEXT.mouStatus} />
                </div>
                <RadioGroup
                  value={governmentInputs.oversightAgreement?.mouStatus || ""}
                  onValueChange={(value) => updateField('oversightAgreement.mouStatus', value)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="mou-yes" />
                    <label htmlFor="mou-yes" className="cursor-pointer text-sm">Yes - Agreement signed</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="drafted" id="mou-drafted" />
                    <label htmlFor="mou-drafted" className="cursor-pointer text-sm">Drafted - Pending signature</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="mou-no" />
                    <label htmlFor="mou-no" className="cursor-pointer text-sm">No - Not yet drafted</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.oversightAgreement?.mouStatus === "yes" && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Upload scanned agreement</label>
                      <HelpTextTooltip content="Upload the signed MOU or agreement document for reference. Accepted formats: PDF, Word, or image files." />
                    </div>
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
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Name of signing agency/department</label>
                      <HelpTextTooltip content="Select the government agency that signed the agreement on behalf of the government." />
                    </div>
                    <Select
                      value={governmentInputs.oversightAgreement?.signingAgency || ""}
                      onValueChange={(value) => updateField('oversightAgreement.signingAgency', value)}
                    >
                      <SelectTrigger>
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
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" htmlFor="oversight-ministry">Oversight Ministry or Coordination Department</label>
                  <HelpTextTooltip content="Enter the ministry or department responsible for overall oversight and coordination of this activity." />
                </div>
                <Input
                  id="oversight-ministry"
                  value={governmentInputs.oversightAgreement?.oversightMinistry || ""}
                  onChange={(e) => updateField('oversightAgreement.oversightMinistry', e.target.value)}
                  placeholder="e.g., Ministry of Planning, Provincial Department of Education"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 6. Geographic and Risk Context */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('geographic') && "border-teal-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('geographic')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Globe className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Geographic and Risk Context</CardTitle>
                  <CardDescription>Location-specific context and risk factors</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(governmentInputs.geographicContext?.riskClassifications?.length || 0) > 0 && (
                  <Badge variant="outline">{governmentInputs.geographicContext?.riskClassifications?.length} risks</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('geographic') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('geographic') && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Location-specific context: Provinces/Districts</label>
                  <HelpTextTooltip content="Select all provinces and districts where this activity will be implemented. This helps identify location-specific risks and coordination needs." />
                </div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const current = governmentInputs.geographicContext?.locations || [];
                    if (!current.includes(value)) {
                      updateField('geographicContext.locations', [...current, value]);
                    }
                  }}
                >
                  <SelectTrigger>
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
                    <Badge key={location} variant="secondary" className="pr-1">
                      <Globe className="h-3 w-3 mr-1" />
                      {location}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={() => {
                          const current = governmentInputs.geographicContext?.locations || [];
                          updateField('geographicContext.locations', current.filter(l => l !== location));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Is the project in a high-risk or special classification area?</label>
                  <HelpTextTooltip content={HELP_TEXT.geographicRisk} />
                </div>
                
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="space-y-3">
                    {["Conflict-affected", "Disaster-prone", "Mine-affected", "Other"].map((risk) => (
                      <div key={risk} className="flex items-center space-x-2">
                        <Checkbox
                          id={`risk-${risk}`}
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
                        <label htmlFor={`risk-${risk}`} className="cursor-pointer text-sm font-medium">
                          {risk}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {(governmentInputs.geographicContext?.riskClassifications || []).includes("Other") && (
                    <div className="mt-3">
                      <Input
                        placeholder="Please specify other risk factors..."
                        value={governmentInputs.geographicContext?.otherRiskSpecification || ""}
                        onChange={(e) => updateField('geographicContext.otherRiskSpecification', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 7. Strategic and Funding Considerations */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('strategic') && "border-indigo-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('strategic')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Strategic and Funding Considerations</CardTitle>
                  <CardDescription>Visibility and pooled funding options</CardDescription>
                </div>
              </div>
              <ChevronRight className={cn(
                "h-5 w-5 text-gray-400 transition-transform",
                expandedSections.includes('strategic') && "rotate-90"
              )} />
            </div>
          </CardHeader>
          
          {expandedSections.includes('strategic') && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Is the project politically sensitive?</label>
                  <HelpTextTooltip content={HELP_TEXT.politicalSensitivity} />
                </div>
                
                <Alert className={governmentInputs.strategicConsiderations?.isPoliticallySensitive ? "bg-red-50 border-red-200" : "bg-gray-50"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Sensitive projects will have restricted visibility in public reports and dashboards.
                  </AlertDescription>
                </Alert>
                
                <RadioGroup
                  value={governmentInputs.strategicConsiderations?.isPoliticallySensitive ? "yes" : "no"}
                  onValueChange={(value) => updateField('strategicConsiderations.isPoliticallySensitive', value === "yes")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="sensitive-yes" />
                    <label htmlFor="sensitive-yes" className="cursor-pointer text-sm">
                      Yes — limit visibility to government and lead partner only
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="sensitive-no" />
                    <label htmlFor="sensitive-no" className="cursor-pointer text-sm">
                      No — standard visibility rules apply
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Pooled Funding Eligibility</label>
                  <HelpTextTooltip content={HELP_TEXT.pooledFunding} />
                </div>
                <RadioGroup
                  value={governmentInputs.strategicConsiderations?.pooledFundingEligible ? "yes" : "no"}
                  onValueChange={(value) => updateField('strategicConsiderations.pooledFundingEligible', value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="pooled-yes" />
                    <label htmlFor="pooled-yes" className="cursor-pointer text-sm">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="pooled-no" />
                    <label htmlFor="pooled-no" className="cursor-pointer text-sm">No</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.strategicConsiderations?.pooledFundingEligible && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="pooled-fund-name">Name of pooled fund</label>
                    <Input
                      id="pooled-fund-name"
                      placeholder="e.g., Education Sector Support Fund"
                      value={governmentInputs.strategicConsiderations?.pooledFundName || ""}
                      onChange={(e) => updateField('strategicConsiderations.pooledFundName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="fund-manager">Fund manager</label>
                    <Input
                      id="fund-manager"
                      placeholder="e.g., World Bank, UNICEF"
                      value={governmentInputs.strategicConsiderations?.fundManager || ""}
                      onChange={(e) => updateField('strategicConsiderations.fundManager', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* 8. Evaluation and Results */}
        <Card className={cn(
          "border-2 transition-all",
          expandedSections.includes('evaluation') && "border-pink-200 shadow-sm"
        )}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('evaluation')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Evaluation and Results</CardTitle>
                  <CardDescription>Evaluation sharing and results framework alignment</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {governmentInputs.evaluationResults?.hasEvaluation && (
                  <Badge variant="success">Evaluation Received</Badge>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-gray-400 transition-transform",
                  expandedSections.includes('evaluation') && "rotate-90"
                )} />
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.includes('evaluation') && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Has the government received an evaluation from the partner?</label>
                  <HelpTextTooltip content={HELP_TEXT.evaluationSharing} />
                </div>
                <RadioGroup
                  value={governmentInputs.evaluationResults?.hasEvaluation ? "yes" : "no"}
                  onValueChange={(value) => updateField('evaluationResults.hasEvaluation', value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="eval-yes" />
                    <label htmlFor="eval-yes" className="cursor-pointer text-sm">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="eval-no" />
                    <label htmlFor="eval-no" className="cursor-pointer text-sm">No</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.evaluationResults?.hasEvaluation && (
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Upload document or paste link</label>
                      <HelpTextTooltip content="Share the evaluation report by uploading the document or providing a link to where it can be accessed." />
                    </div>
                    <div className="flex flex-col gap-3">
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
                          size="sm"
                          onClick={() => document.getElementById('evaluation-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Evaluation Document
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">or</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      
                      <Input
                        placeholder="https://example.com/evaluation-report.pdf"
                        value={governmentInputs.evaluationResults?.evaluationDocument || ""}
                        onChange={(e) => updateField('evaluationResults.evaluationDocument', e.target.value)}
                      />
                      
                      {governmentInputs.evaluationResults?.evaluationDocument && (
                        <div className="flex items-center gap-2 text-sm text-pink-700">
                          <FileText className="h-4 w-4" />
                          <span>Document: {governmentInputs.evaluationResults.evaluationDocument}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Is this activity in the national results framework?</label>
                  <HelpTextTooltip content={HELP_TEXT.resultsFramework} />
                </div>
                
                <Alert className="bg-gray-50 border-gray-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Activities in the national results framework contribute to measurable national development outcomes and are tracked at the highest level.
                  </AlertDescription>
                </Alert>
                
                <RadioGroup
                  value={governmentInputs.evaluationResults?.inNationalFramework ? "yes" : "no"}
                  onValueChange={(value) => updateField('evaluationResults.inNationalFramework', value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="framework-yes" />
                    <label htmlFor="framework-yes" className="cursor-pointer text-sm">Yes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="framework-no" />
                    <label htmlFor="framework-no" className="cursor-pointer text-sm">No</label>
                  </div>
                </RadioGroup>
              </div>

              {governmentInputs.evaluationResults?.inNationalFramework && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium" htmlFor="national-ref">National indicator reference code</label>
                    <HelpTextTooltip content="Enter the specific code used in the national results framework to track this activity's contribution to national indicators." />
                  </div>
                  <Input
                    id="national-ref"
                    value={governmentInputs.evaluationResults?.nationalIndicatorRef || ""}
                    onChange={(e) => updateField('evaluationResults.nationalIndicatorRef', e.target.value)}
                    placeholder="e.g., NSDP-GEN-01, CSDGs-4.1.2"
                    className="font-mono"
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Summary Card */}
        {completionPercentage === 100 && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                All Government Inputs Complete!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700">
                Excellent work! You've provided all required government inputs. This comprehensive information helps ensure proper coordination, alignment with national priorities, and effective monitoring of development activities.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
