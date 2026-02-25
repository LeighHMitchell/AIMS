"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
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
  MessageSquare,
  Paperclip,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api-fetch';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface AidEffectivenessFormData {
  // Section 1: Government Ownership & Strategic Alignment (GPEDC 1)
  implementingPartner?: string;
  formallyApprovedByGov?: string | null;
  includedInNationalPlan?: string | null;
  linkedToGovFramework?: string | null;
  indicatorsFromGov?: string | null;
  indicatorsViaGovData?: string | null;
  implementedByNationalInstitution?: string | null;
  govEntityAccountable?: string | null;
  supportsPublicSector?: string | null;
  capacityDevFromNationalPlan?: string | null;
  numOutcomeIndicators?: number;

  // Section 2: Use of Country PFM & Procurement Systems (GPEDC 5a)
  fundsViaNationalTreasury?: string | null;
  govBudgetSystem?: string | null;
  govFinReporting?: string | null;
  finReportingIntegratedPFM?: string | null;
  govAudit?: string | null;
  govProcurement?: string | null;
  govSystemWhyNot?: string;

  // Section 3: Predictability & Aid Characteristics (GPEDC 5b, 6, 10)
  annualBudgetShared?: string | null;
  forwardPlanShared?: string | null;
  multiYearFinancingAgreement?: string | null;
  tiedStatus?: string;

  // Section 4: Transparency & Timely Reporting (GPEDC 4)
  annualFinReportsPublic?: string | null;
  dataUpdatedPublicly?: string | null;
  finalEvalPlanned?: string | null;
  finalEvalDate?: string;
  evalReportPublic?: string | null;
  performanceIndicatorsReported?: string | null;

  // Section 5: Mutual Accountability (GPEDC 7)
  jointAnnualReview?: string | null;
  mutualAccountabilityFramework?: string | null;
  correctiveActionsDocumented?: string | null;

  // Section 6: Civil Society & Private Sector Engagement (GPEDC 2 & 3)
  civilSocietyConsulted?: string | null;
  csoInvolvedInImplementation?: string | null;
  coreFlexibleFundingToCSO?: string | null;
  publicPrivateDialogue?: string | null;
  privateSectorEngaged?: string | null;

  // Section 7: Gender Equality & Inclusion (GPEDC 8)
  genderObjectivesIntegrated?: string | null;
  genderBudgetAllocation?: string | null;
  genderDisaggregatedIndicators?: string | null;

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

  // Per-field evidence documents
  documents?: Record<string, { fileName: string; fileUrl: string; uploadedAt: string } | null>;

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

interface AEOption {
  id: string;
  category: string;
  label: string;
  description?: string;
  acronym?: string | null;
  start_date?: string | null;
  start_date_precision?: "year" | "month" | "day" | null;
  end_date?: string | null;
  end_date_precision?: "year" | "month" | "day" | null;
  sort_order: number;
  is_active: boolean;
  responsible_ministries?: { id: string; code: string; name: string }[];
}

