"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  HelpCircle,
  CheckCircle,
  Download,
  Upload,
  Clock,
  Shield,
  Users,
  FileText,
  Calendar,
  Globe,
  X,
  Mail,
  Phone,
  Building2,
  Link2,
  Trash2,
  Plus,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';

// Types for form data
export interface AidEffectivenessFormData {
  // Section 1: Development Effectiveness Indicators
  implementingPartner?: string;
  linkedToGovFramework?: boolean;
  supportsPublicSector?: boolean;
  numOutcomeIndicators?: number;
  indicatorsFromGov?: boolean;
  indicatorsViaGovData?: boolean;
  finalEvalPlanned?: boolean;
  finalEvalDate?: string;

  // Section 2: Government Systems
  govBudgetSystem?: boolean;
  govFinReporting?: boolean;
  govAudit?: boolean;
  govProcurement?: boolean;
  govSystemWhyNot?: string;

  // Section 3: Budget Planning
  annualBudgetShared?: boolean;
  forwardPlanShared?: boolean;
  tiedStatus?: string;

  // Section 4: Contact Details
  contactName?: string;
  contactOrg?: string;
  contactEmail?: string;
  contactPhone?: string;
  contacts?: Contact[];
  editingContact?: Partial<Contact> | null;

  // Section 5: Documents
  uploadedDocument?: string;
  uploadedDocumentUrl?: string;
  externalDocumentLink?: string;

  // Section 6: Remarks
  remarks?: string;

  // Metadata
  lastSaved?: string;
  isDraft?: boolean;
}

interface Contact {
  id?: string;
  title?: string;
  firstName: string;
  lastName: string;
  position?: string;
  contactType?: string;
  organisationId?: string;
  organisationName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  notes?: string;
  avatar_url?: string;
  profilePhoto?: string;
}

interface Props {
  general: any;
  onUpdate: (data: any) => void;
}

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

// GPEDC-aligned tooltips
const TOOLTIPS = {
  implementingPartner: "The organisation responsible for implementing the project at the point of delivery (GPEDC Indicator 1a).",
  linkedToGovFramework: "Is this project aligned with national development results frameworks? (GPEDC Indicator 1a)",
  supportsPublicSector: "Does this project support public sector capacity and institutions?",
  numOutcomeIndicators: "How many outcome-level results indicators does this project track?",
  indicatorsFromGov: "Are the project's results indicators drawn from government sources such as national statistics or sector plans? (GPEDC Indicator 1b)",
  indicatorsViaGovData: "Is data for monitoring project results obtained through government M&E systems? (GPEDC Indicator 1b)",
  finalEvalPlanned: "Is a final project evaluation planned and funded?",
  govBudgetSystem: "Are disbursements made through the government's own budget execution procedures? (GPEDC Indicator 5a)",
  govFinReporting: "Does the project use the government's financial reporting system? (GPEDC Indicator 5a)",
  govAudit: "Is the project subject to government audit procedures? (GPEDC Indicator 5a)",
  govProcurement: "Does the project use national procurement systems? (GPEDC Indicator 5a)",
  annualBudgetShared: "Was annual disbursement information shared with government before the start of the fiscal year? (GPEDC Indicator 5b)",
  forwardPlanShared: "Has forward expenditure information been provided covering at least 3 years ahead? (GPEDC Indicator 6)",
  tiedStatus: "Is procurement restricted to suppliers from specific countries? (GPEDC Indicator 10)",
  contactName: "Primary contact responsible for this effectiveness data.",
  uploadedDocument: "Upload supporting documentation such as project documents, M&E frameworks, or evaluation reports.",
  externalDocumentLink: "Link to publicly available project documentation.",
  remarks: "Additional notes or clarifications on the effectiveness data."
};

// GPEDC tied aid status options
const TIED_STATUS_OPTIONS = [
  { value: "untied", label: "Untied", description: "No restrictions on procurement country" },
  { value: "partially_tied", label: "Partially Tied", description: "Some procurement restrictions apply" },
  { value: "tied", label: "Tied", description: "Procurement restricted to donor country" },
];

// Helper component for tooltips
const FieldTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          {children}
          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Checkbox field with label
const CheckboxField: React.FC<{
  id: string;
  checked?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  tooltip?: string;
  description?: string;
}> = ({ id, checked, onCheckedChange, label, tooltip, description }) => (
  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
    <Checkbox
      id={id}
      checked={checked ?? false}
      onCheckedChange={onCheckedChange}
      className="mt-0.5"
    />
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer leading-tight">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  </div>
);

