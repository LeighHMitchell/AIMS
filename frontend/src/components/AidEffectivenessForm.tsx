"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { ContactDropdown } from "@/components/activities/ContactDropdown";
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
  Globe,
  Plus,
  X
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
  contacts?: Array<{
    title: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    position: string;
    contactType: string;
    organisationId?: string;
    organisationName?: string;
    email?: string;
    secondaryEmail?: string;
    countryCode: string;
    phoneNumber: string;
    faxCountryCode: string;
    faxNumber: string;
    notes?: string;
    avatar_url?: string;
    profilePhoto?: string;
  }>;
  editingContact?: any;

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

  // Calculate completion for each tab
  const tabCompletions = useMemo(() => {
    const output1Complete = !!(
      formData.implementingPartner &&
      formData.linkedToGovFramework &&
      formData.supportsPublicSector &&
      formData.numOutcomeIndicators !== undefined &&
      formData.indicatorsFromGov &&
      formData.indicatorsViaGovData &&
      formData.finalEvalPlanned &&
      (formData.finalEvalPlanned === 'no' || formData.finalEvalDate)
    );

    const output2Complete = !!(
      formData.govBudgetSystem &&
      formData.govFinReporting &&
      formData.govAudit &&
      formData.govProcurement
    );

    const output3Complete = !!(
      formData.annualBudgetShared &&
      formData.forwardPlanShared &&
      formData.tiedStatus
    );

    const contactComplete = !!(
      (formData.contacts && formData.contacts.length > 0) ||
      (formData.contactName &&
       formData.contactOrg &&
       formData.contactEmail)
    );

    const documentsComplete = !!(
      formData.externalDocumentLink || 
      formData.uploadedDocument
    );
    
    const remarksComplete = !!(
      formData.remarks && formData.remarks.trim()
    );

    return {
      output1: output1Complete,
      output2: output2Complete,
      output3: output3Complete,
      contact: contactComplete,
      documents: documentsComplete,
      remarks: remarksComplete
    };
  }, [formData]);

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
      // Update parent component with current formData from ref
      const updatedGeneral = {
        ...general,
        aidEffectiveness: formDataRef.current
      };
      
      onUpdate(updatedGeneral);
      
      // If we have an activity ID, also save to database directly
      if (general.id) {
        const response = await fetch(`/api/activities/${general.id}/general-info`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aidEffectiveness: formDataRef.current,
            general_info: {
              aidEffectiveness: formDataRef.current
            }
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save to database');
        }
      }
      
      const now = new Date().toLocaleTimeString();
      setLastSaved(now);
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



  // Export to XLSX
  const handleExportXLSX = () => {
    toast.info("Excel export functionality coming soon");
    // Implement XLSX export logic here
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border max-w-6xl">
      {/* Header with GPEDC Badge and Stats */}
      <div className="border-b p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #FF5F6D 0%, #FF8E53 20%, #FFA502 40%, #FFD93D 60%, #FF8E53 80%, #FF5F6D 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite'
      }}>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
        
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-white drop-shadow-md" />
            <h2 className="text-2xl font-bold text-white drop-shadow-md">Aid Effectiveness</h2>
            <Badge variant="secondary" className="bg-white/90 text-orange-800 border-orange-200 shadow-md">
              GPEDC Compliant
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-white/90 drop-shadow">Completion</div>
              <div className="font-semibold text-sm text-white drop-shadow">{completionPercentage}%</div>
            </div>
            <Progress value={completionPercentage} className="w-20 bg-white/30 [&>div]:bg-orange-500" />
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-end">
          <div className="flex items-center gap-2 text-xs text-white/80 drop-shadow">
            {isSaving ? (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-white" />
                <span className="font-bold">Saved</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto sticky top-0 z-10 bg-white border-b gap-2 p-1">
          <TabsTrigger value="output1" className="flex items-center gap-1">
            <Users className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Implementation and Results</span>
            {tabCompletions.output1 && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="output2" className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Financial and Procurement Systems</span>
            {tabCompletions.output2 && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="output3" className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Planning & Predictability</span>
            {tabCompletions.output3 && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-1">
            <Users className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Contact</span>
            {tabCompletions.contact && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Docs</span>
            {tabCompletions.documents && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="remarks" className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-gray-900" />
            <span className="hidden sm:inline">Remarks</span>
            {tabCompletions.remarks && <CheckCircle className="h-3 w-3 text-green-600 ml-1" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="p-6">
          {/* Output 1: Implementation and Results Framework */}
          <TabsContent value="output1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-900" />
                  Output 1: Implementation and Results Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Implementing Partner */}
                <div className="space-y-2">
                  <FieldTooltip content={TOOLTIPS.implementingPartner}>
                    <Label className="text-sm font-medium">Implementing / Point of Delivery Partner</Label>
                  </FieldTooltip>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50" style={{ minHeight: '68px' }}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <OrganizationCombobox
                        organizations={organizations}
                        value={formData.implementingPartner}
                        onValueChange={(value) => updateField('implementingPartner', value)}
                        placeholder="Select implementing partner..."
                        className="flex-1 border-0 bg-transparent shadow-none hover:bg-transparent"
                      />
                    </div>
                  </div>
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
                  <Globe className="h-5 w-5 text-gray-900" />
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
                    <Label className="text-sm font-medium">Why not using government systems?</Label>
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
                  <Calendar className="h-5 w-5 text-gray-900" />
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
                  <Users className="h-5 w-5 text-gray-900" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Contacts List */}
                {formData.contacts && formData.contacts.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Assigned Contacts</Label>
                    <div className="space-y-2">
                      {formData.contacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              {(contact.avatar_url || contact.profilePhoto) ? (
                                <img
                                  src={contact.avatar_url || contact.profilePhoto}
                                  alt={`${contact.firstName} ${contact.lastName}`}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <Users className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {contact.title} {contact.firstName} {contact.middleName} {contact.lastName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {contact.position} • {contact.organisationName || 'No organization'}
                              </div>
                              {contact.email && (
                                <div className="text-xs text-gray-600">
                                  {contact.email}
                                </div>
                              )}
                              {contact.phoneNumber && (
                                <div className="text-xs text-gray-600">
                                  {contact.countryCode} {contact.phoneNumber}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newContacts = formData.contacts?.filter((_, i) => i !== index) || [];
                              updateField('contacts', newContacts);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add/Edit Contact Form */}
                {(!formData.editingContact && (!formData.contacts || formData.contacts.length === 0)) && (
                  <ContactDropdown
                    existingContacts={formData.contacts || []}
                    onSelectContact={(contact) => {
                      const newContacts = [...(formData.contacts || []), contact];
                      updateField('contacts', newContacts);
                      
                      // Update the legacy fields for backward compatibility
                      updateField('contactName', `${contact.title || ''} ${contact.firstName} ${contact.middleName || ''} ${contact.lastName}`.trim());
                      updateField('contactOrg', contact.organisationId);
                      updateField('contactEmail', contact.email);
                      updateField('contactPhone', contact.phone || `${contact.countryCode || ''} ${contact.phoneNumber || ''}`.trim());
                    }}
                    onCreateNew={() => updateField('editingContact', {
                      title: "Mr.",
                      firstName: "",
                      middleName: "",
                      lastName: "",
                      position: "",
                      contactType: "1",
                      email: "",
                      secondaryEmail: "",
                      countryCode: "+95",
                      phoneNumber: "",
                      faxCountryCode: "+95",
                      faxNumber: "",
                      notes: "",
                      avatar_url: "",
                      profilePhoto: ""
                    })}
                    placeholder="Select existing contact or create new..."
                    className="w-full"
                  />
                )}

                {formData.editingContact && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div className="font-medium text-sm mb-4">Add New Contact</div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      {/* Title */}
                      <div className="space-y-2">
                        <Label className="text-sm">Title</Label>
                        <Select
                          value={formData.editingContact.title}
                          onValueChange={(value) => updateField('editingContact', {...formData.editingContact, title: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Title" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Eng.", "Daw", "U"].map(title => (
                              <SelectItem key={title} value={title}>{title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* First Name */}
                      <div className="space-y-2">
                        <Label className="text-sm">First Name</Label>
                        <Input
                          value={formData.editingContact.firstName || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, firstName: e.target.value})}
                          placeholder="First name"
                        />
                      </div>

                      {/* Middle Name */}
                      <div className="space-y-2">
                        <Label className="text-sm">Middle Name</Label>
                        <Input
                          value={formData.editingContact.middleName || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, middleName: e.target.value})}
                          placeholder="Middle name"
                        />
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2">
                        <Label className="text-sm">Last Name</Label>
                        <Input
                          value={formData.editingContact.lastName || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, lastName: e.target.value})}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Position/Role */}
                      <div className="space-y-2">
                        <Label className="text-sm">Position/Role</Label>
                        <Input
                          value={formData.editingContact.position || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, position: e.target.value})}
                          placeholder="Position or role"
                        />
                      </div>

                      {/* Contact Type */}
                      <div className="space-y-2">
                        <Label className="text-sm">Contact Type</Label>
                        <Select
                          value={formData.editingContact.contactType}
                          onValueChange={(value) => updateField('editingContact', {...formData.editingContact, contactType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">General Enquiries</SelectItem>
                            <SelectItem value="2">Project Manager</SelectItem>
                            <SelectItem value="3">Financial Officer</SelectItem>
                            <SelectItem value="4">M&E Officer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Organisation */}
                    <div className="space-y-2">
                      <Label className="text-sm">Organisation</Label>
                      <OrganizationCombobox
                        organizations={organizations}
                        value={formData.editingContact.organisationId}
                        onValueChange={(value) => {
                          const org = organizations.find(o => o.id === value);
                          updateField('editingContact', {
                            ...formData.editingContact, 
                            organisationId: value,
                            organisationName: org?.name || ''
                          });
                        }}
                        placeholder="Select organization..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Primary Email */}
                      <div className="space-y-2">
                        <Label className="text-sm">Primary Email</Label>
                        <Input
                          type="email"
                          value={formData.editingContact.email || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, email: e.target.value})}
                          placeholder="primary@example.com"
                        />
                      </div>

                      {/* Secondary Email */}
                      <div className="space-y-2">
                        <Label className="text-sm">Secondary Email</Label>
                        <Input
                          type="email"
                          value={formData.editingContact.secondaryEmail || ""}
                          onChange={(e) => updateField('editingContact', {...formData.editingContact, secondaryEmail: e.target.value})}
                          placeholder="secondary@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Phone Number */}
                      <div className="space-y-2">
                        <Label className="text-sm">Phone Number</Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.editingContact.countryCode}
                            onValueChange={(value) => updateField('editingContact', {...formData.editingContact, countryCode: value})}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+95">+95</SelectItem>
                              <SelectItem value="+1">+1</SelectItem>
                              <SelectItem value="+44">+44</SelectItem>
                              <SelectItem value="+81">+81</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="tel"
                            value={formData.editingContact.phoneNumber || ""}
                            onChange={(e) => updateField('editingContact', {...formData.editingContact, phoneNumber: e.target.value})}
                            placeholder="Phone number"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Fax Number */}
                      <div className="space-y-2">
                        <Label className="text-sm">Fax Number</Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.editingContact.faxCountryCode}
                            onValueChange={(value) => updateField('editingContact', {...formData.editingContact, faxCountryCode: value})}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+95">+95</SelectItem>
                              <SelectItem value="+1">+1</SelectItem>
                              <SelectItem value="+44">+44</SelectItem>
                              <SelectItem value="+81">+81</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="tel"
                            value={formData.editingContact.faxNumber || ""}
                            onChange={(e) => updateField('editingContact', {...formData.editingContact, faxNumber: e.target.value})}
                            placeholder="Fax number"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm">Notes</Label>
                      <Textarea
                        value={formData.editingContact.notes || ""}
                        onChange={(e) => updateField('editingContact', {...formData.editingContact, notes: e.target.value})}
                        placeholder="Additional notes about this contact..."
                        rows={3}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateField('editingContact', null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const contact = formData.editingContact;
                          if (contact.firstName && contact.lastName) {
                            const newContacts = [...(formData.contacts || []), contact];
                            updateField('contacts', newContacts);
                            updateField('editingContact', null);
                            
                            // Update the legacy fields for backward compatibility
                            updateField('contactName', `${contact.title} ${contact.firstName} ${contact.middleName} ${contact.lastName}`.trim());
                            updateField('contactOrg', contact.organisationId);
                            updateField('contactEmail', contact.email);
                            updateField('contactPhone', `${contact.countryCode} ${contact.phoneNumber}`.trim());
                          }
                        }}
                        disabled={!formData.editingContact.firstName || !formData.editingContact.lastName}
                      >
                        Add Contact
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Another Contact Button */}
                {formData.contacts && formData.contacts.length > 0 && !formData.editingContact && (
                  <ContactDropdown
                    existingContacts={formData.contacts || []}
                    onSelectContact={(contact) => {
                      const newContacts = [...(formData.contacts || []), contact];
                      updateField('contacts', newContacts);
                      
                      // Update the legacy fields for backward compatibility
                      updateField('contactName', `${contact.title || ''} ${contact.firstName} ${contact.middleName || ''} ${contact.lastName}`.trim());
                      updateField('contactOrg', contact.organisationId);
                      updateField('contactEmail', contact.email);
                      updateField('contactPhone', contact.phone || `${contact.countryCode || ''} ${contact.phoneNumber || ''}`.trim());
                    }}
                    onCreateNew={() => updateField('editingContact', {
                      title: "Mr.",
                      firstName: "",
                      middleName: "",
                      lastName: "",
                      position: "",
                      contactType: "1",
                      email: "",
                      secondaryEmail: "",
                      countryCode: "+95",
                      phoneNumber: "",
                      faxCountryCode: "+95",
                      faxNumber: "",
                      notes: "",
                      avatar_url: "",
                      profilePhoto: ""
                    })}
                    placeholder="Select existing contact or add another..."
                    className="w-full"
                  />
                )}
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
      <div className="border-t p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #FF5F6D 0%, #FF8E53 20%, #FFA502 40%, #FFD93D 60%, #FF8E53 80%, #FF5F6D 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite'
      }}>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
        
        <div className="relative z-10 flex items-center justify-end">
          <Button variant="outline" onClick={handleExportXLSX}>
            <Download className="h-4 w-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>
    </div>
  );
}; 