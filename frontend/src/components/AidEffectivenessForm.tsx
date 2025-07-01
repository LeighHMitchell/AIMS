"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Upload, 
  Clock,
  Shield,
  Users,
  FileText,
  Calendar,
  Globe
} from "lucide-react";
import { toast } from "sonner";

// Types for form data
export interface AidEffectivenessFormData {
  // Section 1: Development Effectiveness Indicators
  implementingPartner?: string;
  linkedToGovFramework?: string;
  supportsPublicSector?: string;
  numOutcomeIndicators?: number;
  indicatorsFromGov?: string;
  indicatorsViaGovData?: string;
  finalEvalPlanned?: string;
  finalEvalDate?: string;

  // Section 2: Government Systems
  govBudgetSystem?: string;
  govFinReporting?: string;
  govAudit?: string;
  govProcurement?: string;
  govSystemWhyNot?: string;

  // Section 3: Budget Planning
  annualBudgetShared?: string;
  forwardPlanShared?: string;
  tiedStatus?: string;

  // Section 4: Contact Details
  contactName?: string;
  contactOrg?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Section 5: Documents
  uploadedDocument?: string;
  externalDocumentLink?: string;

  // Section 6: Remarks
  remarks?: string;

  // Metadata
  lastSaved?: string;
  isDraft?: boolean;
}

interface Props {
  general: any;
  onUpdate: (data: any) => void;
}

// Tooltip content configuration
const TOOLTIPS = {
  implementingPartner: "Organisation that disburses funds or support to the national implementing partner.",
  linkedToGovFramework: "Indicates whether project results are tied to a national or sectoral government strategy.",
  supportsPublicSector: "Yes if the project funds or embeds support into public institutions.",
  numOutcomeIndicators: "Total number of indicators measuring results at the outcome level.",
  indicatorsFromGov: "Yes if indicators are taken directly from national policies or planning documents.",
  indicatorsViaGovData: "Yes if results are tracked using national statistics or M&E systems.",
  finalEvalPlanned: "Yes if a post-project (ex post) evaluation is scheduled.",
  govBudgetSystem: "Uses the government's own systems to plan and disburse project funds.",
  govFinReporting: "Produces reports in accordance with national financial standards.",
  govAudit: "Subject to audit by national audit institutions.",
  govProcurement: "Procurement follows national rules, not donor/partner-specific procedures.",
  annualBudgetShared: "Indicates whether the annual budget has been communicated for integration into national planning.",
  forwardPlanShared: "Yes if a multi-year indicative budget or work plan has been shared with the national counterpart.",
  tiedStatus: "Tied aid restricts procurement to certain countries or suppliers.",
  contactName: "Person responsible for this project record.",
  contactOrg: "Affiliated organisation of the contact person.",
  contactEmail: "Valid institutional email.",
  contactPhone: "Include international dialling code, e.g., +855 23 456 789.",
  uploadedDocument: "Final or draft project documents including concept notes, logframes, or evaluations.",
  externalDocumentLink: "Optional URL linking to a publicly available version of the project document.",
  remarks: "Use for notes, explanations, or pending updates."
};

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

// Mock organizations for demo
const mockOrganizations: Organization[] = [
  { id: "1", name: "Asian Development Bank", acronym: "ADB" },
  { id: "2", name: "World Bank", acronym: "WB" },
  { id: "3", name: "United Nations Development Programme", acronym: "UNDP" },
  { id: "4", name: "Department of Foreign Affairs and Trade Australia", acronym: "DFAT" },
  { id: "5", name: "United States Agency for International Development", acronym: "USAID" },
  { id: "6", name: "European Union Delegation", acronym: "EU" },
  { id: "7", name: "Japan International Cooperation Agency", acronym: "JICA" },
  { id: "8", name: "Deutsche Gesellschaft für Internationale Zusammenarbeit", acronym: "GIZ" },
];

// Helper component for tooltips
const FieldTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          {children}
          <HelpCircle className="w-4 h-4 text-slate-500" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Helper component for radio groups with labels