function formatAEDate(date?: string | null, precision?: "year" | "month" | "day" | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (precision === "year") return d.getFullYear().toString();
  if (precision === "month") {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

// Multi-option dropdown fields (hardcoded options)
const MULTI_OPTION_FIELDS: Record<string, { label: string; description?: string }[]> = {
  civilSocietyConsulted: [
    { label: "Formal structured", description: "Formal structured consultation process" },
    { label: "Informal", description: "Informal consultation" },
    { label: "Information sharing only", description: "One-way information sharing" },
    { label: "Not consulted", description: "No consultation with civil society" },
  ],
  csoInvolvedInImplementation: [
    { label: "Lead implementer", description: "CSO is the lead implementing partner" },
    { label: "Co-implementer", description: "CSO co-implements alongside other partners" },
    { label: "Advisory/oversight", description: "CSO provides advisory or oversight role" },
    { label: "Not involved", description: "No CSO involvement in implementation" },
  ],
  privateSectorEngaged: [
    { label: "Governance/oversight", description: "Private sector in governance or oversight" },
    { label: "Financial partner", description: "Private sector as financial partner" },
    { label: "Technical partner", description: "Private sector as technical partner" },
    { label: "Not engaged", description: "No private sector engagement" },
  ],
  genderObjectivesIntegrated: [
    { label: "Principal (GEN-3)", description: "Gender equality is the principal objective" },
    { label: "Significant (GEN-2)", description: "Gender equality is a significant objective" },
    { label: "Marginal (GEN-1)", description: "Marginal contribution to gender equality" },
    { label: "Not targeted (GEN-0)", description: "Gender equality is not targeted" },
  ],
  coreFlexibleFundingToCSO: [
    { label: "Core/institutional", description: "Core/institutional funding to CSOs" },
    { label: "Flexible project", description: "Flexible project-level funding" },
    { label: "Earmarked only", description: "Only earmarked/restricted funding" },
    { label: "No funding to CSOs", description: "No funding provided to CSOs" },
  ],
};

// Country-specific dropdown fields with their negative option
const COUNTRY_DROPDOWN_FIELDS: Record<string, string> = {
  includedInNationalPlan: "Not included",
  linkedToGovFramework: "Not linked",
  mutualAccountabilityFramework: "Not assessed",
  capacityDevFromNationalPlan: "Not based on national plan",
};

// Fields that get per-field evidence document upload slots
const DOCUMENT_UPLOAD_FIELDS = new Set([
  "formallyApprovedByGov",
  "includedInNationalPlan",
  "linkedToGovFramework",
  "indicatorsFromGov",
  "fundsViaNationalTreasury",
  "govAudit",
  "annualBudgetShared",
  "annualFinReportsPublic",
  "finalEvalPlanned",
  "jointAnnualReview",
  "mutualAccountabilityFramework",
  "genderBudgetAllocation",
]);

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

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

// Helper component for field labels with visible description
const FieldWithDescription: React.FC<{ description: string; children: React.ReactNode }> = ({ description, children }) => (
  <div className="space-y-1">
    {children}
    <p className="text-xs text-slate-500">{description}</p>
  </div>
);

// Inline evidence document upload for individual fields
// Renders inline (same row) next to dropdowns/radio buttons
const InlineDocumentUpload: React.FC<{
  fieldName: string;
  document?: { fileName: string; fileUrl: string; uploadedAt: string } | null;
  uploading: boolean;
  onUpload: (fieldName: string, file: File) => void;
  onRemove: (fieldName: string) => void;
}> = ({ fieldName, document: docInfo, uploading, onUpload, onRemove }) => {
  const inputId = `doc-upload-${fieldName}`;

  if (docInfo) {
    return (
      <div className="flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <a
          href={docInfo.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
        >
          {docInfo.fileName}
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
          onClick={() => onRemove(fieldName)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(fieldName, file);
        }}
        className="hidden"
        id={inputId}
        disabled={uploading}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3 text-xs text-slate-600 hover:text-slate-800 flex-shrink-0"
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Paperclip className="h-3.5 w-3.5 mr-1.5" />
        )}
        {uploading ? "Uploading..." : "Attach evidence"}
      </Button>
    </>
  );
};

// Yes/No radio button field (replaces CheckboxField)
const RadioButtonField: React.FC<{
  id: string;
  value?: string | null;
  onValueChange: (value: string) => void;
  label: string;
  tooltip?: string;
  description?: string;
  documentUpload?: boolean;
  document?: { fileName: string; fileUrl: string; uploadedAt: string } | null;
  uploadingDoc?: boolean;
  onDocUpload?: (fieldName: string, file: File) => void;
  onDocRemove?: (fieldName: string) => void;
}> = ({ id, value, onValueChange, label, tooltip, description, documentUpload, document, uploadingDoc, onDocUpload, onDocRemove }) => (
  <div className="py-3 border-b border-slate-100 last:border-b-0">
    <div className="flex items-center gap-3">
      <RadioGroup
        value={value || ""}
        onValueChange={onValueChange}
        className="flex items-center gap-3 flex-shrink-0"
      >
        <div className="flex items-center gap-1">
          <RadioGroupItem value="yes" id={`${id}-yes`} className="border-orange-300 text-orange-500" />
          <Label htmlFor={`${id}-yes`} className="text-xs font-medium cursor-pointer text-slate-600">Yes</Label>
        </div>
        <div className="flex items-center gap-1">
          <RadioGroupItem value="no" id={`${id}-no`} className="border-orange-300 text-orange-500" />
          <Label htmlFor={`${id}-no`} className="text-xs font-medium cursor-pointer text-slate-600">No</Label>
        </div>
      </RadioGroup>
      <div className="flex-1 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium leading-tight text-slate-800">
            {label}
          </Label>
          {tooltip && (
            <p className="text-xs text-slate-500 leading-relaxed">{tooltip}</p>
          )}
          {description && (
            <p className="text-xs text-slate-400 italic">{description}</p>
          )}
        </div>
        {documentUpload && onDocUpload && onDocRemove && (
          <InlineDocumentUpload
            fieldName={id}
            document={document}
            uploading={uploadingDoc || false}
            onUpload={onDocUpload}
            onRemove={onDocRemove}
          />
        )}
      </div>
    </div>
  </div>
);

// Dropdown field for hardcoded multi-option fields
const DropdownField: React.FC<{
  id: string;
  value?: string | null;
  onValueChange: (value: string) => void;
  label: string;
  tooltip?: string;
  options: { label: string; description?: string }[];
}> = ({ id, value, onValueChange, label, tooltip, options }) => (
  <div className="py-3 border-b border-slate-100 last:border-b-0">
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium leading-tight text-slate-800">
          {label}
        </Label>
        {tooltip && (
          <p className="text-xs text-slate-500 leading-relaxed">{tooltip}</p>
        )}
      </div>
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger className="max-w-md">
          <SelectValue placeholder="Select an option..." />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.label} value={option.label}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-gray-500">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

// Country-specific dropdown field (fetches options from API + appends negative option)
const CountryDropdownField: React.FC<{
  id: string;
  value?: string | null;
  onValueChange: (value: string) => void;
  label: string;
  tooltip?: string;
  description?: string;
  negativeOption: string;
  aeOptions: AEOption[];
  documentUpload?: boolean;
  document?: { fileName: string; fileUrl: string; uploadedAt: string } | null;
  uploadingDoc?: boolean;
  onDocUpload?: (fieldName: string, file: File) => void;
  onDocRemove?: (fieldName: string) => void;
}> = ({ id, value, onValueChange, label, tooltip, description, negativeOption, aeOptions, documentUpload, document, uploadingDoc, onDocUpload, onDocRemove }) => {
  // Build options: admin-configured options + "yes" + negative option
  const options = [
    { value: "yes", label: "Yes", displayLabel: "Yes", dateRange: "", ministries: undefined as { id: string; code: string; name: string }[] | undefined },
    ...aeOptions.map(opt => {
      const displayLabel = opt.acronym ? `${opt.label} (${opt.acronym})` : opt.label;
      const startStr = formatAEDate(opt.start_date, opt.start_date_precision);
      const endStr = formatAEDate(opt.end_date, opt.end_date_precision);
      const dateRange = startStr || endStr ? `${startStr}${startStr && endStr ? " – " : ""}${endStr}` : "";
      return { value: opt.label, label: opt.label, displayLabel, dateRange, ministries: opt.responsible_ministries };
    }),
    { value: negativeOption, label: negativeOption, displayLabel: negativeOption, dateRange: "", ministries: undefined as { id: string; code: string; name: string }[] | undefined },
  ];

  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium leading-tight text-slate-800">
              {label}
            </Label>
            {tooltip && (
              <p className="text-xs text-slate-500 leading-relaxed">{tooltip}</p>
            )}
            {description && (
              <p className="text-xs text-slate-400 italic">{description}</p>
            )}
          </div>
          {documentUpload && onDocUpload && onDocRemove && (
            <InlineDocumentUpload
              fieldName={id}
              document={document}
              uploading={uploadingDoc || false}
              onUpload={onDocUpload}
              onRemove={onDocRemove}
            />
          )}
        </div>
        <Select value={value || ""} onValueChange={onValueChange}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.displayLabel}</span>
                  {option.dateRange && (
                    <span className="text-xs text-gray-400">{option.dateRange}</span>
                  )}
                  {option.ministries && option.ministries.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {option.ministries.map(m => `${m.name} (${m.code})`).join(", ")}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

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

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

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
  const [uploadingDocField, setUploadingDocField] = useState<string | null>(null);
  const [aeOptions, setAeOptions] = useState<AEOption[]>([]);
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

  // Fetch country-specific dropdown options
  useEffect(() => {
    const fetchAEOptions = async () => {
      try {
        const response = await apiFetch('/api/admin/aid-effectiveness-options?activeOnly=true');
        if (response.ok) {
          const result = await response.json();
          setAeOptions(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching AE options:', error);
      }
    };
    fetchAEOptions();
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

  // Get options for a specific country-dropdown category
  const getOptionsForCategory = useCallback((category: string) => {
    return aeOptions.filter(opt => opt.category === category);
  }, [aeOptions]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const fields = [
      formData.implementingPartner,
      formData.formallyApprovedByGov != null,
      formData.includedInNationalPlan != null,
      formData.linkedToGovFramework != null,
      formData.indicatorsFromGov != null,
      formData.indicatorsViaGovData != null,
      formData.implementedByNationalInstitution != null,
      formData.govEntityAccountable != null,
      formData.supportsPublicSector != null,
      formData.capacityDevFromNationalPlan != null,
      formData.fundsViaNationalTreasury != null,
      formData.govBudgetSystem != null,
      formData.govFinReporting != null,
      formData.finReportingIntegratedPFM != null,
      formData.govAudit != null,
      formData.govProcurement != null,
      formData.annualBudgetShared != null,
      formData.forwardPlanShared != null,
      formData.multiYearFinancingAgreement != null,
      formData.tiedStatus,
      formData.annualFinReportsPublic != null,
      formData.dataUpdatedPublicly != null,
      formData.finalEvalPlanned != null,
      formData.evalReportPublic != null,
      formData.performanceIndicatorsReported != null,
      formData.jointAnnualReview != null,
      formData.mutualAccountabilityFramework != null,
      formData.correctiveActionsDocumented != null,
      formData.civilSocietyConsulted != null,
      formData.csoInvolvedInImplementation != null,
      formData.coreFlexibleFundingToCSO != null,
      formData.publicPrivateDialogue != null,
      formData.privateSectorEngaged != null,
      formData.genderObjectivesIntegrated != null,
      formData.genderBudgetAllocation != null,
      formData.genderDisaggregatedIndicators != null,
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

  // Per-field evidence document upload
  const handleFieldDocumentUpload = async (fieldName: string, file: File) => {
    if (!general.id) {
      toast.error("Please save the activity first");
      return;
    }

    setUploadingDocField(fieldName);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldName}_${Date.now()}.${fileExt}`;
      const filePath = `activities/${general.id}/effectiveness/${fieldName}/${fileName}`;

      const { error } = await supabase.storage
        .from('activity-documents')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('activity-documents')
        .getPublicUrl(filePath);

      const newDocuments = {
        ...formData.documents,
        [fieldName]: {
          fileName: file.name,
          fileUrl: publicUrl,
          uploadedAt: new Date().toISOString(),
        }
      };
      updateField('documents', newDocuments);
      toast.success(`Evidence document uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocField(null);
    }
  };

  // Per-field evidence document remove
  const handleFieldDocumentRemove = (fieldName: string) => {
    const newDocuments = { ...formData.documents };
    newDocuments[fieldName] = null;
    updateField('documents', newDocuments);
  };

  // Export form data to XLSX
  const handleExportXLSX = () => {
    try {
      const formatValue = (val?: string | null) => {
        if (val == null) return '';
        if (val === 'yes') return 'Yes';
        if (val === 'no') return 'No';
        return val;
      };

      // Look up responsible ministries for a country-dropdown field value
      const getMinistryNames = (category: string, val?: string | null): string => {
        if (!val) return '';
        const match = aeOptions.find(opt => opt.category === category && opt.label === val);
        if (match?.responsible_ministries && match.responsible_ministries.length > 0) {
          return match.responsible_ministries.map(m => m.name).join('; ');
        }
        return '';
      };

      const exportData = [
        { Section: '1. Government Ownership', Field: 'Implementing Partner', Value: formData.implementingPartner || '', 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Formally Approved by Government', Value: formatValue(formData.formallyApprovedByGov), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Included in National Development Plan', Value: formatValue(formData.includedInNationalPlan), 'Responsible Ministry': getMinistryNames('includedInNationalPlan', formData.includedInNationalPlan) },
        { Section: '1. Government Ownership', Field: 'Linked to Government Results Framework', Value: formatValue(formData.linkedToGovFramework), 'Responsible Ministry': getMinistryNames('linkedToGovFramework', formData.linkedToGovFramework) },
        { Section: '1. Government Ownership', Field: 'Indicators from Government Frameworks', Value: formatValue(formData.indicatorsFromGov), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Monitored via Government M&E', Value: formatValue(formData.indicatorsViaGovData), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Implemented by National Institution', Value: formatValue(formData.implementedByNationalInstitution), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Gov Entity as Accountable Authority', Value: formatValue(formData.govEntityAccountable), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Supports Public Sector Capacity', Value: formatValue(formData.supportsPublicSector), 'Responsible Ministry': '' },
        { Section: '1. Government Ownership', Field: 'Capacity Dev from National Plan', Value: formatValue(formData.capacityDevFromNationalPlan), 'Responsible Ministry': getMinistryNames('capacityDevFromNationalPlan', formData.capacityDevFromNationalPlan) },
        { Section: '1. Government Ownership', Field: 'Number of Outcome Indicators', Value: formData.numOutcomeIndicators?.toString() || '', 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Funds via National Treasury', Value: formatValue(formData.fundsViaNationalTreasury), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Government Budget Execution', Value: formatValue(formData.govBudgetSystem), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Government Financial Reporting', Value: formatValue(formData.govFinReporting), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Integrated into National PFM', Value: formatValue(formData.finReportingIntegratedPFM), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Government Audit', Value: formatValue(formData.govAudit), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'National Procurement Systems', Value: formatValue(formData.govProcurement), 'Responsible Ministry': '' },
        { Section: '2. Country Systems', Field: 'Why Not Using Gov Systems', Value: formData.govSystemWhyNot || '', 'Responsible Ministry': '' },
        { Section: '3. Predictability', Field: 'Annual Budget Shared', Value: formatValue(formData.annualBudgetShared), 'Responsible Ministry': '' },
        { Section: '3. Predictability', Field: 'Forward Plan Shared', Value: formatValue(formData.forwardPlanShared), 'Responsible Ministry': '' },
        { Section: '3. Predictability', Field: 'Multi-Year Financing Agreement', Value: formatValue(formData.multiYearFinancingAgreement), 'Responsible Ministry': '' },
        { Section: '3. Predictability', Field: 'Tied Status', Value: formData.tiedStatus || '', 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Annual Financial Reports Public', Value: formatValue(formData.annualFinReportsPublic), 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Data Updated Publicly Annually', Value: formatValue(formData.dataUpdatedPublicly), 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Final Evaluation Planned', Value: formatValue(formData.finalEvalPlanned), 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Final Evaluation Date', Value: formData.finalEvalDate || '', 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Evaluation Report Public', Value: formatValue(formData.evalReportPublic), 'Responsible Ministry': '' },
        { Section: '4. Transparency', Field: 'Performance Indicators Reported', Value: formatValue(formData.performanceIndicatorsReported), 'Responsible Ministry': '' },
        { Section: '5. Mutual Accountability', Field: 'Joint Annual Review', Value: formatValue(formData.jointAnnualReview), 'Responsible Ministry': '' },
        { Section: '5. Mutual Accountability', Field: 'Mutual Accountability Framework', Value: formatValue(formData.mutualAccountabilityFramework), 'Responsible Ministry': getMinistryNames('mutualAccountabilityFramework', formData.mutualAccountabilityFramework) },
        { Section: '5. Mutual Accountability', Field: 'Corrective Actions Documented', Value: formatValue(formData.correctiveActionsDocumented), 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector', Field: 'Civil Society Consulted', Value: formatValue(formData.civilSocietyConsulted), 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector', Field: 'CSOs in Implementation', Value: formatValue(formData.csoInvolvedInImplementation), 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector', Field: 'Core Funding to CSOs', Value: formatValue(formData.coreFlexibleFundingToCSO), 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector', Field: 'Public-Private Dialogue', Value: formatValue(formData.publicPrivateDialogue), 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector', Field: 'Private Sector Engaged', Value: formatValue(formData.privateSectorEngaged), 'Responsible Ministry': '' },
        { Section: '7. Gender Equality', Field: 'Gender Objectives Integrated', Value: formatValue(formData.genderObjectivesIntegrated), 'Responsible Ministry': '' },
        { Section: '7. Gender Equality', Field: 'Gender Budget Allocation', Value: formatValue(formData.genderBudgetAllocation), 'Responsible Ministry': '' },
        { Section: '7. Gender Equality', Field: 'Gender-Disaggregated Indicators', Value: formatValue(formData.genderDisaggregatedIndicators), 'Responsible Ministry': '' },
        { Section: '10. Remarks', Field: 'Additional Notes', Value: formData.remarks || '', 'Responsible Ministry': '' },
      ];

      if (formData.contacts && formData.contacts.length > 0) {
        formData.contacts.forEach((contact, index) => {
          exportData.push({
            Section: '8. Contacts',
            Field: `Contact ${index + 1}`,
            Value: `${contact.firstName} ${contact.lastName}${contact.email ? ` (${contact.email})` : ''}`,
            'Responsible Ministry': '',
          });
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aid Effectiveness');
      ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 50 }, { wch: 40 }];
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

  // Check if any gov system is "no" (for conditional text)
  const anyGovSystemNo =
    formData.fundsViaNationalTreasury === 'no' ||
    formData.govBudgetSystem === 'no' ||
    formData.govFinReporting === 'no' ||
    formData.finReportingIntegratedPFM === 'no' ||
    formData.govAudit === 'no' ||
    formData.govProcurement === 'no';

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header with GPEDC banner */}
      <div
        className="border-b px-6 py-5 bg-cover bg-center bg-no-repeat relative overflow-hidden rounded-t-lg"
        style={{ backgroundImage: 'url(https://www.effectivecooperation.org/sites/default/files/imported/images/Colors_GPEDC.png)' }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Aid Effectiveness</h2>
              <p className="text-xs font-bold text-white/70">GPEDC Monitoring Framework</p>
            </div>
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs font-bold">
              GPEDC Compliant
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Progress value={completionPercentage} className="w-24 h-2 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
              <span className="text-sm font-bold text-white">{completionPercentage}%</span>
            </div>
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
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
            <Building2 className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Government Ownership & Strategic Alignment</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicator 1</Badge>
          </div>

          <div className="space-y-2">
            <FieldWithDescription description={TOOLTIPS.implementingPartner}>
              <Label className="text-sm font-medium text-slate-700">Implementing Partner</Label>
            </FieldWithDescription>
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

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <RadioButtonField
              id="formallyApprovedByGov"
              value={formData.formallyApprovedByGov}
              onValueChange={(value) => updateField('formallyApprovedByGov', value)}
              label="Formally Approved by Government Before Implementation Began"
              tooltip={TOOLTIPS.formallyApprovedByGov}
              documentUpload
              document={formData.documents?.formallyApprovedByGov}
              uploadingDoc={uploadingDocField === 'formallyApprovedByGov'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <CountryDropdownField
              id="includedInNationalPlan"
              value={formData.includedInNationalPlan}
              onValueChange={(value) => updateField('includedInNationalPlan', value)}
              label="Included in National Development Plan or Sector Strategy"
              tooltip={TOOLTIPS.includedInNationalPlan}
              description="Document reference exists"
              negativeOption={COUNTRY_DROPDOWN_FIELDS.includedInNationalPlan}
              aeOptions={getOptionsForCategory('includedInNationalPlan')}
              documentUpload
              document={formData.documents?.includedInNationalPlan}
              uploadingDoc={uploadingDocField === 'includedInNationalPlan'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <CountryDropdownField
              id="linkedToGovFramework"
              value={formData.linkedToGovFramework}
              onValueChange={(value) => updateField('linkedToGovFramework', value)}
              label="Linked to Government Results Framework"
              tooltip={TOOLTIPS.linkedToGovFramework}
              negativeOption={COUNTRY_DROPDOWN_FIELDS.linkedToGovFramework}
              aeOptions={getOptionsForCategory('linkedToGovFramework')}
              documentUpload
              document={formData.documents?.linkedToGovFramework}
              uploadingDoc={uploadingDocField === 'linkedToGovFramework'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="indicatorsFromGov"
              value={formData.indicatorsFromGov}
              onValueChange={(value) => updateField('indicatorsFromGov', value)}
              label="Indicators Drawn from Government Monitoring Frameworks"
              tooltip={TOOLTIPS.indicatorsFromGov}
              documentUpload
              document={formData.documents?.indicatorsFromGov}
              uploadingDoc={uploadingDocField === 'indicatorsFromGov'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="indicatorsViaGovData"
              value={formData.indicatorsViaGovData}
              onValueChange={(value) => updateField('indicatorsViaGovData', value)}
              label="Monitored Through Government M&E Systems"
              tooltip={TOOLTIPS.indicatorsViaGovData}
            />
            <RadioButtonField
              id="implementedByNationalInstitution"
              value={formData.implementedByNationalInstitution}
              onValueChange={(value) => updateField('implementedByNationalInstitution', value)}
              label="Implemented by a National Public Institution"
              tooltip={TOOLTIPS.implementedByNationalInstitution}
            />
            <RadioButtonField
              id="govEntityAccountable"
              value={formData.govEntityAccountable}
              onValueChange={(value) => updateField('govEntityAccountable', value)}
              label="Government Entity Contractually Designated as Accountable Authority"
              tooltip={TOOLTIPS.govEntityAccountable}
            />
            <RadioButtonField
              id="supportsPublicSector"
              value={formData.supportsPublicSector}
              onValueChange={(value) => updateField('supportsPublicSector', value)}
              label="Supports Public Sector Capacity Strengthening"
              tooltip={TOOLTIPS.supportsPublicSector}
            />
            <CountryDropdownField
              id="capacityDevFromNationalPlan"
              value={formData.capacityDevFromNationalPlan}
              onValueChange={(value) => updateField('capacityDevFromNationalPlan', value)}
              label="Capacity Development Based on Nationally Identified Capacity Plan"
              tooltip={TOOLTIPS.capacityDevFromNationalPlan}
              description="GPEDC Indicator 9"
              negativeOption={COUNTRY_DROPDOWN_FIELDS.capacityDevFromNationalPlan}
              aeOptions={getOptionsForCategory('capacityDevFromNationalPlan')}
            />
          </div>

          <div className="space-y-2 max-w-xs">
            <FieldWithDescription description={TOOLTIPS.numOutcomeIndicators}>
              <Label className="text-sm font-medium text-slate-700">Number of Outcome Indicators</Label>
            </FieldWithDescription>
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
            <Globe className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Use of Country Public Financial & Procurement Systems</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicator 5a</Badge>
          </div>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <RadioButtonField
              id="fundsViaNationalTreasury"
              value={formData.fundsViaNationalTreasury}
              onValueChange={(value) => updateField('fundsViaNationalTreasury', value)}
              label="Funds Disbursed Through National Treasury System"
              tooltip={TOOLTIPS.fundsViaNationalTreasury}
              documentUpload
              document={formData.documents?.fundsViaNationalTreasury}
              uploadingDoc={uploadingDocField === 'fundsViaNationalTreasury'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="govBudgetSystem"
              value={formData.govBudgetSystem}
              onValueChange={(value) => updateField('govBudgetSystem', value)}
              label="Government Budget Execution Procedures Used"
              tooltip={TOOLTIPS.govBudgetSystem}
            />
            <RadioButtonField
              id="govFinReporting"
              value={formData.govFinReporting}
              onValueChange={(value) => updateField('govFinReporting', value)}
              label="Government Financial Reporting Systems Used"
              tooltip={TOOLTIPS.govFinReporting}
            />
            <RadioButtonField
              id="finReportingIntegratedPFM"
              value={formData.finReportingIntegratedPFM}
              onValueChange={(value) => updateField('finReportingIntegratedPFM', value)}
              label="Financial Reporting Integrated into National PFM Systems"
              tooltip={TOOLTIPS.finReportingIntegratedPFM}
            />
            <RadioButtonField
              id="govAudit"
              value={formData.govAudit}
              onValueChange={(value) => updateField('govAudit', value)}
              label="Government Audit Procedures Used (National Audit Institution)"
              tooltip={TOOLTIPS.govAudit}
              documentUpload
              document={formData.documents?.govAudit}
              uploadingDoc={uploadingDocField === 'govAudit'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="govProcurement"
              value={formData.govProcurement}
              onValueChange={(value) => updateField('govProcurement', value)}
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
            <Calendar className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Predictability & Aid Characteristics</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicators 5b, 6, 10</Badge>
          </div>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <RadioButtonField
              id="annualBudgetShared"
              value={formData.annualBudgetShared}
              onValueChange={(value) => updateField('annualBudgetShared', value)}
              label="Annual Budget Shared with Government in Advance of Fiscal Year"
              tooltip={TOOLTIPS.annualBudgetShared}
              documentUpload
              document={formData.documents?.annualBudgetShared}
              uploadingDoc={uploadingDocField === 'annualBudgetShared'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="forwardPlanShared"
              value={formData.forwardPlanShared}
              onValueChange={(value) => updateField('forwardPlanShared', value)}
              label="Three-Year Forward Expenditure Shared with Government"
              tooltip={TOOLTIPS.forwardPlanShared}
            />
            <RadioButtonField
              id="multiYearFinancingAgreement"
              value={formData.multiYearFinancingAgreement}
              onValueChange={(value) => updateField('multiYearFinancingAgreement', value)}
              label="Multi-Year Financing Agreement Signed"
              tooltip={TOOLTIPS.multiYearFinancingAgreement}
            />
          </div>

          <div className="space-y-2 max-w-md">
            <FieldWithDescription description={TOOLTIPS.tiedStatus}>
              <Label className="text-sm font-medium text-slate-700">Tied Aid Status</Label>
            </FieldWithDescription>
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
            <Eye className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Transparency & Timely Reporting</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicator 4</Badge>
          </div>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <RadioButtonField
              id="annualFinReportsPublic"
              value={formData.annualFinReportsPublic}
              onValueChange={(value) => updateField('annualFinReportsPublic', value)}
              label="Annual Financial Reports Publicly Accessible"
              tooltip={TOOLTIPS.annualFinReportsPublic}
              documentUpload
              document={formData.documents?.annualFinReportsPublic}
              uploadingDoc={uploadingDocField === 'annualFinReportsPublic'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="dataUpdatedPublicly"
              value={formData.dataUpdatedPublicly}
              onValueChange={(value) => updateField('dataUpdatedPublicly', value)}
              label="Financial and Results Data Updated Publicly at Least Annually"
              tooltip={TOOLTIPS.dataUpdatedPublicly}
            />
            <RadioButtonField
              id="finalEvalPlanned"
              value={formData.finalEvalPlanned}
              onValueChange={(value) => updateField('finalEvalPlanned', value)}
              label="Final Evaluation Planned"
              tooltip={TOOLTIPS.finalEvalPlanned}
              documentUpload
              document={formData.documents?.finalEvalPlanned}
              uploadingDoc={uploadingDocField === 'finalEvalPlanned'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="evalReportPublic"
              value={formData.evalReportPublic}
              onValueChange={(value) => updateField('evalReportPublic', value)}
              label="Evaluation Report Publicly Available (Once Completed)"
              tooltip={TOOLTIPS.evalReportPublic}
            />
            <RadioButtonField
              id="performanceIndicatorsReported"
              value={formData.performanceIndicatorsReported}
              onValueChange={(value) => updateField('performanceIndicatorsReported', value)}
              label="Performance Indicators Reported Annually"
              tooltip={TOOLTIPS.performanceIndicatorsReported}
            />
          </div>

          {formData.finalEvalPlanned === 'yes' && (
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
            <Handshake className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Mutual Accountability</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicator 7</Badge>
          </div>

          <p className="text-xs text-gray-500 italic">
            Note: Indicator 7 is formally country-level. These questions approximate it at activity level.
          </p>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <RadioButtonField
              id="jointAnnualReview"
              value={formData.jointAnnualReview}
              onValueChange={(value) => updateField('jointAnnualReview', value)}
              label="Joint Annual Review Conducted with Government and Development Partners"
              tooltip={TOOLTIPS.jointAnnualReview}
              documentUpload
              document={formData.documents?.jointAnnualReview}
              uploadingDoc={uploadingDocField === 'jointAnnualReview'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <CountryDropdownField
              id="mutualAccountabilityFramework"
              value={formData.mutualAccountabilityFramework}
              onValueChange={(value) => updateField('mutualAccountabilityFramework', value)}
              label="Activity Assessed Under a Formal Country-Level Mutual Accountability Framework"
              tooltip={TOOLTIPS.mutualAccountabilityFramework}
              negativeOption={COUNTRY_DROPDOWN_FIELDS.mutualAccountabilityFramework}
              aeOptions={getOptionsForCategory('mutualAccountabilityFramework')}
              documentUpload
              document={formData.documents?.mutualAccountabilityFramework}
              uploadingDoc={uploadingDocField === 'mutualAccountabilityFramework'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="correctiveActionsDocumented"
              value={formData.correctiveActionsDocumented}
              onValueChange={(value) => updateField('correctiveActionsDocumented', value)}
              label="Corrective Actions Documented When Targets Are Not Met"
              tooltip={TOOLTIPS.correctiveActionsDocumented}
            />
          </div>
        </div>

        {/* ====== Section 6: Civil Society & Private Sector Engagement ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Civil Society & Private Sector Engagement</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicators 2 & 3</Badge>
          </div>

          <p className="text-xs text-gray-500 italic">
            Note: Indicators 2 and 3 are partially systemic, but these are measurable proxies.
          </p>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <DropdownField
              id="civilSocietyConsulted"
              value={formData.civilSocietyConsulted}
              onValueChange={(value) => updateField('civilSocietyConsulted', value)}
              label="Level of Civil Society Consultation During Design Phase"
              tooltip={TOOLTIPS.civilSocietyConsulted}
              options={MULTI_OPTION_FIELDS.civilSocietyConsulted}
            />
            <DropdownField
              id="csoInvolvedInImplementation"
              value={formData.csoInvolvedInImplementation}
              onValueChange={(value) => updateField('csoInvolvedInImplementation', value)}
              label="Civil Society Involvement in Implementation or Governance"
              tooltip={TOOLTIPS.csoInvolvedInImplementation}
              options={MULTI_OPTION_FIELDS.csoInvolvedInImplementation}
            />
            <DropdownField
              id="coreFlexibleFundingToCSO"
              value={formData.coreFlexibleFundingToCSO}
              onValueChange={(value) => updateField('coreFlexibleFundingToCSO', value)}
              label="Type of Funding Provided to Civil Society Organisations"
              tooltip={TOOLTIPS.coreFlexibleFundingToCSO}
              options={MULTI_OPTION_FIELDS.coreFlexibleFundingToCSO}
            />
            <RadioButtonField
              id="publicPrivateDialogue"
              value={formData.publicPrivateDialogue}
              onValueChange={(value) => updateField('publicPrivateDialogue', value)}
              label="Structured Public-Private Dialogue Mechanisms Included"
              tooltip={TOOLTIPS.publicPrivateDialogue}
            />
            <DropdownField
              id="privateSectorEngaged"
              value={formData.privateSectorEngaged}
              onValueChange={(value) => updateField('privateSectorEngaged', value)}
              label="Level of Private Sector Engagement in Governance or Oversight"
              tooltip={TOOLTIPS.privateSectorEngaged}
              options={MULTI_OPTION_FIELDS.privateSectorEngaged}
            />
          </div>
        </div>

        {/* ====== Section 7: Gender Equality & Inclusion ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Heart className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Gender Equality & Inclusion</h3>
            <Badge variant="outline" className="text-xs text-[#F37021] border-[#F37021]/30">GPEDC Indicator 8</Badge>
          </div>

          <div className="space-y-0 border rounded-lg px-4 bg-white">
            <DropdownField
              id="genderObjectivesIntegrated"
              value={formData.genderObjectivesIntegrated}
              onValueChange={(value) => updateField('genderObjectivesIntegrated', value)}
              label="Gender Equality or Inclusion Objectives Integration Level"
              tooltip={TOOLTIPS.genderObjectivesIntegrated}
              options={MULTI_OPTION_FIELDS.genderObjectivesIntegrated}
            />
            <RadioButtonField
              id="genderBudgetAllocation"
              value={formData.genderBudgetAllocation}
              onValueChange={(value) => updateField('genderBudgetAllocation', value)}
              label="Dedicated Budget Allocation for Gender Equality Outcomes"
              tooltip={TOOLTIPS.genderBudgetAllocation}
              documentUpload
              document={formData.documents?.genderBudgetAllocation}
              uploadingDoc={uploadingDocField === 'genderBudgetAllocation'}
              onDocUpload={handleFieldDocumentUpload}
              onDocRemove={handleFieldDocumentRemove}
            />
            <RadioButtonField
              id="genderDisaggregatedIndicators"
              value={formData.genderDisaggregatedIndicators}
              onValueChange={(value) => updateField('genderDisaggregatedIndicators', value)}
              label="Gender-Disaggregated Indicators Included"
              tooltip={TOOLTIPS.genderDisaggregatedIndicators}
            />
          </div>
        </div>

        {/* ====== Section 8: Contact Details ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <MessageSquare className="h-5 w-5 text-slate-500" />
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
            <FileText className="h-5 w-5 text-slate-500" />
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
                      <Trash2 className="h-4 w-4 mr-1 text-red-500" />
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
            <FileText className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-gray-900">Additional Remarks</h3>
          </div>

          <div className="space-y-2">
            <FieldWithDescription description={TOOLTIPS.remarks}>
              <Label className="text-sm font-medium text-slate-700">Additional Notes</Label>
            </FieldWithDescription>
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
