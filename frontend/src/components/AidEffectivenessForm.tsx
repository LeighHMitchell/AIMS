"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Eye,
  Handshake,
  Heart,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api-fetch';

// Types for form data
export interface AidEffectivenessFormData {
  // Section 1: Government Ownership & Strategic Alignment (GPEDC 1)
  implementingPartner?: string;
  formallyApprovedByGov?: boolean;
  includedInNationalPlan?: boolean;
  linkedToGovFramework?: boolean;
  indicatorsFromGov?: boolean;
  indicatorsViaGovData?: boolean;
  implementedByNationalInstitution?: boolean;
  govEntityAccountable?: boolean;
  supportsPublicSector?: boolean;
  capacityDevFromNationalPlan?: boolean;
  numOutcomeIndicators?: number;

  // Section 2: Use of Country PFM & Procurement Systems (GPEDC 5a)
  fundsViaNationalTreasury?: boolean;
  govBudgetSystem?: boolean;
  govFinReporting?: boolean;
  finReportingIntegratedPFM?: boolean;
  govAudit?: boolean;
  govProcurement?: boolean;
  govSystemWhyNot?: string;

  // Section 3: Predictability & Aid Characteristics (GPEDC 5b, 6, 10)
  annualBudgetShared?: boolean;
  forwardPlanShared?: boolean;
  multiYearFinancingAgreement?: boolean;
  tiedStatus?: string;

  // Section 4: Transparency & Timely Reporting (GPEDC 4)
  annualFinReportsPublic?: boolean;
  dataUpdatedPublicly?: boolean;
  finalEvalPlanned?: boolean;
  finalEvalDate?: string;
  evalReportPublic?: boolean;
  performanceIndicatorsReported?: boolean;

  // Section 5: Mutual Accountability (GPEDC 7)
  jointAnnualReview?: boolean;
  mutualAccountabilityFramework?: boolean;
  correctiveActionsDocumented?: boolean;

  // Section 6: Civil Society & Private Sector Engagement (GPEDC 2 & 3)
  civilSocietyConsulted?: boolean;
  csoInvolvedInImplementation?: boolean;
  coreFlexibleFundingToCSO?: boolean;
  publicPrivateDialogue?: boolean;
  privateSectorEngaged?: boolean;

  // Section 7: Gender Equality & Inclusion (GPEDC 8)
  genderObjectivesIntegrated?: boolean;
  genderBudgetAllocation?: boolean;
  genderDisaggregatedIndicators?: boolean;

  // Section 8: Contacts
  contactName?: string;
  contactOrg?: string;
  contactEmail?: string;
  contactPhone?: string;
  contacts?: Contact[];
  editingContact?: Partial<Contact> | null;

  // Section 9: Documents
  uploadedDocument?: string;
  uploadedDocumentUrl?: string;
  externalDocumentLink?: string;