// Contact card component (styled like ActivityContactsTab)
const ContactCard: React.FC<{
  contact: Contact;
  onRemove: () => void;
}> = ({ contact, onRemove }) => {
  const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim();
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {contact.avatar_url || contact.profilePhoto ? (
            <AvatarImage src={contact.avatar_url || contact.profilePhoto} alt={fullName} />
          ) : null}
          <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm truncate">{fullName}</h4>
          {contact.position && (
            <p className="text-xs text-slate-600 truncate">{contact.position}</p>
          )}
          {contact.organisationName && (
            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {contact.organisationName}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-1.5">
        {contact.email && (
          <div className="flex items-center gap-2 text-xs">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <a href={`mailto:${contact.email}`} className="text-slate-700 hover:text-blue-600 truncate">
              {contact.email}
            </a>
          </div>
        )}
        {(contact.phone || contact.phoneNumber) && (
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-700">
              {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AidEffectivenessForm: React.FC<Props> = ({ general, onUpdate }) => {
  const { user } = useUser();

  const [formData, setFormData] = useState<AidEffectivenessFormData>({
    isDraft: true,
    ...general.aidEffectiveness
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const formDataRef = useRef(formData);
  const autosaveRef = useRef<NodeJS.Timeout>();

  // Keep ref updated
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setOrganizations(data);
          }
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
    fetchOrganizations();
  }, []);

  // Pre-fill implementing partner with user's reporting org
  useEffect(() => {
    if (user?.organizationId && !formData.implementingPartner) {
      setFormData(prev => ({
        ...prev,
        implementingPartner: user.organizationId
      }));
    }
  }, [user?.organizationId]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const fields = [
      formData.implementingPartner,
      formData.linkedToGovFramework !== undefined,
      formData.supportsPublicSector !== undefined,
      formData.govBudgetSystem !== undefined,
      formData.govFinReporting !== undefined,
      formData.govAudit !== undefined,
      formData.govProcurement !== undefined,
      formData.annualBudgetShared !== undefined,
      formData.forwardPlanShared !== undefined,
      formData.tiedStatus,
      formData.contacts && formData.contacts.length > 0
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  // Autosave logic
  const autoSave = useCallback(async () => {
    if (!general.id) return;

    setIsSaving(true);
    try {
      const updatedGeneral = {
        ...general,
        aidEffectiveness: formDataRef.current
      };
      onUpdate(updatedGeneral);

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

      if (response.ok) {
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        toast.error("Failed to save changes");
      }
    } catch (error) {
      console.error('Autosave error:', error);
      toast.error("Error saving changes");
    } finally {
      setIsSaving(false);
    }
  }, [general, onUpdate]);

  // Debounced update
  const updateField = <K extends keyof AidEffectivenessFormData>(
    field: K,
    value: AidEffectivenessFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
    }
    autosaveRef.current = setTimeout(autoSave, 2000);
  };

  // Export form data to XLSX
  const handleExportXLSX = () => {
    try {
      // Prepare data for export
      const exportData = [
        // Development Effectiveness section
        { Section: 'Development Effectiveness', Field: 'Implementing Partner', Value: formData.implementingPartner || '' },
        { Section: 'Development Effectiveness', Field: 'Linked to Government Framework', Value: formData.linkedToGovFramework ? 'Yes' : 'No' },
        { Section: 'Development Effectiveness', Field: 'Supports Public Sector', Value: formData.supportsPublicSector ? 'Yes' : 'No' },
        { Section: 'Development Effectiveness', Field: 'Number of Outcome Indicators', Value: formData.numOutcomeIndicators?.toString() || '' },
        { Section: 'Development Effectiveness', Field: 'Indicators from Government', Value: formData.indicatorsFromGov ? 'Yes' : 'No' },
        { Section: 'Development Effectiveness', Field: 'Indicators via Government Data', Value: formData.indicatorsViaGovData ? 'Yes' : 'No' },
        { Section: 'Development Effectiveness', Field: 'Final Evaluation Planned', Value: formData.finalEvalPlanned ? 'Yes' : 'No' },
        { Section: 'Development Effectiveness', Field: 'Final Evaluation Date', Value: formData.finalEvalDate || '' },
        // Government Systems section
        { Section: 'Government Systems', Field: 'Government Budget System', Value: formData.govBudgetSystem ? 'Yes' : 'No' },
        { Section: 'Government Systems', Field: 'Government Financial Reporting', Value: formData.govFinReporting ? 'Yes' : 'No' },
        { Section: 'Government Systems', Field: 'Government Audit', Value: formData.govAudit ? 'Yes' : 'No' },
        { Section: 'Government Systems', Field: 'Government Procurement', Value: formData.govProcurement ? 'Yes' : 'No' },
        { Section: 'Government Systems', Field: 'Why Not Using Gov Systems', Value: formData.govSystemWhyNot || '' },
        // Budget Planning section
        { Section: 'Budget Planning', Field: 'Annual Budget Shared', Value: formData.annualBudgetShared ? 'Yes' : 'No' },
        { Section: 'Budget Planning', Field: 'Forward Plan Shared', Value: formData.forwardPlanShared ? 'Yes' : 'No' },
        { Section: 'Budget Planning', Field: 'Tied Status', Value: formData.tiedStatus || '' },
        // Remarks section
        { Section: 'Remarks', Field: 'Additional Notes', Value: formData.remarks || '' },
      ];

      // Add contacts if any
      if (formData.contacts && formData.contacts.length > 0) {
        formData.contacts.forEach((contact, index) => {
          exportData.push({
            Section: 'Contacts',
            Field: `Contact ${index + 1}`,
            Value: `${contact.firstName} ${contact.lastName}${contact.email ? ` (${contact.email})` : ''}`
          });
        });
      }

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aid Effectiveness');

      // Set column widths
      ws['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 50 }];

      // Download file
      XLSX.writeFile(wb, `aid-effectiveness-${general.iati_id || general.id}.xlsx`);
      toast.success('Aid effectiveness data exported successfully');
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      toast.error('Failed to export data');
    }
  };

  // Handle document upload to Supabase
  const handleDocumentUpload = async (file: File) => {
    if (!general.id) {
      toast.error("Please save the activity first");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${general.id}_effectiveness_${Date.now()}.${fileExt}`;
      const filePath = `activities/${general.id}/effectiveness/${fileName}`;

      const { data, error } = await supabase.storage
        .from('activity-documents')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('activity-documents')
        .getPublicUrl(filePath);

      updateField('uploadedDocument', file.name);
      updateField('uploadedDocumentUrl', publicUrl);
      toast.success(`Document "${file.name}" uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  // Add contact
  const addContact = (contact: Contact) => {
    const newContacts = [...(formData.contacts || []), contact];
    updateField('contacts', newContacts);
    updateField('editingContact', null);

    // Update legacy fields
    updateField('contactName', `${contact.firstName} ${contact.lastName}`.trim());
    updateField('contactOrg', contact.organisationId);
    updateField('contactEmail', contact.email);
  };

  // Remove contact
  const removeContact = (index: number) => {
    const newContacts = formData.contacts?.filter((_, i) => i !== index) || [];
    updateField('contacts', newContacts);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Aid Effectiveness</h2>
              <p className="text-xs text-gray-500">GPEDC Monitoring Framework</p>
            </div>
            <Badge variant="outline" className="bg-white text-orange-700 border-orange-200 text-xs">
              GPEDC Compliant
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Progress value={completionPercentage} className="w-24 h-2" />
              <span className="text-sm font-medium text-gray-600">{completionPercentage}%</span>
            </div>
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Saved</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Section 1: Results Framework */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Results Framework Alignment</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 1</Badge>
          </div>

          {/* Implementing Partner */}
          <div className="space-y-2">
            <FieldTooltip content={TOOLTIPS.implementingPartner}>
              <Label className="text-sm font-medium text-gray-700">Implementing Partner</Label>
            </FieldTooltip>
            <OrganizationCombobox
              organizations={organizations}
              value={formData.implementingPartner}
              onValueChange={(value) => updateField('implementingPartner', value)}
              placeholder="Select implementing partner..."
              className="max-w-md"
            />
            {user?.organizationId && formData.implementingPartner === user.organizationId && (
              <p className="text-xs text-gray-500">Pre-filled with your organization</p>
            )}
          </div>

          {/* Checkbox questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="linkedToGovFramework"
              checked={formData.linkedToGovFramework}
              onCheckedChange={(checked) => updateField('linkedToGovFramework', checked)}
              label="Linked to Government Results Framework"
              tooltip={TOOLTIPS.linkedToGovFramework}
              description="Project results align with national/sector plans"
            />

            <CheckboxField
              id="supportsPublicSector"
              checked={formData.supportsPublicSector}
              onCheckedChange={(checked) => updateField('supportsPublicSector', checked)}
              label="Supports Public Sector Capacity"
              tooltip={TOOLTIPS.supportsPublicSector}
              description="Strengthens government institutions"
            />

            <CheckboxField
              id="indicatorsFromGov"
              checked={formData.indicatorsFromGov}
              onCheckedChange={(checked) => updateField('indicatorsFromGov', checked)}
              label="Indicators from Government Sources"
              tooltip={TOOLTIPS.indicatorsFromGov}
              description="Uses national statistics or sector plans"
            />

            <CheckboxField
              id="indicatorsViaGovData"
              checked={formData.indicatorsViaGovData}
              onCheckedChange={(checked) => updateField('indicatorsViaGovData', checked)}
              label="Monitored via Government M&E Systems"
              tooltip={TOOLTIPS.indicatorsViaGovData}
              description="Data collected through national systems"
            />
          </div>

          {/* Number of indicators */}
          <div className="space-y-2 max-w-xs">
            <FieldTooltip content={TOOLTIPS.numOutcomeIndicators}>
              <Label className="text-sm font-medium text-gray-700">Number of Outcome Indicators</Label>
            </FieldTooltip>
            <Input
              type="number"
              min="0"
              value={formData.numOutcomeIndicators || ""}
              onChange={(e) => updateField('numOutcomeIndicators', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-28"
            />
          </div>

          {/* Final evaluation */}
          <div className="space-y-3">
            <CheckboxField
              id="finalEvalPlanned"
              checked={formData.finalEvalPlanned}
              onCheckedChange={(checked) => updateField('finalEvalPlanned', checked)}
              label="Final Evaluation Planned"
              tooltip={TOOLTIPS.finalEvalPlanned}
              description="Post-project evaluation is scheduled and funded"
            />
            {formData.finalEvalPlanned && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm text-gray-600">Planned Evaluation Date</Label>
                <Input
                  type="date"
                  value={formData.finalEvalDate || ""}
                  onChange={(e) => updateField('finalEvalDate', e.target.value)}
                  className="w-44"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Use of Country Systems */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Globe className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Use of Country Systems</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 5a</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="govBudgetSystem"
              checked={formData.govBudgetSystem}
              onCheckedChange={(checked) => updateField('govBudgetSystem', checked)}
              label="Government Budget Execution"
              tooltip={TOOLTIPS.govBudgetSystem}
              description="Uses national budget execution procedures"
            />

            <CheckboxField
              id="govFinReporting"
              checked={formData.govFinReporting}
              onCheckedChange={(checked) => updateField('govFinReporting', checked)}
              label="Government Financial Reporting"
              tooltip={TOOLTIPS.govFinReporting}
              description="Reports through national financial systems"
            />

            <CheckboxField
              id="govAudit"
              checked={formData.govAudit}
              onCheckedChange={(checked) => updateField('govAudit', checked)}
              label="Government Audit Procedures"
              tooltip={TOOLTIPS.govAudit}
              description="Subject to national audit requirements"
            />

            <CheckboxField
              id="govProcurement"
              checked={formData.govProcurement}
              onCheckedChange={(checked) => updateField('govProcurement', checked)}
              label="National Procurement Systems"
              tooltip={TOOLTIPS.govProcurement}
              description="Uses country procurement procedures"
            />
          </div>

          {/* Conditional explanation */}
          {(formData.govBudgetSystem === false ||
            formData.govFinReporting === false ||
            formData.govAudit === false ||
            formData.govProcurement === false) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <Label className="text-sm font-medium text-amber-800">
                Please explain why government systems are not being used
              </Label>
              <Textarea
                value={formData.govSystemWhyNot || ""}
                onChange={(e) => updateField('govSystemWhyNot', e.target.value)}
                placeholder="E.g., capacity constraints, donor requirements, legal restrictions..."
                rows={3}
                className="bg-white"
              />
            </div>
          )}
        </div>

        {/* Section 3: Aid Predictability */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Aid Predictability</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicators 5b, 6, 10</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="annualBudgetShared"
              checked={formData.annualBudgetShared}
              onCheckedChange={(checked) => updateField('annualBudgetShared', checked)}
              label="Annual Budget Shared with Government"
              tooltip={TOOLTIPS.annualBudgetShared}
              description="Disbursement info provided before fiscal year"
            />

            <CheckboxField
              id="forwardPlanShared"
              checked={formData.forwardPlanShared}
              onCheckedChange={(checked) => updateField('forwardPlanShared', checked)}
              label="3-Year Forward Expenditure Shared"
              tooltip={TOOLTIPS.forwardPlanShared}
              description="Multi-year spending plans provided"
            />
          </div>

          {/* Tied Status Dropdown */}
          <div className="space-y-2 max-w-md">
            <FieldTooltip content={TOOLTIPS.tiedStatus}>
              <Label className="text-sm font-medium text-gray-700">Tied Aid Status</Label>
            </FieldTooltip>
            <Select
              value={formData.tiedStatus || ""}
              onValueChange={(value) => updateField('tiedStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tied status..." />
              </SelectTrigger>
              <SelectContent>
                {TIED_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 4: Contact Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold text-gray-900">Contact Details</h3>
          </div>

          {/* Contact cards grid */}
          {formData.contacts && formData.contacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.contacts.map((contact, index) => (
                <ContactCard
                  key={index}
                  contact={contact}
                  onRemove={() => removeContact(index)}
                />
              ))}
            </div>
          )}

          {/* Add contact form */}
          {formData.editingContact ? (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">First Name *</Label>
                    <Input
                      value={formData.editingContact.firstName || ""}
                      onChange={(e) => updateField('editingContact', {
                        ...formData.editingContact,
                        firstName: e.target.value
                      })}
                      placeholder="First name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Last Name *</Label>
                    <Input
                      value={formData.editingContact.lastName || ""}
                      onChange={(e) => updateField('editingContact', {
                        ...formData.editingContact,
                        lastName: e.target.value
                      })}
                      placeholder="Last name"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Email</Label>
                    <Input
                      type="email"
                      value={formData.editingContact.email || ""}
                      onChange={(e) => updateField('editingContact', {
                        ...formData.editingContact,
                        email: e.target.value
                      })}
                      placeholder="email@example.com"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Phone</Label>
                    <Input
                      type="tel"
                      value={formData.editingContact.phone || ""}
                      onChange={(e) => updateField('editingContact', {
                        ...formData.editingContact,
                        phone: e.target.value
                      })}
                      placeholder="+1 234 567 890"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Organisation</Label>
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
                    placeholder="Select organisation..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => updateField('editingContact', null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (formData.editingContact?.firstName && formData.editingContact?.lastName) {
                        addContact(formData.editingContact as Contact);
                      }
                    }}
                    disabled={!formData.editingContact?.firstName || !formData.editingContact?.lastName}
                  >
                    Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => updateField('editingContact', {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                organisationId: '',
                organisationName: ''
              })}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>

        {/* Section 5: Documents */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Supporting Documents</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div className="space-y-2">
              <FieldTooltip content={TOOLTIPS.uploadedDocument}>
                <Label className="text-sm font-medium text-gray-700">Upload Document</Label>
              </FieldTooltip>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition-colors">
                {formData.uploadedDocument ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{formData.uploadedDocument}</span>
                    </div>
                    {formData.uploadedDocumentUrl && (
                      <a
                        href={formData.uploadedDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateField('uploadedDocument', undefined);
                        updateField('uploadedDocumentUrl', undefined);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentUpload(file);
                      }}
                      className="hidden"
                      id="doc-upload"
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('doc-upload')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">PDF, Word, or Excel (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            {/* External Link */}
            <div className="space-y-2">
              <FieldTooltip content={TOOLTIPS.externalDocumentLink}>
                <Label className="text-sm font-medium text-gray-700">External Document Link</Label>
              </FieldTooltip>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <Input
                  type="url"
                  value={formData.externalDocumentLink || ""}
                  onChange={(e) => updateField('externalDocumentLink', e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Remarks */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Remarks</h3>
          </div>

          <div className="space-y-2">
            <FieldTooltip content={TOOLTIPS.remarks}>
              <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
            </FieldTooltip>
            <Textarea
              value={formData.remarks || ""}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="Any additional notes, clarifications, or context..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Data is automatically saved as you make changes
        </p>
        <Button variant="outline" size="sm" onClick={handleExportXLSX}>
          <Download className="h-4 w-4 mr-2" />
          Export XLSX
        </Button>
      </div>
    </div>
  );
};