const RadioGroupWithLabel: React.FC<{
  value?: string;
  onValueChange: (value: string) => void;
  name: string;
  options: { value: string; label: string }[];
}> = ({ value, onValueChange, name, options }) => (
  <RadioGroup value={value} onValueChange={onValueChange} className="flex gap-4">
    {options.map(option => (
      <div key={option.value} className="flex items-center space-x-2">
        <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
        <Label htmlFor={`${name}-${option.value}`} className="text-sm font-normal cursor-pointer">
          {option.label}
        </Label>
      </div>
    ))}
  </RadioGroup>
);

export const AidEffectivenessForm: React.FC<Props> = ({ general, onUpdate }) => {
  const [formData, setFormData] = useState<AidEffectivenessFormData>({
    isDraft: true,
    ...general.aidEffectiveness
  });
  const [activeTab, setActiveTab] = useState("output1");
  const [organizations] = useState(mockOrganizations);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autosaveRef = useRef<NodeJS.Timeout>();

  // Calculate completion percentage as derived state to avoid infinite loops
  const completionPercentage = useMemo(() => {
    const totalFields = 16;
    const completedFields = Object.values(formData).filter(value => 
      value !== undefined && value !== "" && value !== null
    ).length;
    return Math.round((completedFields / totalFields) * 100);
  }, [formData]);

  // Store current formData in ref for auto-save
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Auto-save functionality - stable reference
  const autoSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
      
      // Update parent component with current formData from ref
      onUpdate({
        ...general,
        aidEffectiveness: formDataRef.current
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Auto-save failed");
    } finally {
      setIsSaving(false);
    }
  }, [general, onUpdate]);

  // Debounced auto-save - only trigger when formData actually changes
  useEffect(() => {
    // Skip auto-save for initial empty state
    if (Object.keys(formData).length <= 1) return;
    
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
    }
    
    autosaveRef.current = setTimeout(() => {
      autoSave();
    }, 3000); // Auto-save after 3 seconds of no changes

    return () => {
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
      }
    };
  }, [formData, autoSave]); // Now autoSave is stable

  // Form update handler
  const updateField = (field: keyof AidEffectivenessFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.contactName) newErrors.contactName = "Contact name is required";
    if (!formData.contactOrg) newErrors.contactOrg = "Contact organization is required";
    if (!formData.contactEmail) newErrors.contactEmail = "Contact email is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manual save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors before saving");
      return;
    }
    
    setIsSaving(true);
    try {
      await autoSave();
      toast.success("Form saved successfully");
    } finally {
      setIsSaving(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    toast.info("PDF export functionality coming soon");
    // Implement PDF export logic here
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border max-w-6xl">
      {/* Header with GPEDC Badge and Stats */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-green-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Aid Effectiveness</h2>
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              GPEDC Compliant
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Completion</div>
              <div className="font-semibold text-sm">{completionPercentage}%</div>
            </div>
            <Progress value={completionPercentage} className="w-20" />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            This form aligns with GPEDC Indicators 5, 6, 9, and 10 for monitoring aid effectiveness.
          </p>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isSaving ? (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Saved {lastSaved}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 sticky top-0 z-10 bg-white border-b">
          <TabsTrigger value="output1" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Output 1</span>
          </TabsTrigger>
          <TabsTrigger value="output2" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span className="hidden sm:inline">Output 2</span>
          </TabsTrigger>
          <TabsTrigger value="output3" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className="hidden sm:inline">Output 3</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="remarks" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Remarks</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="p-6">
          {/* Output 1: Implementation and Results Framework */}
          <TabsContent value="output1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Output 1: Implementation and Results Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Implementing Partner */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.implementingPartner}>
                    <Label className="text-sm font-medium">Implementing / Point of Delivery Partner *</Label>
                  </FieldTooltip>
                  <Select
                    value={formData.implementingPartner}
                    onValueChange={(value) => updateField('implementingPartner', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select implementing partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name && org.acronym && org.name !== org.acronym
                            ? `${org.name} (${org.acronym})`
                            : org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Linked to Government Framework */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.linkedToGovFramework}>
                    <Label className="text-sm font-medium">Linked to Government Framework?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.linkedToGovFramework}
                    onValueChange={(value) => updateField('linkedToGovFramework', value)}
                    name="linkedToGovFramework"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Supports Public Sector */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.supportsPublicSector}>
                    <Label className="text-sm font-medium">Supports Public Sector?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.supportsPublicSector}
                    onValueChange={(value) => updateField('supportsPublicSector', value)}
                    name="supportsPublicSector"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Number of Outcome Indicators */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.numOutcomeIndicators}>
                    <Label className="text-sm font-medium">Number of Outcome Indicators</Label>
                  </FieldTooltip>
                  <Input
                    type="number"
                    min="0"
                    value={formData.numOutcomeIndicators || ""}
                    onChange={(e) => updateField('numOutcomeIndicators', parseInt(e.target.value) || 0)}
                    placeholder="Enter number of indicators"
                    className="w-32"
                  />
                </div>

                {/* Indicators from Government Plans */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.indicatorsFromGov}>
                    <Label className="text-sm font-medium">Indicators Sourced from Government Plans?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.indicatorsFromGov}
                    onValueChange={(value) => updateField('indicatorsFromGov', value)}
                    name="indicatorsFromGov"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Indicators via Government Data */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.indicatorsViaGovData}>
                    <Label className="text-sm font-medium">Indicators Monitored via Government Data?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.indicatorsViaGovData}
                    onValueChange={(value) => updateField('indicatorsViaGovData', value)}
                    name="indicatorsViaGovData"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Final Evaluation Planned */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.finalEvalPlanned}>
                    <Label className="text-sm font-medium">Final Evaluation Planned?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.finalEvalPlanned}
                    onValueChange={(value) => updateField('finalEvalPlanned', value)}
                    name="finalEvalPlanned"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                  
                  {/* Conditional Date Field */}
                  {formData.finalEvalPlanned === "yes" && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-sm font-medium">Planned Evaluation Date</Label>
                      <Input
                        type="date"
                        value={formData.finalEvalDate || ""}
                        onChange={(e) => updateField('finalEvalDate', e.target.value)}
                        className="w-48"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Output 2: Financial and Procurement Systems */}
          <TabsContent value="output2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Output 2: Financial and Procurement Systems
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Government Budget System */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.govBudgetSystem}>
                    <Label className="text-sm font-medium">Government Budget Execution System</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.govBudgetSystem}
                    onValueChange={(value) => updateField('govBudgetSystem', value)}
                    name="govBudgetSystem"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Government Financial Reporting */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.govFinReporting}>
                    <Label className="text-sm font-medium">Government Financial Reporting System</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.govFinReporting}
                    onValueChange={(value) => updateField('govFinReporting', value)}
                    name="govFinReporting"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Government Auditing */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.govAudit}>
                    <Label className="text-sm font-medium">Government Auditing System</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.govAudit}
                    onValueChange={(value) => updateField('govAudit', value)}
                    name="govAudit"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Government Procurement */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.govProcurement}>
                    <Label className="text-sm font-medium">Uses Government Procurement System</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.govProcurement}
                    onValueChange={(value) => updateField('govProcurement', value)}
                    name="govProcurement"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Conditional Why Not Field */}
                {(formData.govBudgetSystem === "no" || 
                  formData.govFinReporting === "no" || 
                  formData.govAudit === "no" || 
                  formData.govProcurement === "no") && (
                  <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Label className="text-sm font-medium">Why not using government systems? (Optional)</Label>
                    <Textarea
                      value={formData.govSystemWhyNot || ""}
                      onChange={(e) => updateField('govSystemWhyNot', e.target.value)}
                      placeholder="Please explain why government systems are not being used..."
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Output 3: Planning & Predictability */}
          <TabsContent value="output3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Output 3: Planning & Predictability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Annual Budget Shared */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.annualBudgetShared}>
                    <Label className="text-sm font-medium">Annual Budget Shared with Government?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.annualBudgetShared}
                    onValueChange={(value) => updateField('annualBudgetShared', value)}
                    name="annualBudgetShared"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Forward Plan Shared */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.forwardPlanShared}>
                    <Label className="text-sm font-medium">3-Year Forward Plan Shared?</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.forwardPlanShared}
                    onValueChange={(value) => updateField('forwardPlanShared', value)}
                    name="forwardPlanShared"
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" }
                    ]}
                  />
                </div>

                {/* Tied Status */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.tiedStatus}>
                    <Label className="text-sm font-medium">Tied Status of Resources</Label>
                  </FieldTooltip>
                  <RadioGroupWithLabel
                    value={formData.tiedStatus}
                    onValueChange={(value) => updateField('tiedStatus', value)}
                    name="tiedStatus"
                    options={[
                      { value: "fully_tied", label: "Fully Tied" },
                      { value: "partially_tied", label: "Partially Tied" },
                      { value: "untied", label: "Untied" }
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Details */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Name */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.contactName}>
                    <Label className="text-sm font-medium">Contact Name *</Label>
                  </FieldTooltip>
                  <Input
                    value={formData.contactName || ""}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    placeholder="Enter contact name"
                    className={errors.contactName ? "border-red-500" : ""}
                  />
                  {errors.contactName && (
                    <p className="text-sm text-red-500">{errors.contactName}</p>
                  )}
                </div>

                {/* Contact Organization */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.contactOrg}>
                    <Label className="text-sm font-medium">Organisation *</Label>
                  </FieldTooltip>
                  <Select
                    value={formData.contactOrg}
                    onValueChange={(value) => updateField('contactOrg', value)}
                  >
                    <SelectTrigger className={errors.contactOrg ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name && org.acronym && org.name !== org.acronym
                            ? `${org.name} (${org.acronym})`
                            : org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.contactOrg && (
                    <p className="text-sm text-red-500">{errors.contactOrg}</p>
                  )}
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.contactEmail}>
                    <Label className="text-sm font-medium">Email *</Label>
                  </FieldTooltip>
                  <Input
                    type="email"
                    value={formData.contactEmail || ""}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    placeholder="email@organization.org"
                    className={errors.contactEmail ? "border-red-500" : ""}
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-500">{errors.contactEmail}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.contactPhone}>
                    <Label className="text-sm font-medium">Phone Number</Label>
                  </FieldTooltip>
                  <Input
                    type="tel"
                    value={formData.contactPhone || ""}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    placeholder="+855 23 456 789"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  Project Document Uploads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.uploadedDocument}>
                    <Label className="text-sm font-medium">Upload PDF</Label>
                  </FieldTooltip>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop your PDF file here, or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          updateField('uploadedDocument', file.name);
                          toast.success(`File "${file.name}" selected`);
                        }
                      }}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      Choose File
                    </Button>
                    {formData.uploadedDocument && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {formData.uploadedDocument}
                      </p>
                    )}
                  </div>
                </div>

                {/* External Link */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.externalDocumentLink}>
                    <Label className="text-sm font-medium">External Document Link</Label>
                  </FieldTooltip>
                  <Input
                    type="url"
                    value={formData.externalDocumentLink || ""}
                    onChange={(e) => updateField('externalDocumentLink', e.target.value)}
                    placeholder="https://example.com/document.pdf"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Remarks */}
          <TabsContent value="remarks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Remarks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.remarks}>
                    <Label className="text-sm font-medium">Remarks/Additional Comments</Label>
                  </FieldTooltip>
                  <Textarea
                    value={formData.remarks || ""}
                    onChange={(e) => updateField('remarks', e.target.value)}
                    placeholder="Enter any additional notes, explanations, or pending updates..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Use this space for notes, explanations, or any pending updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer Actions */}
      <div className="border-t bg-gray-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={isSaving} className="min-w-24">
              {isSaving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-right">
            <div>GPEDC Indicators: 5, 6, 9, 10</div>
            <div>Form Version: 1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 