  // Section 10: Remarks
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
const TOOLTIPS: Record<string, string> = {
  implementingPartner: "The organisation responsible for implementing the project at the point of delivery (GPEDC Indicator 1a).",
  formallyApprovedByGov: "Was this activity formally approved by the partner country government before implementation began?",
  includedInNationalPlan: "Is this activity included in a National Development Plan or Sector Strategy, with a document reference?",
  linkedToGovFramework: "Is this project aligned with national development results frameworks? (GPEDC Indicator 1a)",
  indicatorsFromGov: "Are the project's results indicators drawn from government sources such as national statistics or sector plans? (GPEDC Indicator 1b)",
  indicatorsViaGovData: "Is data for monitoring project results obtained through government M&E systems? (GPEDC Indicator 1b)",
  implementedByNationalInstitution: "Is this activity implemented by a national public institution?",
  govEntityAccountable: "Is a government entity contractually designated as the accountable authority for this activity?",
  supportsPublicSector: "Does this project support public sector capacity and institutions?",
  capacityDevFromNationalPlan: "Is capacity development based on a nationally identified capacity plan? (GPEDC Indicator 9)",
  numOutcomeIndicators: "How many outcome-level results indicators does this project track?",
  fundsViaNationalTreasury: "Are funds disbursed through the national treasury system?",
  govBudgetSystem: "Are disbursements made through the government's own budget execution procedures? (GPEDC Indicator 5a)",
  govFinReporting: "Does the project use the government's financial reporting system? (GPEDC Indicator 5a)",
  finReportingIntegratedPFM: "Is financial reporting integrated into national Public Financial Management systems?",
  govAudit: "Is the project subject to government audit procedures via the National Audit Institution? (GPEDC Indicator 5a)",
  govProcurement: "Does the project use national procurement law and systems? (GPEDC Indicator 5a)",
  annualBudgetShared: "Was annual disbursement information shared with government before the start of the fiscal year? (GPEDC Indicator 5b)",
  forwardPlanShared: "Has forward expenditure information been provided covering at least 3 years ahead? (GPEDC Indicator 6)",
  multiYearFinancingAgreement: "Has a multi-year financing agreement been signed for this activity?",
  tiedStatus: "Is procurement restricted to suppliers from specific countries? (GPEDC Indicator 10)",
  annualFinReportsPublic: "Are annual financial reports for this activity publicly accessible? (GPEDC Indicator 4)",
  dataUpdatedPublicly: "Is financial and results data updated publicly at least annually? (GPEDC Indicator 4)",
  finalEvalPlanned: "Is a final project evaluation planned and funded?",
  evalReportPublic: "Will the evaluation report be made publicly available once completed?",
  performanceIndicatorsReported: "Are performance indicators reported annually?",
  jointAnnualReview: "Is a joint annual review conducted with government and development partners? (GPEDC Indicator 7)",
  mutualAccountabilityFramework: "Is this activity assessed under a formal country-level mutual accountability framework? (GPEDC Indicator 7)",
  correctiveActionsDocumented: "Are corrective actions documented when targets are not met?",
  civilSocietyConsulted: "Was there formal consultation with civil society during the design phase? (GPEDC Indicator 2)",
  csoInvolvedInImplementation: "Are civil society organisations involved in implementation or governance? (GPEDC Indicator 2)",
  coreFlexibleFundingToCSO: "Is core or flexible funding provided to civil society organisations? (GPEDC Indicator 2)",
  publicPrivateDialogue: "Are structured public-private dialogue mechanisms included? (GPEDC Indicator 3)",
  privateSectorEngaged: "Are private sector actors formally engaged in governance or oversight? (GPEDC Indicator 3)",
  genderObjectivesIntegrated: "Are gender equality or inclusion objectives integrated into the activity framework? (GPEDC Indicator 8)",
  genderBudgetAllocation: "Is there a dedicated budget allocation for gender equality outcomes? (GPEDC Indicator 8)",
  genderDisaggregatedIndicators: "Are gender-disaggregated indicators included? (GPEDC Indicator 8)",
  remarks: "Additional notes or clarifications on the effectiveness data."
};

// Tied aid status options
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

// Contact card component
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
        const response = await apiFetch('/api/organizations');
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
      formData.formallyApprovedByGov !== undefined,
      formData.includedInNationalPlan !== undefined,
      formData.linkedToGovFramework !== undefined,
      formData.indicatorsFromGov !== undefined,
      formData.indicatorsViaGovData !== undefined,
      formData.implementedByNationalInstitution !== undefined,
      formData.govEntityAccountable !== undefined,
      formData.supportsPublicSector !== undefined,
      formData.capacityDevFromNationalPlan !== undefined,
      formData.fundsViaNationalTreasury !== undefined,
      formData.govBudgetSystem !== undefined,
      formData.govFinReporting !== undefined,
      formData.finReportingIntegratedPFM !== undefined,
      formData.govAudit !== undefined,
      formData.govProcurement !== undefined,
      formData.annualBudgetShared !== undefined,
      formData.forwardPlanShared !== undefined,
      formData.multiYearFinancingAgreement !== undefined,
      formData.tiedStatus,
      formData.annualFinReportsPublic !== undefined,
      formData.dataUpdatedPublicly !== undefined,
      formData.finalEvalPlanned !== undefined,
      formData.evalReportPublic !== undefined,
      formData.performanceIndicatorsReported !== undefined,
      formData.jointAnnualReview !== undefined,
      formData.mutualAccountabilityFramework !== undefined,
      formData.correctiveActionsDocumented !== undefined,
      formData.civilSocietyConsulted !== undefined,
      formData.csoInvolvedInImplementation !== undefined,
      formData.coreFlexibleFundingToCSO !== undefined,
      formData.publicPrivateDialogue !== undefined,
      formData.privateSectorEngaged !== undefined,
      formData.genderObjectivesIntegrated !== undefined,
      formData.genderBudgetAllocation !== undefined,
      formData.genderDisaggregatedIndicators !== undefined,
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

      const response = await apiFetch(`/api/activities/${general.id}/general-info`, {
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
      const b = (val?: boolean) => val === true ? 'Yes' : val === false ? 'No' : '';
      const exportData = [
        { Section: '1. Government Ownership', Field: 'Implementing Partner', Value: formData.implementingPartner || '' },
        { Section: '1. Government Ownership', Field: 'Formally Approved by Government', Value: b(formData.formallyApprovedByGov) },
        { Section: '1. Government Ownership', Field: 'Included in National Development Plan', Value: b(formData.includedInNationalPlan) },
        { Section: '1. Government Ownership', Field: 'Linked to Government Results Framework', Value: b(formData.linkedToGovFramework) },
        { Section: '1. Government Ownership', Field: 'Indicators from Government Frameworks', Value: b(formData.indicatorsFromGov) },
        { Section: '1. Government Ownership', Field: 'Monitored via Government M&E', Value: b(formData.indicatorsViaGovData) },
        { Section: '1. Government Ownership', Field: 'Implemented by National Institution', Value: b(formData.implementedByNationalInstitution) },
        { Section: '1. Government Ownership', Field: 'Gov Entity as Accountable Authority', Value: b(formData.govEntityAccountable) },
        { Section: '1. Government Ownership', Field: 'Supports Public Sector Capacity', Value: b(formData.supportsPublicSector) },
        { Section: '1. Government Ownership', Field: 'Capacity Dev from National Plan', Value: b(formData.capacityDevFromNationalPlan) },
        { Section: '1. Government Ownership', Field: 'Number of Outcome Indicators', Value: formData.numOutcomeIndicators?.toString() || '' },
        { Section: '2. Country Systems', Field: 'Funds via National Treasury', Value: b(formData.fundsViaNationalTreasury) },
        { Section: '2. Country Systems', Field: 'Government Budget Execution', Value: b(formData.govBudgetSystem) },
        { Section: '2. Country Systems', Field: 'Government Financial Reporting', Value: b(formData.govFinReporting) },
        { Section: '2. Country Systems', Field: 'Integrated into National PFM', Value: b(formData.finReportingIntegratedPFM) },
        { Section: '2. Country Systems', Field: 'Government Audit', Value: b(formData.govAudit) },
        { Section: '2. Country Systems', Field: 'National Procurement Systems', Value: b(formData.govProcurement) },
        { Section: '2. Country Systems', Field: 'Why Not Using Gov Systems', Value: formData.govSystemWhyNot || '' },
        { Section: '3. Predictability', Field: 'Annual Budget Shared', Value: b(formData.annualBudgetShared) },
        { Section: '3. Predictability', Field: 'Forward Plan Shared', Value: b(formData.forwardPlanShared) },
        { Section: '3. Predictability', Field: 'Multi-Year Financing Agreement', Value: b(formData.multiYearFinancingAgreement) },
        { Section: '3. Predictability', Field: 'Tied Status', Value: formData.tiedStatus || '' },
        { Section: '4. Transparency', Field: 'Annual Financial Reports Public', Value: b(formData.annualFinReportsPublic) },
        { Section: '4. Transparency', Field: 'Data Updated Publicly Annually', Value: b(formData.dataUpdatedPublicly) },
        { Section: '4. Transparency', Field: 'Final Evaluation Planned', Value: b(formData.finalEvalPlanned) },
        { Section: '4. Transparency', Field: 'Final Evaluation Date', Value: formData.finalEvalDate || '' },
        { Section: '4. Transparency', Field: 'Evaluation Report Public', Value: b(formData.evalReportPublic) },
        { Section: '4. Transparency', Field: 'Performance Indicators Reported', Value: b(formData.performanceIndicatorsReported) },
        { Section: '5. Mutual Accountability', Field: 'Joint Annual Review', Value: b(formData.jointAnnualReview) },
        { Section: '5. Mutual Accountability', Field: 'Mutual Accountability Framework', Value: b(formData.mutualAccountabilityFramework) },
        { Section: '5. Mutual Accountability', Field: 'Corrective Actions Documented', Value: b(formData.correctiveActionsDocumented) },
        { Section: '6. Civil Society & Private Sector', Field: 'Civil Society Consulted', Value: b(formData.civilSocietyConsulted) },
        { Section: '6. Civil Society & Private Sector', Field: 'CSOs in Implementation', Value: b(formData.csoInvolvedInImplementation) },
        { Section: '6. Civil Society & Private Sector', Field: 'Core Funding to CSOs', Value: b(formData.coreFlexibleFundingToCSO) },
        { Section: '6. Civil Society & Private Sector', Field: 'Public-Private Dialogue', Value: b(formData.publicPrivateDialogue) },
        { Section: '6. Civil Society & Private Sector', Field: 'Private Sector Engaged', Value: b(formData.privateSectorEngaged) },
        { Section: '7. Gender Equality', Field: 'Gender Objectives Integrated', Value: b(formData.genderObjectivesIntegrated) },
        { Section: '7. Gender Equality', Field: 'Gender Budget Allocation', Value: b(formData.genderBudgetAllocation) },
        { Section: '7. Gender Equality', Field: 'Gender-Disaggregated Indicators', Value: b(formData.genderDisaggregatedIndicators) },
        { Section: '10. Remarks', Field: 'Additional Notes', Value: formData.remarks || '' },
      ];

      if (formData.contacts && formData.contacts.length > 0) {
        formData.contacts.forEach((contact, index) => {
          exportData.push({
            Section: '8. Contacts',
            Field: `Contact ${index + 1}`,
            Value: `${contact.firstName} ${contact.lastName}${contact.email ? ` (${contact.email})` : ''}`
          });
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aid Effectiveness');
      ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 50 }];
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

      const { error } = await supabase.storage
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
    updateField('contactName', `${contact.firstName} ${contact.lastName}`.trim());
    updateField('contactOrg', contact.organisationId);
    updateField('contactEmail', contact.email);
  };

  // Remove contact
  const removeContact = (index: number) => {
    const newContacts = formData.contacts?.filter((_, i) => i !== index) || [];
    updateField('contacts', newContacts);
  };

  // Check if any gov system is false (for conditional text)
  const anyGovSystemNo =
    formData.fundsViaNationalTreasury === false ||
    formData.govBudgetSystem === false ||
    formData.govFinReporting === false ||
    formData.finReportingIntegratedPFM === false ||
    formData.govAudit === false ||
    formData.govProcurement === false;

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
        {/* ====== Section 1: Government Ownership & Strategic Alignment ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Government Ownership & Strategic Alignment</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 1</Badge>
          </div>

          <div className="space-y-2">
            <FieldTooltip content={TOOLTIPS.implementingPartner}>
              <Label className="text-sm font-medium text-gray-700">Implementing Partner</Label>
            </FieldTooltip>
            <OrganizationCombobox
              organizations={organizations}
              value={formData.implementingPartner}
              onValueChange={(value) => updateField('implementingPartner', value)}
              placeholder="Select implementing partner..."
              className="max-w-xl"
            />
            {user?.organizationId && formData.implementingPartner === user.organizationId && (
              <p className="text-xs text-gray-500">Pre-filled with your organization</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="formallyApprovedByGov"
              checked={formData.formallyApprovedByGov}
              onCheckedChange={(checked) => updateField('formallyApprovedByGov', checked)}
              label="Formally Approved by Government Before Implementation Began"
              tooltip={TOOLTIPS.formallyApprovedByGov}
            />
            <CheckboxField
              id="includedInNationalPlan"
              checked={formData.includedInNationalPlan}
              onCheckedChange={(checked) => updateField('includedInNationalPlan', checked)}
              label="Included in National Development Plan or Sector Strategy"
              tooltip={TOOLTIPS.includedInNationalPlan}
              description="Document reference exists"
            />
            <CheckboxField
              id="linkedToGovFramework"
              checked={formData.linkedToGovFramework}
              onCheckedChange={(checked) => updateField('linkedToGovFramework', checked)}
              label="Linked to Government Results Framework"
              tooltip={TOOLTIPS.linkedToGovFramework}
            />
            <CheckboxField
              id="indicatorsFromGov"
              checked={formData.indicatorsFromGov}
              onCheckedChange={(checked) => updateField('indicatorsFromGov', checked)}
              label="Indicators Drawn from Government Monitoring Frameworks"
              tooltip={TOOLTIPS.indicatorsFromGov}
            />
            <CheckboxField
              id="indicatorsViaGovData"
              checked={formData.indicatorsViaGovData}
              onCheckedChange={(checked) => updateField('indicatorsViaGovData', checked)}
              label="Monitored Through Government M&E Systems"
              tooltip={TOOLTIPS.indicatorsViaGovData}
            />
            <CheckboxField
              id="implementedByNationalInstitution"
              checked={formData.implementedByNationalInstitution}
              onCheckedChange={(checked) => updateField('implementedByNationalInstitution', checked)}
              label="Implemented by a National Public Institution"
              tooltip={TOOLTIPS.implementedByNationalInstitution}
            />
            <CheckboxField
              id="govEntityAccountable"
              checked={formData.govEntityAccountable}
              onCheckedChange={(checked) => updateField('govEntityAccountable', checked)}
              label="Government Entity Contractually Designated as Accountable Authority"
              tooltip={TOOLTIPS.govEntityAccountable}
            />
            <CheckboxField
              id="supportsPublicSector"
              checked={formData.supportsPublicSector}
              onCheckedChange={(checked) => updateField('supportsPublicSector', checked)}
              label="Supports Public Sector Capacity Strengthening"
              tooltip={TOOLTIPS.supportsPublicSector}
            />
            <CheckboxField
              id="capacityDevFromNationalPlan"
              checked={formData.capacityDevFromNationalPlan}
              onCheckedChange={(checked) => updateField('capacityDevFromNationalPlan', checked)}
              label="Capacity Development Based on Nationally Identified Capacity Plan"
              tooltip={TOOLTIPS.capacityDevFromNationalPlan}
              description="GPEDC Indicator 9"
            />
          </div>

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
        </div>

        {/* ====== Section 2: Use of Country PFM & Procurement Systems ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Globe className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Use of Country Public Financial & Procurement Systems</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 5a</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="fundsViaNationalTreasury"
              checked={formData.fundsViaNationalTreasury}
              onCheckedChange={(checked) => updateField('fundsViaNationalTreasury', checked)}
              label="Funds Disbursed Through National Treasury System"
              tooltip={TOOLTIPS.fundsViaNationalTreasury}
            />
            <CheckboxField
              id="govBudgetSystem"
              checked={formData.govBudgetSystem}
              onCheckedChange={(checked) => updateField('govBudgetSystem', checked)}
              label="Government Budget Execution Procedures Used"
              tooltip={TOOLTIPS.govBudgetSystem}
            />
            <CheckboxField
              id="govFinReporting"
              checked={formData.govFinReporting}
              onCheckedChange={(checked) => updateField('govFinReporting', checked)}
              label="Government Financial Reporting Systems Used"
              tooltip={TOOLTIPS.govFinReporting}
            />
            <CheckboxField
              id="finReportingIntegratedPFM"
              checked={formData.finReportingIntegratedPFM}
              onCheckedChange={(checked) => updateField('finReportingIntegratedPFM', checked)}
              label="Financial Reporting Integrated into National PFM Systems"
              tooltip={TOOLTIPS.finReportingIntegratedPFM}
            />
            <CheckboxField
              id="govAudit"
              checked={formData.govAudit}
              onCheckedChange={(checked) => updateField('govAudit', checked)}
              label="Government Audit Procedures Used (National Audit Institution)"
              tooltip={TOOLTIPS.govAudit}
            />
            <CheckboxField
              id="govProcurement"
              checked={formData.govProcurement}
              onCheckedChange={(checked) => updateField('govProcurement', checked)}
              label="National Procurement Law and Systems Used"
              tooltip={TOOLTIPS.govProcurement}
            />
          </div>

          {anyGovSystemNo && (
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

        {/* ====== Section 3: Predictability & Aid Characteristics ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Predictability & Aid Characteristics</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicators 5b, 6, 10</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="annualBudgetShared"
              checked={formData.annualBudgetShared}
              onCheckedChange={(checked) => updateField('annualBudgetShared', checked)}
              label="Annual Budget Shared with Government in Advance of Fiscal Year"
              tooltip={TOOLTIPS.annualBudgetShared}
            />
            <CheckboxField
              id="forwardPlanShared"
              checked={formData.forwardPlanShared}
              onCheckedChange={(checked) => updateField('forwardPlanShared', checked)}
              label="Three-Year Forward Expenditure Shared with Government"
              tooltip={TOOLTIPS.forwardPlanShared}
            />
            <CheckboxField
              id="multiYearFinancingAgreement"
              checked={formData.multiYearFinancingAgreement}
              onCheckedChange={(checked) => updateField('multiYearFinancingAgreement', checked)}
              label="Multi-Year Financing Agreement Signed"
              tooltip={TOOLTIPS.multiYearFinancingAgreement}
            />
          </div>

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

        {/* ====== Section 4: Transparency & Timely Reporting ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Eye className="h-5 w-5 text-cyan-600" />
            <h3 className="font-semibold text-gray-900">Transparency & Timely Reporting</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 4</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="annualFinReportsPublic"
              checked={formData.annualFinReportsPublic}
              onCheckedChange={(checked) => updateField('annualFinReportsPublic', checked)}
              label="Annual Financial Reports Publicly Accessible"
              tooltip={TOOLTIPS.annualFinReportsPublic}
            />
            <CheckboxField
              id="dataUpdatedPublicly"
              checked={formData.dataUpdatedPublicly}
              onCheckedChange={(checked) => updateField('dataUpdatedPublicly', checked)}
              label="Financial and Results Data Updated Publicly at Least Annually"
              tooltip={TOOLTIPS.dataUpdatedPublicly}
            />
            <CheckboxField
              id="finalEvalPlanned"
              checked={formData.finalEvalPlanned}
              onCheckedChange={(checked) => updateField('finalEvalPlanned', checked)}
              label="Final Evaluation Planned"
              tooltip={TOOLTIPS.finalEvalPlanned}
            />
            <CheckboxField
              id="evalReportPublic"
              checked={formData.evalReportPublic}
              onCheckedChange={(checked) => updateField('evalReportPublic', checked)}
              label="Evaluation Report Publicly Available (Once Completed)"
              tooltip={TOOLTIPS.evalReportPublic}
            />
            <CheckboxField
              id="performanceIndicatorsReported"
              checked={formData.performanceIndicatorsReported}
              onCheckedChange={(checked) => updateField('performanceIndicatorsReported', checked)}
              label="Performance Indicators Reported Annually"
              tooltip={TOOLTIPS.performanceIndicatorsReported}
            />
          </div>

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

        {/* ====== Section 5: Mutual Accountability ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Handshake className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Mutual Accountability</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 7</Badge>
          </div>

          <p className="text-xs text-gray-500 italic">
            Note: Indicator 7 is formally country-level. These questions approximate it at activity level.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="jointAnnualReview"
              checked={formData.jointAnnualReview}
              onCheckedChange={(checked) => updateField('jointAnnualReview', checked)}
              label="Joint Annual Review Conducted with Government and Development Partners"
              tooltip={TOOLTIPS.jointAnnualReview}
            />
            <CheckboxField
              id="mutualAccountabilityFramework"
              checked={formData.mutualAccountabilityFramework}
              onCheckedChange={(checked) => updateField('mutualAccountabilityFramework', checked)}
              label="Activity Assessed Under a Formal Country-Level Mutual Accountability Framework"
              tooltip={TOOLTIPS.mutualAccountabilityFramework}
            />
            <CheckboxField
              id="correctiveActionsDocumented"
              checked={formData.correctiveActionsDocumented}
              onCheckedChange={(checked) => updateField('correctiveActionsDocumented', checked)}
              label="Corrective Actions Documented When Targets Are Not Met"
              tooltip={TOOLTIPS.correctiveActionsDocumented}
            />
          </div>
        </div>

        {/* ====== Section 6: Civil Society & Private Sector Engagement ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold text-gray-900">Civil Society & Private Sector Engagement</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicators 2 & 3</Badge>
          </div>

          <p className="text-xs text-gray-500 italic">
            Note: Indicators 2 and 3 are partially systemic, but these are measurable proxies.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="civilSocietyConsulted"
              checked={formData.civilSocietyConsulted}
              onCheckedChange={(checked) => updateField('civilSocietyConsulted', checked)}
              label="Formal Consultation with Civil Society During Design Phase"
              tooltip={TOOLTIPS.civilSocietyConsulted}
            />
            <CheckboxField
              id="csoInvolvedInImplementation"
              checked={formData.csoInvolvedInImplementation}
              onCheckedChange={(checked) => updateField('csoInvolvedInImplementation', checked)}
              label="Civil Society Organisations Involved in Implementation or Governance"
              tooltip={TOOLTIPS.csoInvolvedInImplementation}
            />
            <CheckboxField
              id="coreFlexibleFundingToCSO"
              checked={formData.coreFlexibleFundingToCSO}
              onCheckedChange={(checked) => updateField('coreFlexibleFundingToCSO', checked)}
              label="Core or Flexible Funding Provided to Civil Society Organisations"
              tooltip={TOOLTIPS.coreFlexibleFundingToCSO}
            />
            <CheckboxField
              id="publicPrivateDialogue"
              checked={formData.publicPrivateDialogue}
              onCheckedChange={(checked) => updateField('publicPrivateDialogue', checked)}
              label="Structured Public-Private Dialogue Mechanisms Included"
              tooltip={TOOLTIPS.publicPrivateDialogue}
            />
            <CheckboxField
              id="privateSectorEngaged"
              checked={formData.privateSectorEngaged}
              onCheckedChange={(checked) => updateField('privateSectorEngaged', checked)}
              label="Private Sector Actors Formally Engaged in Governance or Oversight"
              tooltip={TOOLTIPS.privateSectorEngaged}
            />
          </div>
        </div>

        {/* ====== Section 7: Gender Equality & Inclusion ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Heart className="h-5 w-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Gender Equality & Inclusion</h3>
            <Badge variant="outline" className="text-xs">GPEDC Indicator 8</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CheckboxField
              id="genderObjectivesIntegrated"
              checked={formData.genderObjectivesIntegrated}
              onCheckedChange={(checked) => updateField('genderObjectivesIntegrated', checked)}
              label="Gender Equality or Inclusion Objectives Integrated into Activity Framework"
              tooltip={TOOLTIPS.genderObjectivesIntegrated}
            />
            <CheckboxField
              id="genderBudgetAllocation"
              checked={formData.genderBudgetAllocation}
              onCheckedChange={(checked) => updateField('genderBudgetAllocation', checked)}
              label="Dedicated Budget Allocation for Gender Equality Outcomes"
              tooltip={TOOLTIPS.genderBudgetAllocation}
            />
            <CheckboxField
              id="genderDisaggregatedIndicators"
              checked={formData.genderDisaggregatedIndicators}
              onCheckedChange={(checked) => updateField('genderDisaggregatedIndicators', checked)}
              label="Gender-Disaggregated Indicators Included"
              tooltip={TOOLTIPS.genderDisaggregatedIndicators}
            />
          </div>
        </div>

        {/* ====== Section 8: Contact Details ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold text-gray-900">Contacts</h3>
          </div>

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

          {formData.editingContact ? (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">First Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                    <Input
                      value={formData.editingContact.firstName || ""}
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, firstName: e.target.value })}
                      placeholder="First name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Last Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                    <Input
                      value={formData.editingContact.lastName || ""}
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, lastName: e.target.value })}
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
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, email: e.target.value })}
                      placeholder="email@example.com"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Phone</Label>
                    <Input
                      type="tel"
                      value={formData.editingContact.phone || ""}
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, phone: e.target.value })}
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
                firstName: '', lastName: '', email: '', phone: '',
                organisationId: '', organisationName: ''
              })}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>

        {/* ====== Section 9: Documents ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Supporting Documentation</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Upload Supporting Document</Label>
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

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">External Document Link</Label>
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

        {/* ====== Section 10: Remarks ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Additional Remarks</h3>
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
