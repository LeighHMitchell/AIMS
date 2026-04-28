"use client";

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Search, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { EnhancedMultiSelect } from "@/components/ui/enhanced-multi-select";
import { TiedStatusSelect } from "@/components/forms/TiedStatusSelect";
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
  Loader2,
  HelpCircle
} from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
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
  /** "yes" | "no" | "unsure" — answer to whether the activity is in a national plan */
  includedInNationalPlan?: string | null;
  /** UUIDs of selected national_plans rows (only used when includedInNationalPlan === "yes") */
  includedInNationalPlanIds?: string[];
  /** "yes" | "no" | "unsure" — answer to whether the activity is linked to a govt results framework */
  linkedToGovFramework?: string | null;
  /** UUIDs of selected national_plans rows (only used when linkedToGovFramework === "yes") */
  linkedToGovFrameworkIds?: string[];
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
  uploadedDocumentSize?: number;
  uploadedDocumentAt?: string;
  uploadedDocumentBy?: string;
  externalDocumentLink?: string;
  /**
   * Array of external links. Each link is `{ url, name? }`.
   * The legacy formats (string, string[]) are normalised to this shape on read.
   */
  externalDocumentLinks?: Array<{ url: string; name?: string }>;

  // Section 10: Remarks
  remarks?: string;

  // Per-field evidence documents (supports multiple per field)
  documents?: Record<string, Array<{ fileName: string; fileUrl: string; uploadedAt: string }> | { fileName: string; fileUrl: string; uploadedAt: string } | null>;

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
  iati_org_id?: string;
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
    { label: "Principal", description: "Gender equality is the principal objective" },
    { label: "Significant", description: "Gender equality is a significant objective" },
    { label: "Marginal", description: "Marginal contribution to gender equality" },
    { label: "Not targeted", description: "Gender equality is not targeted" },
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
  implementingPartner: "Mirrored from Overview > Reporting Organisation. Edit there to change.",
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
  govSystemWhyNot: "Briefly describe why country PFM, audit, or procurement systems are bypassed for this activity — e.g., donor procurement rules, fiduciary risk findings, sector-specific donor frameworks, or capacity constraints in the relevant institution.",
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

// GPEDC Main Guide reference
const GPEDC_MAIN_GUIDE_URL =
  "https://www.effectivecooperation.org/sites/default/files/documents/Main%20Guide%20%28ENG%29.pdf";

// Detailed help text per question. Keys are field ids.
// Rendered inside an expandable chevron next to each question.
const EXPANDED_HELP: Record<string, string> = {
  formallyApprovedByGov:
    "Formal approval by the partner government — typically through a signed agreement, cabinet decision or sector minister sign-off — signals national ownership and demonstrates the activity reflects partner-country priorities. Tick Yes only if there is a documented approval predating implementation. Examples of evidence: signed financing/cooperation agreement, government letter of endorsement, parliamentary approval where required.",
  includedInNationalPlan:
    "Country-led results frameworks (GPEDC Indicator 1a) start from a national plan or sector strategy. Select the specific plan if listed. If the activity is not anchored in any national plan, choose 'Not included' — but be aware this typically lowers alignment scores in monitoring rounds.",
  linkedToGovFramework:
    "GPEDC Indicator 1a measures whether project objectives, indicators and targets are drawn from a country-led results framework — for example a National Results Framework, Sector Results Framework, or MTEF performance framework. Strong alignment means the project's logframe maps directly onto government targets, not just thematic similarity.",
  indicatorsFromGov:
    "GPEDC Indicator 1b — at least 50% of an activity's results indicators should be drawn from official government sources (national statistics, sector M&E plans, SDG targets) rather than custom donor-defined indicators. Tick Yes if the majority of outcome/output indicators reuse government definitions and baselines.",
  indicatorsViaGovData:
    "GPEDC Indicator 1b also asks whether the data used to monitor those indicators flows through government M&E systems — e.g. HMIS, EMIS, national statistical office surveys — rather than parallel donor monitoring. Routing data through government systems strengthens national statistical capacity over time.",
  implementedByNationalInstitution:
    "Tick Yes when the day-to-day implementer is a national public institution (a line ministry, a state agency, a sub-national authority). NGO or contractor delivery typically does not count, even when the work is done in-country. This relates to GPEDC Indicators 5a and 9.",
  govEntityAccountable:
    "Beyond who implements, this asks who is contractually accountable. A government entity should be the named accountable authority in the financing agreement — not just a steering-committee co-chair. Yes here strengthens national ownership.",
  supportsPublicSector:
    "Activities that build the capability of public institutions (training, systems, processes, organisational reform) score positively here. Pure service delivery without institutional strengthening does not.",
  capacityDevFromNationalPlan:
    "GPEDC Indicator 9 — capacity development is most effective when it responds to a nationally identified plan (a Public Service Reform Strategy, a Sector Capacity Plan, etc.) rather than donor-driven training menus. Yes signals demand-led capacity building.",
  numOutcomeIndicators:
    "Count outcome-level (not output- or activity-level) indicators in your results framework. Outcome indicators measure changes in conditions or behaviour (e.g. 'maternal mortality rate'), not deliverables (e.g. 'number of training days').",
  fundsViaNationalTreasury:
    "GPEDC Indicator 5a (PFM use). Yes means disbursements pass through the country's Treasury Single Account or budget execution system. Bypassing the treasury — paying contractors directly, or routing through donor-managed accounts — counts as No.",
  govBudgetSystem:
    "GPEDC Indicator 5a — does the activity use the government's own budget execution procedures (chart of accounts, expenditure controls, commitment system)? On-budget reporting alone is not enough; the funds must actually move through government processes.",
  govFinReporting:
    "Tick Yes if expenditures are recorded in, and reported through, the government's financial reporting system (e.g. IFMIS), in the same format as domestic spending. Parallel donor reports do not count.",
  finReportingIntegratedPFM:
    "Beyond using the system, are reports integrated into national PFM cycles — e.g. consolidated in the budget execution report presented to Parliament? This is a higher bar than simply submitting figures.",
  govAudit:
    "GPEDC Indicator 5a — is the activity subject to audit by the country's Supreme Audit Institution under national audit standards? Donor-commissioned external audits do not count, even if rigorous.",
  govProcurement:
    "Does procurement follow the country's public procurement law and use national procurement institutions? If donor procurement rules apply (the common practice when concerns about country systems exist), the answer is No — and the reason should be recorded in the comments.",
  annualBudgetShared:
    "GPEDC Indicator 5b (annual predictability). Yes means the disbursement schedule for the upcoming fiscal year was communicated to the government before that fiscal year started, so it could be reflected in the national budget.",
  forwardPlanShared:
    "GPEDC Indicator 6 (medium-term predictability). Forward expenditure information should cover at least 3 years ahead and be shared with the partner government — typically through MTEF dialogue or a multi-year cooperation framework.",
  multiYearFinancingAgreement:
    "A signed multi-year financing agreement provides a stronger predictability signal than annual commitments alone. Tick Yes if a binding multi-year instrument is in place.",
  tiedStatus:
    "GPEDC Indicator 10 — Untied: open international competition; Partially Tied: limited to a group of countries (e.g. donor + selected developing countries); Tied: procurement restricted to suppliers from the donor country. Use the legal status as defined in the financing agreement.",
  annualFinReportsPublic:
    "GPEDC Indicator 4 (transparency). Annual financial reports should be accessible to the public — typically by publishing on the donor's IATI registry, the country's AMP, or a project website — within a reasonable timeframe.",
  dataUpdatedPublicly:
    "Public data should be refreshed at least annually for it to be useful for accountability. A one-off publication does not count.",
  finalEvalPlanned:
    "Tick Yes only if a final evaluation is both planned and budgeted in the activity design. Aspirations without resources do not count.",
  evalReportPublic:
    "Public availability is a core transparency commitment. If the report will be publicly available (donor website, IATI, national evaluation registry) on completion, tick Yes.",
  performanceIndicatorsReported:
    "Annual reporting against performance indicators — not only at completion — is a core requirement of results-based management.",
  jointAnnualReview:
    "GPEDC Indicator 7 — a joint annual review brings government, development partners, and ideally non-state actors together to review progress and agree corrective actions. A donor-only review does not count.",
  mutualAccountabilityFramework:
    "GPEDC Indicator 7 also asks whether the activity is assessed under a country-level mutual accountability framework (e.g. GPEDC monitoring, a Joint Country Action Plan, a Development Partnership Policy). Select the specific framework if applicable.",
  correctiveActionsDocumented:
    "When targets are missed, are corrective actions identified, agreed and documented? This is a marker of adaptive management and a stronger answer than simply 'we noted the variance'.",
  civilSocietyConsulted:
    "GPEDC Indicator 2 (civil society engagement). Formal structured: documented consultations with CSO platforms; Informal: ad-hoc conversations; Information sharing only: no two-way dialogue; Not consulted: design closed to civil society.",
  csoInvolvedInImplementation:
    "GPEDC Indicator 2 — beyond consultation, are CSOs implementers, co-implementers, or in advisory/oversight roles? Lead implementer reflects the strongest engagement; Not involved means no formal CSO role.",
  coreFlexibleFundingToCSO:
    "Core/institutional funding — funding that supports the CSO's mission and overheads, not just projects — is the strongest CSO support type. Earmarked-only funding has the lowest flexibility.",
  publicPrivateDialogue:
    "GPEDC Indicator 3 — does the activity include a structured public-private dialogue mechanism (a working group, advisory council, formal forum) where the private sector engages on policy or programme design?",
  privateSectorEngaged:
    "GPEDC Indicator 3 — Governance/oversight: private sector is on a steering body; Financial partner: contributing co-finance; Technical partner: providing technical input; Not engaged: no formal role.",
  genderObjectivesIntegrated:
    "GPEDC Indicator 8 / OECD-DAC gender marker. Principal: gender equality is the principal objective; Significant: an important and deliberate objective but not the principal; Marginal: mentioned but not deliberately targeted; Not targeted: no gender component.",
  genderBudgetAllocation:
    "Has a specific share of the budget been ring-fenced for gender equality outcomes (gender budget tagging)? A general 'we mainstream gender' commitment without a budget line is not enough.",
  genderDisaggregatedIndicators:
    "Are at least the people-level indicators reported disaggregated by sex? This is a basic requirement under GPEDC Indicator 8.",
};

// Sequential numbering of every question in JSX order. Used to prefix labels.
const QUESTION_ORDER: string[] = [
  "formallyApprovedByGov",
  "includedInNationalPlan",
  "linkedToGovFramework",
  "indicatorsFromGov",
  "indicatorsViaGovData",
  "implementedByNationalInstitution",
  "govEntityAccountable",
  "supportsPublicSector",
  "capacityDevFromNationalPlan",
  "numOutcomeIndicators",
  "fundsViaNationalTreasury",
  "govBudgetSystem",
  "govFinReporting",
  "finReportingIntegratedPFM",
  "govAudit",
  "govProcurement",
  "annualBudgetShared",
  "forwardPlanShared",
  "multiYearFinancingAgreement",
  "tiedStatus",
  "annualFinReportsPublic",
  "dataUpdatedPublicly",
  "finalEvalPlanned",
  "evalReportPublic",
  "performanceIndicatorsReported",
  "jointAnnualReview",
  "mutualAccountabilityFramework",
  "correctiveActionsDocumented",
  "civilSocietyConsulted",
  "csoInvolvedInImplementation",
  "coreFlexibleFundingToCSO",
  "publicPrivateDialogue",
  "privateSectorEngaged",
  "genderObjectivesIntegrated",
  "genderBudgetAllocation",
  "genderDisaggregatedIndicators",
];
const QUESTION_NUMBER: Record<string, number> = QUESTION_ORDER.reduce(
  (acc, id, i) => ({ ...acc, [id]: i + 1 }),
  {} as Record<string, number>
);

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
    <p className="text-helper text-muted-foreground">{description}</p>
  </div>
);

// Inline evidence document upload for individual fields
// Renders inline (same row) next to dropdowns/radio buttons
const InlineDocumentUpload: React.FC<{
  fieldName: string;
  document?: Array<{ fileName: string; fileUrl: string; uploadedAt: string }> | { fileName: string; fileUrl: string; uploadedAt: string } | null;
  uploading: boolean;
  onUpload: (fieldName: string, file: File) => void;
  onRemove: (fieldName: string, index?: number) => void;
}> = ({ fieldName, document: docInfo, uploading, onUpload, onRemove }) => {
  const inputId = `doc-upload-${fieldName}`;

  // Normalize to array (backward compatible with old single-doc format)
  const docs: Array<{ fileName: string; fileUrl: string; uploadedAt: string }> = docInfo
    ? Array.isArray(docInfo) ? docInfo : [docInfo]
    : [];

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div>
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(fieldName, file);
            if (e.target) e.target.value = '';
          }}
          className="hidden"
          id={inputId}
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-helper text-muted-foreground hover:text-foreground flex-shrink-0"
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
      </div>
      {docs.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-end">
          {docs.map((doc, index) => (
            <div key={index} className="relative group">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={doc.fileName}
                className="flex flex-col items-center justify-center w-10 h-12 bg-muted rounded border border-border hover:border-slate-400 hover:bg-muted transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-8 text-center">
                  {doc.fileName.split('.').pop()?.toUpperCase()}
                </span>
              </a>
              <button
                type="button"
                onClick={() => onRemove(fieldName, index)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-white border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Format a byte count as KB / MB / GB.
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

// Splits help text on "(GPEDC Indicator X)", strips the parens, and renders the
// indicator portion in muted-foreground (gray) inline.
const renderHelp = (text: string): React.ReactNode => {
  const parts = text.split(/\((GPEDC Indicator [^)]+)\)/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="text-muted-foreground">{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
};

// Expandable "More info" panel: chevron toggle showing detailed help inline.
const QuestionExpand: React.FC<{ id: string }> = ({ id }) => {
  const [open, setOpen] = React.useState(false);
  const detail = EXPANDED_HELP[id];
  if (!detail) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-helper text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
        aria-controls={`${id}-help`}
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        <span>More info</span>
      </button>
      {open && (
        <p id={`${id}-help`} className="mt-1.5 text-helper leading-relaxed">
          {renderHelp(detail)}
        </p>
      )}
    </div>
  );
};

// Yes / No / Unsure checkbox field — only one can be ticked at a time;
// clicking the ticked option again clears the answer (null).
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
}> = ({ id, value, onValueChange, label, tooltip, description, documentUpload, document, uploadingDoc, onDocUpload, onDocRemove }) => {
  const toggle = (option: string) => (checked: boolean | "indeterminate") => {
    onValueChange(checked ? option : "");
  };
  const options: Array<{ key: string; label: string }> = [
    { key: "yes",    label: "Yes" },
    { key: "no",     label: "No" },
    { key: "unsure", label: "Unsure" },
  ];
  const qNum = QUESTION_NUMBER[id];
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <Label className="text-body font-medium leading-tight text-foreground flex gap-1.5">
          {qNum && <span className="w-7 shrink-0 tabular-nums">{qNum}.</span>}
          <span>{label}</span>
        </Label>
        {tooltip && (
          <p className="text-helper leading-relaxed">{renderHelp(tooltip)}</p>
        )}
        {description && (
          <p className="text-helper text-muted-foreground italic">{description}</p>
        )}
        <QuestionExpand id={id} />
      </div>
      <div className="flex items-center gap-5 shrink-0 pt-0.5">
        {options.map((opt) => {
          const optId = `${id}-${opt.key}`;
          return (
            <label
              key={opt.key}
              htmlFor={optId}
              className="flex items-center gap-2 text-body font-medium cursor-pointer"
            >
              <Checkbox
                id={optId}
                checked={value === opt.key}
                onCheckedChange={toggle(opt.key)}
                className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              {opt.label}
            </label>
          );
        })}
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
  );
};

// Dropdown field for hardcoded multi-option fields
const DropdownField: React.FC<{
  id: string;
  value?: string | null;
  onValueChange: (value: string) => void;
  label: string;
  tooltip?: string;
  options: { label: string; description?: string }[];
}> = ({ id, value, onValueChange, label, tooltip, options }) => {
  const qNum = QUESTION_NUMBER[id];
  return (
  <div className="py-3">
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label className="text-body font-medium leading-tight text-foreground flex gap-1.5">
          {qNum && <span className="w-7 shrink-0 tabular-nums">{qNum}.</span>}
          <span>{label}</span>
        </Label>
        {tooltip && (
          <p className="text-helper leading-relaxed">{renderHelp(tooltip)}</p>
        )}
      </div>
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger className="max-w-md">
          {(() => {
            const idx = options.findIndex(o => o.label === value);
            if (idx === -1) return <SelectValue placeholder="Select an option..." />;
            return (
              <span className="flex items-center gap-2 truncate">
                <span className="text-xs font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
                  {idx + 1}
                </span>
                <span className="font-medium truncate">{options[idx].label}</span>
              </span>
            );
          })()}
        </SelectTrigger>
        <SelectContent>
          {options.map((option, idx) => (
            <SelectItem key={option.label} value={option.label} className="pl-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5 shrink-0">
                  {idx + 1}
                </span>
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-helper text-muted-foreground ml-2">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <QuestionExpand id={id} />
    </div>
  </div>
  );
};

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
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const options = [
    { value: "yes", label: "Yes", acronym: "" },
    ...aeOptions.map(opt => ({
      value: opt.label,
      label: opt.label,
      acronym: opt.acronym || "",
    })),
    { value: negativeOption, label: negativeOption, acronym: "" },
  ];

  const filteredOptions = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.acronym.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selectedOption = options.find(o => o.value === value);

  const qNum = QUESTION_NUMBER[id];
  return (
    <div className="py-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-body font-medium leading-tight text-foreground flex gap-1.5">
              {qNum && <span className="w-7 shrink-0 tabular-nums">{qNum}.</span>}
              <span>{label}</span>
            </Label>
            {tooltip && (
              <p className="text-helper leading-relaxed">{renderHelp(tooltip)}</p>
            )}
            {description && (
              <p className="text-helper text-muted-foreground italic">{description}</p>
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
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-full max-w-md items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {selectedOption ? (
                <span className="flex items-center gap-2 truncate">
                  {selectedOption.acronym && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedOption.acronym}</span>
                  )}
                  <span>{selectedOption.label}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Select an option...</span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search options..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full bg-transparent py-2 text-body outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-body text-muted-foreground">No options found.</div>
              ) : (
                filteredOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-body hover:bg-accent transition-colors",
                      value === option.value && "bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {option.acronym && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.acronym}</span>
                      )}
                      <span>{option.label}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        <QuestionExpand id={id} />
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
    <div className="border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white">
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
          <h4 className="font-semibold text-foreground text-body truncate">{fullName}</h4>
          {contact.position && (
            <p className="text-helper text-muted-foreground truncate">{contact.position}</p>
          )}
          {contact.organisationName && (
            <p className="text-helper text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {contact.organisationName}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-1.5">
        {contact.email && (
          <div className="flex items-center gap-2 text-helper">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="text-foreground hover:text-blue-600 truncate">
              {contact.email}
            </a>
          </div>
        )}
        {(contact.phone || contact.phoneNumber) && (
          <div className="flex items-center gap-2 text-helper">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground">
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
  const [docDragActive, setDocDragActive] = useState(false);
  const [isRenamingDoc, setIsRenamingDoc] = useState(false);
  const [renameDocValue, setRenameDocValue] = useState("");
  const [externalLinkInput, setExternalLinkInput] = useState("");
  const [externalLinkNameInput, setExternalLinkNameInput] = useState("");
  const [nationalPlanOptions, setNationalPlanOptions] = useState<AEOption[]>([]);
  const [rawNationalPlans, setRawNationalPlans] = useState<Array<{
    id: string;
    name: string;
    acronym?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    displayOrder?: number;
  }>>([]);
  const formDataRef = useRef(formData);
  const autosaveRef = useRef<NodeJS.Timeout>();

  // Keep ref updated
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Hydrate form when aidEffectiveness arrives asynchronously from the parent
  useEffect(() => {
    if (general?.aidEffectiveness && Object.keys(general.aidEffectiveness).length > 0) {
      setFormData(prev => ({ ...prev, ...general.aidEffectiveness }));
    }
  }, [general?.aidEffectiveness]);

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
          // Filter out plan-based categories — those now come from national_plans
          const planCategories = new Set([
            'includedInNationalPlan',
            'linkedToGovFramework',
            'capacityDevFromNationalPlan',
            'mutualAccountabilityFramework',
          ]);
          const filtered = (result.data || []).filter(
            (opt: AEOption) => !planCategories.has(opt.category)
          );
          setAeOptions(filtered);
        }
      } catch (error) {
        console.error('Error fetching AE options:', error);
      }
    };

    const fetchNationalPlans = async () => {
      try {
        const response = await apiFetch('/api/national-plans?activeOnly=true');
        if (response.ok) {
          const result = await response.json();
          if (result?.success && Array.isArray(result.data)) {
            // Same shape mapping as the Evaluation tab "Linked National Plans" loader
            const plans = result.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              acronym: p.acronym || null,
              startDate: p.startDate || p.start_date || null,
              endDate: p.endDate || p.end_date || null,
              displayOrder: p.displayOrder || p.display_order || 0,
            }));
            setRawNationalPlans(plans);
            // Convert national plans into AEOption format for legacy CountryDropdownField
            const planOptions: AEOption[] = plans.map((plan: any) => ({
              id: plan.id,
              category: 'includedInNationalPlan',
              label: plan.name,
              description: null,
              acronym: null,
              start_date: plan.startDate,
              start_date_precision: plan.startDate ? 'day' as const : null,
              end_date: plan.endDate,
              end_date_precision: plan.endDate ? 'day' as const : null,
              sort_order: plan.displayOrder,
              is_active: true,
            }));
            setNationalPlanOptions(planOptions);
          }
        }
      } catch (error) {
        console.error('Error fetching national plans:', error);
      }
    };

    fetchAEOptions();
    fetchNationalPlans();
  }, []);

  // Always mirror the activity's Reporting Organisation (Overview tab).
  // Source of truth is Overview — this tab only reflects the value.
  useEffect(() => {
    const reportingOrgId = general?.reportingOrgId || general?.createdByOrg || "";
    if (reportingOrgId && formData.implementingPartner !== reportingOrgId) {
      setFormData(prev => ({ ...prev, implementingPartner: reportingOrgId }));
    }
  }, [general?.reportingOrgId, general?.createdByOrg, formData.implementingPartner]);

  // Pre-populate Tied Aid Status from the activity's Default Tied Status
  // (set on Transactions > Defaults). Only fills if the user hasn't picked
  // a value here yet — they remain free to override.
  useEffect(() => {
    if (formData.tiedStatus) return;
    const iatiCode = general?.defaultTiedStatus;
    const mapped =
      iatiCode === '3' ? 'partially_tied' :
      iatiCode === '4' ? 'tied' :
      iatiCode === '5' ? 'untied' :
      '';
    if (mapped) {
      setFormData(prev => ({ ...prev, tiedStatus: mapped }));
    }
  }, [general?.defaultTiedStatus, formData.tiedStatus]);

  // Categories whose options come from national_plans instead of aid_effectiveness_options
  const planBasedCategories = useMemo(() => new Set([
    'includedInNationalPlan',
    'linkedToGovFramework',
    'capacityDevFromNationalPlan',
    'mutualAccountabilityFramework',
  ]), []);

  // Get options for a specific country-dropdown category
  const getOptionsForCategory = useCallback((category: string) => {
    if (planBasedCategories.has(category)) {
      return nationalPlanOptions;
    }
    return aeOptions.filter(opt => opt.category === category);
  }, [aeOptions, nationalPlanOptions, planBasedCategories]);

  // Calculate completion: number answered, total, and percentage
  const completion = useMemo(() => {
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
    const total = fields.length;
    return {
      answered: filled,
      total,
      percent: Math.round((filled / total) * 100),
    };
  }, [formData]);
  const completionPercentage = completion.percent;

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
        toast.error("Couldn\u2019t save your responses. Please try again.");
      }
    } catch (error) {
      console.error('Autosave error:', error);
      toast.error("Couldn\u2019t save your responses. Check your connection and try again.");
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
      toast.error("Save the activity first so evidence documents can be attached to it.");
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

      // Append to existing docs (backward compatible with old single-doc format)
      const existing = formData.documents?.[fieldName];
      const existingArray: Array<{ fileName: string; fileUrl: string; uploadedAt: string }> = existing
        ? Array.isArray(existing) ? existing : [existing]
        : [];
      const newDocuments = {
        ...formData.documents,
        [fieldName]: [...existingArray, {
          fileName: file.name,
          fileUrl: publicUrl,
          uploadedAt: new Date().toISOString(),
        }]
      };

      // Update local state
      const updatedFormData = { ...formData, documents: newDocuments };
      setFormData(updatedFormData);
      formDataRef.current = updatedFormData;

      // Force immediate save (don't wait for debounce)
      if (general.id) {
        const updatedGeneral = { ...general, aidEffectiveness: updatedFormData };
        onUpdate(updatedGeneral);

        await apiFetch(`/api/activities/${general.id}/general-info`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aidEffectiveness: updatedFormData,
            general_info: { aidEffectiveness: updatedFormData }
          })
        });
      }

      toast.success(`Evidence document uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocField(null);
    }
  };

  // Per-field evidence document remove (supports removing by index)
  const handleFieldDocumentRemove = (fieldName: string, index?: number) => {
    const newDocuments = { ...formData.documents };
    const existing = newDocuments[fieldName];

    if (index !== undefined && Array.isArray(existing)) {
      const filtered = existing.filter((_, i) => i !== index);
      newDocuments[fieldName] = filtered.length > 0 ? filtered : null;
    } else {
      newDocuments[fieldName] = null;
    }

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

      // Build a 3-line cell for the Reporting Organisation:
      //   "Name (Acronym)"
      //   "<uuid>"
      //   "<iati_org_id>"
      const reportingOrg = organizations.find(o => o.id === formData.implementingPartner);
      const reportingOrgValue = formData.implementingPartner
        ? [
            reportingOrg
              ? reportingOrg.acronym
                ? `${reportingOrg.name} (${reportingOrg.acronym})`
                : reportingOrg.name
              : '(unknown organisation)',
            formData.implementingPartner,
            reportingOrg?.iati_org_id || '(no IATI ID)',
          ].join('\n')
        : '';

      // Tri-state Yes/No/Unsure formatter (replaces the old yes-only formatValue)
      const formatYNU = (val?: string | null) => {
        if (val == null || val === '') return '';
        if (val === 'yes') return 'Yes';
        if (val === 'no') return 'No';
        if (val === 'unsure') return 'Unsure';
        return val;
      };
      // Resolve plan UUIDs into a "Name (Acronym) StartYear-EndYear\n…" string.
      const resolvePlanIds = (ids?: string[]): string => {
        if (!ids || ids.length === 0) return '';
        return ids
          .map(id => {
            const p = rawNationalPlans.find(rp => rp.id === id);
            if (!p) return id;
            const startYear = p.startDate ? String(p.startDate).slice(0, 4) : null;
            const endYear = p.endDate ? String(p.endDate).slice(0, 4) : null;
            const years = startYear && endYear ? ` ${startYear}-${endYear}` : startYear ? ` ${startYear}-` : endYear ? ` -${endYear}` : '';
            return p.acronym ? `${p.name} (${p.acronym})${years}` : `${p.name}${years}`;
          })
          .join('\n');
      };
      const tiedLabel =
        formData.tiedStatus === 'untied' ? 'Untied' :
        formData.tiedStatus === 'partially_tied' ? 'Partially tied' :
        formData.tiedStatus === 'tied' ? 'Tied' :
        '';
      const docInfo = formData.uploadedDocument
        ? [
            formData.uploadedDocument,
            formatFileSize(formData.uploadedDocumentSize),
            formData.uploadedDocumentAt
              ? `Uploaded ${new Date(formData.uploadedDocumentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
              : '',
            formData.uploadedDocumentBy ? `by ${formData.uploadedDocumentBy}` : '',
            formData.uploadedDocumentUrl || '',
          ].filter(Boolean).join('\n')
        : '';
      const externalLinksText = (() => {
        const raw = formData.externalDocumentLinks;
        const list: Array<{ url: string; name?: string }> = Array.isArray(raw)
          ? raw.map((item: any) => typeof item === 'string' ? { url: item } : { url: item?.url || '', name: item?.name }).filter(l => l.url)
          : [];
        const merged =
          list.length === 0 && formData.externalDocumentLink
            ? [{ url: formData.externalDocumentLink }]
            : list;
        return merged.map(l => (l.name ? `${l.name} — ${l.url}` : l.url)).join('\n');
      })();

      const exportData: Array<{ Section: string; '#': string; Field: string; Value: string; 'Responsible Ministry': string }> = [
        { Section: '1. Government Ownership',          '#': '',   Field: 'Reporting Organisation',                                                  Value: reportingOrgValue,                                          'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '1',  Field: 'Formally Approved by Government Before Implementation Began',             Value: formatYNU(formData.formallyApprovedByGov),                  'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '2',  Field: 'Included in National Development Plan or Sector Strategy',                Value: formatYNU(formData.includedInNationalPlan),                 'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '2.1',Field: 'Linked to National Development Plan or Sector Strategy',                  Value: resolvePlanIds(formData.includedInNationalPlanIds),         'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '3',  Field: 'Linked to Government Results Framework',                                  Value: formatYNU(formData.linkedToGovFramework),                   'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '4',  Field: 'Indicators Drawn from Government Monitoring Frameworks',                  Value: formatYNU(formData.indicatorsFromGov),                      'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '5',  Field: 'Monitored Through Government M&E Systems',                                Value: formatYNU(formData.indicatorsViaGovData),                   'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '6',  Field: 'Implemented by a National Public Institution',                            Value: formatYNU(formData.implementedByNationalInstitution),       'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '7',  Field: 'Government Entity Contractually Designated as Accountable Authority',     Value: formatYNU(formData.govEntityAccountable),                   'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '8',  Field: 'Supports Public Sector Capacity Strengthening',                           Value: formatYNU(formData.supportsPublicSector),                   'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '9',  Field: 'Capacity Development Based on Nationally Identified Capacity Plan',       Value: formatYNU(formData.capacityDevFromNationalPlan),            'Responsible Ministry': '' },
        { Section: '1. Government Ownership',          '#': '10', Field: 'Number of Outcome Indicators',                                            Value: formData.numOutcomeIndicators?.toString() || '',           'Responsible Ministry': '' },

        { Section: '2. Country Systems',               '#': '11', Field: 'Funds Disbursed via National Treasury',                                   Value: formatYNU(formData.fundsViaNationalTreasury),               'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '12', Field: 'Government Budget Execution System Used',                                 Value: formatYNU(formData.govBudgetSystem),                        'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '13', Field: 'Government Financial Reporting System Used',                              Value: formatYNU(formData.govFinReporting),                        'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '14', Field: 'Financial Reporting Integrated into National PFM',                        Value: formatYNU(formData.finReportingIntegratedPFM),              'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '15', Field: 'Government Audit Procedures Used',                                        Value: formatYNU(formData.govAudit),                               'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '16', Field: 'National Procurement Law and Systems Used',                               Value: formatYNU(formData.govProcurement),                         'Responsible Ministry': '' },
        { Section: '2. Country Systems',               '#': '',   Field: 'Why Government Systems Are Not Being Used',                               Value: formData.govSystemWhyNot || '',                             'Responsible Ministry': '' },

        { Section: '3. Predictability',                '#': '17', Field: 'Annual Disbursement Schedule Shared with Government',                     Value: formatYNU(formData.annualBudgetShared),                     'Responsible Ministry': '' },
        { Section: '3. Predictability',                '#': '18', Field: 'Forward Expenditure Plan (3+ Years) Shared',                              Value: formatYNU(formData.forwardPlanShared),                      'Responsible Ministry': '' },
        { Section: '3. Predictability',                '#': '19', Field: 'Multi-Year Financing Agreement Signed',                                   Value: formatYNU(formData.multiYearFinancingAgreement),            'Responsible Ministry': '' },
        { Section: '3. Predictability',                '#': '20', Field: 'Tied Aid Status',                                                         Value: tiedLabel,                                                   'Responsible Ministry': '' },

        { Section: '4. Transparency',                  '#': '21', Field: 'Annual Financial Reports Publicly Accessible',                            Value: formatYNU(formData.annualFinReportsPublic),                 'Responsible Ministry': '' },
        { Section: '4. Transparency',                  '#': '22', Field: 'Public Data Refreshed at Least Annually',                                 Value: formatYNU(formData.dataUpdatedPublicly),                    'Responsible Ministry': '' },
        { Section: '4. Transparency',                  '#': '23', Field: 'Final Evaluation Planned and Funded',                                     Value: formatYNU(formData.finalEvalPlanned),                       'Responsible Ministry': '' },
        { Section: '4. Transparency',                  '#': '24', Field: 'Evaluation Report Publicly Available (Once Completed)',                   Value: formatYNU(formData.evalReportPublic),                       'Responsible Ministry': '' },
        { Section: '4. Transparency',                  '#': '25', Field: 'Performance Indicators Reported Annually',                                Value: formatYNU(formData.performanceIndicatorsReported),          'Responsible Ministry': '' },

        { Section: '5. Mutual Accountability',         '#': '26', Field: 'Joint Annual Review Conducted',                                           Value: formatYNU(formData.jointAnnualReview),                      'Responsible Ministry': '' },
        { Section: '5. Mutual Accountability',         '#': '27', Field: 'Activity Assessed Under a Formal Country-Level Mutual Accountability Framework', Value: formatYNU(formData.mutualAccountabilityFramework),    'Responsible Ministry': '' },
        { Section: '5. Mutual Accountability',         '#': '28', Field: 'Corrective Actions Documented When Targets Are Missed',                   Value: formatYNU(formData.correctiveActionsDocumented),            'Responsible Ministry': '' },

        { Section: '6. Civil Society & Private Sector','#': '29', Field: 'Level of Civil Society Consultation During Design Phase',                 Value: formData.civilSocietyConsulted || '',                       'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector','#': '30', Field: 'Civil Society Involvement in Implementation or Governance',               Value: formData.csoInvolvedInImplementation || '',                 'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector','#': '31', Field: 'Type of Funding Provided to Civil Society Organisations',                 Value: formData.coreFlexibleFundingToCSO || '',                    'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector','#': '32', Field: 'Public–Private Dialogue Mechanisms Included',                             Value: formatYNU(formData.publicPrivateDialogue),                  'Responsible Ministry': '' },
        { Section: '6. Civil Society & Private Sector','#': '33', Field: 'Level of Private Sector Engagement in Governance or Oversight',           Value: formData.privateSectorEngaged || '',                        'Responsible Ministry': '' },

        { Section: '7. Gender Equality',               '#': '34', Field: 'Gender Equality Objectives Integrated into Activity Framework',           Value: formData.genderObjectivesIntegrated || '',                  'Responsible Ministry': '' },
        { Section: '7. Gender Equality',               '#': '35', Field: 'Dedicated Budget Allocation for Gender Equality Outcomes',                Value: formatYNU(formData.genderBudgetAllocation),                 'Responsible Ministry': '' },
        { Section: '7. Gender Equality',               '#': '36', Field: 'Gender-Disaggregated Indicators Included',                                Value: formatYNU(formData.genderDisaggregatedIndicators),          'Responsible Ministry': '' },
      ];

      if (formData.contacts && formData.contacts.length > 0) {
        formData.contacts.forEach((contact, index) => {
          exportData.push({
            Section: '8. Contacts',
            '#': '',
            Field: `Contact ${index + 1}`,
            Value: `${contact.firstName} ${contact.lastName}${contact.email ? ` (${contact.email})` : ''}`,
            'Responsible Ministry': '',
          });
        });
      }

      exportData.push(
        { Section: '9. Documents', '#': '', Field: 'Supporting Document', Value: docInfo, 'Responsible Ministry': '' },
        { Section: '9. Documents', '#': '', Field: 'External Document Links', Value: externalLinksText, 'Responsible Ministry': '' },
        { Section: '10. Remarks',  '#': '', Field: 'Additional Notes', Value: formData.remarks || '', 'Responsible Ministry': '' },
      );

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aid Effectiveness');
      // Columns: Section | # | Field | Value | Responsible Ministry
      ws['!cols'] = [{ wch: 32 }, { wch: 5 }, { wch: 60 }, { wch: 60 }, { wch: 40 }];
      // Enable wrap-text on the Value column ("D") so multi-line entries
      // (Reporting Organisation, Linked plans, document metadata, links) render
      // as separate lines.
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 3 });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), alignment: { ...(cell.s?.alignment || {}), wrapText: true, vertical: 'top' } };
      }
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
      toast.error("Save the activity first so evidence documents can be attached to it.");
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
      updateField('uploadedDocumentSize', file.size);
      updateField('uploadedDocumentAt', new Date().toISOString());
      updateField('uploadedDocumentBy', user?.name || user?.email || '');
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

  // List of country systems answered "no" — drives the conditional explainer
  // text below so the label and helper reflect exactly what's been declined.
  const unusedSystems = ([
    [formData.fundsViaNationalTreasury,    'national treasury'],
    [formData.govBudgetSystem,             'government budget execution'],
    [formData.govFinReporting,             'government financial reporting'],
    [formData.finReportingIntegratedPFM,   'PFM-integrated financial reporting'],
    [formData.govAudit,                    'national audit'],
    [formData.govProcurement,              'national procurement'],
  ] as const)
    .filter(([v]) => v === 'no')
    .map(([, name]) => name);
  const anyGovSystemNo = unusedSystems.length > 0;
  const formatList = (items: readonly string[]): string => {
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  };
  const govWhyNotLabel = anyGovSystemNo
    ? unusedSystems.length === 1
      ? `Please explain why the ${unusedSystems[0]} system is not being used`
      : `Please explain why the ${formatList(unusedSystems)} systems are not being used`
    : '';
  const govWhyNotTooltip = anyGovSystemNo
    ? `Briefly describe why ${formatList(unusedSystems)} ${
        unusedSystems.length === 1 ? 'is' : 'are'
      } bypassed for this activity — e.g., donor procurement rules, fiduciary risk findings, sector-specific donor frameworks, or capacity constraints in the relevant institution.`
    : TOOLTIPS.govSystemWhyNot;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header with GPEDC banner */}
      <div
        className="border-b px-6 py-5 bg-cover bg-center bg-no-repeat relative overflow-hidden rounded-t-lg"
        style={{ backgroundImage: 'url(https://www.effectivecooperation.org/sites/default/files/imported/images/Colors_GPEDC.png)' }}
      >
        <div className="absolute inset-0 bg-foreground/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Aid Effectiveness</h2>
              <p className="text-helper font-bold text-white/70">GPEDC Monitoring Framework</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-helper text-white/80">
                {completion.answered} of {completion.total} questions answered
              </span>
              <div className="flex items-center gap-2">
                <Progress value={completionPercentage} className="w-24 h-2 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                <span className="text-body font-bold text-white">{completionPercentage}%</span>
              </div>
            </div>
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-helper text-white/70">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <CheckCircle className="h-3.5 w-3.5 text-white" aria-label="Saved" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* ====== Section 1: Government Ownership & Strategic Alignment ====== */}
        <div className="space-y-4">
          <div className="lg:w-2/3 space-y-2">
            <Label className="text-body font-medium text-foreground flex items-center gap-2">
              Reporting Organisation
              <HelpTextTooltip content={TOOLTIPS.implementingPartner}>
                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </HelpTextTooltip>
            </Label>
            <OrganizationCombobox
              organizations={organizations}
              value={formData.implementingPartner}
              onValueChange={(value) => updateField('implementingPartner', value)}
              placeholder="Set on the Overview tab"
              disabled
            />
          </div>

          <div className="flex items-center gap-2 pb-2 border-b">
            <h3 className="font-semibold text-foreground">Government Ownership & Strategic Alignment</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicator 1</Badge>
          </div>

          <div className="space-y-0">
            <RadioButtonField
              id="formallyApprovedByGov"
              value={formData.formallyApprovedByGov}
              onValueChange={(value) => updateField('formallyApprovedByGov', value)}
              label="Formally Approved by Government Before Implementation Began"
              tooltip={TOOLTIPS.formallyApprovedByGov}
            />
            <RadioButtonField
              id="includedInNationalPlan"
              value={formData.includedInNationalPlan}
              onValueChange={(value) => {
                updateField('includedInNationalPlan', value);
                // Clear linked plans when answer is no longer "yes"
                if (value !== 'yes') updateField('includedInNationalPlanIds', []);
              }}
              label="Included in National Development Plan or Sector Strategy"
              tooltip={TOOLTIPS.includedInNationalPlan}
            />
            {formData.includedInNationalPlan === 'yes' && (
              <div className="mt-2 mb-3 ml-6">
                <label className="text-body font-medium text-foreground flex gap-1.5 mb-1">
                  <span className="w-9 shrink-0 tabular-nums">2.1</span>
                  <span>Linked to National Development Plan or Sector Strategy</span>
                </label>
                <p className="text-body text-muted-foreground mb-2">
                  Select the national plans, sector strategies, or thematic strategies this activity contributes to.
                </p>
                <EnhancedMultiSelect
                  showCode={false}
                  groups={[
                    {
                      label: "Active plans & strategies",
                      options: rawNationalPlans.map((p) => {
                        const startYear = p.startDate ? String(p.startDate).slice(0, 4) : null;
                        const endYear = p.endDate ? String(p.endDate).slice(0, 4) : null;
                        const years =
                          startYear && endYear
                            ? ` ${startYear}-${endYear}`
                            : startYear
                              ? ` ${startYear}-`
                              : endYear
                                ? ` -${endYear}`
                                : "";
                        const base = p.acronym ? `${p.name} (${p.acronym})` : p.name;
                        return {
                          code: p.id,
                          displayCode: p.acronym || undefined,
                          name: `${base}${years}`,
                        };
                      }),
                    },
                  ]}
                  value={formData.includedInNationalPlanIds || []}
                  onValueChange={(next) => updateField('includedInNationalPlanIds', next)}
                  placeholder={
                    rawNationalPlans.length === 0
                      ? "No active national plans configured"
                      : "Select national plans & strategies…"
                  }
                  searchPlaceholder="Search plans & strategies…"
                  disabled={rawNationalPlans.length === 0}
                />
              </div>
            )}
            <RadioButtonField
              id="linkedToGovFramework"
              value={formData.linkedToGovFramework}
              onValueChange={(value) => updateField('linkedToGovFramework', value)}
              label="Linked to Government Results Framework"
              tooltip={TOOLTIPS.linkedToGovFramework}
            />
            <RadioButtonField
              id="indicatorsFromGov"
              value={formData.indicatorsFromGov}
              onValueChange={(value) => updateField('indicatorsFromGov', value)}
              label="Indicators Drawn from Government Monitoring Frameworks"
              tooltip={TOOLTIPS.indicatorsFromGov}
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
            <RadioButtonField
              id="capacityDevFromNationalPlan"
              value={formData.capacityDevFromNationalPlan}
              onValueChange={(value) => updateField('capacityDevFromNationalPlan', value)}
              label="Capacity Development Based on Nationally Identified Capacity Plan"
              tooltip={TOOLTIPS.capacityDevFromNationalPlan}
            />
          </div>

          <div className="space-y-2">
            <FieldWithDescription description={TOOLTIPS.numOutcomeIndicators}>
              <Label className="text-body font-medium text-foreground flex gap-1.5">
                <span className="w-7 shrink-0 tabular-nums">10.</span>
                <span>Number of Outcome Indicators</span>
              </Label>
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
            <h3 className="font-semibold text-foreground">Use of Country Public Financial & Procurement Systems</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicator 5a</Badge>
          </div>

          <div className="space-y-0">
            <RadioButtonField
              id="fundsViaNationalTreasury"
              value={formData.fundsViaNationalTreasury}
              onValueChange={(value) => updateField('fundsViaNationalTreasury', value)}
              label="Funds Disbursed Through National Treasury System"
              tooltip={TOOLTIPS.fundsViaNationalTreasury}
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
            <div className="space-y-2">
              <Label className="text-body font-medium text-foreground flex items-center gap-2">
                {govWhyNotLabel}
                <HelpTextTooltip content={govWhyNotTooltip}>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </HelpTextTooltip>
              </Label>
              <Textarea
                value={formData.govSystemWhyNot || ""}
                onChange={(e) => updateField('govSystemWhyNot', e.target.value)}
                placeholder="E.g., capacity constraints, donor requirements, legal restrictions..."
                rows={3}
              />
            </div>
          )}
        </div>

        {/* ====== Section 3: Predictability & Aid Characteristics ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <h3 className="font-semibold text-foreground">Predictability & Aid Characteristics</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicators 5b, 6, 10</Badge>
          </div>

          <div className="space-y-0">
            <RadioButtonField
              id="annualBudgetShared"
              value={formData.annualBudgetShared}
              onValueChange={(value) => updateField('annualBudgetShared', value)}
              label="Annual Budget Shared with Government in Advance of Fiscal Year"
              tooltip={TOOLTIPS.annualBudgetShared}
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
              <Label className="text-body font-medium text-foreground flex gap-1.5">
                <span className="w-7 shrink-0 tabular-nums">20.</span>
                <span>Tied Aid Status</span>
              </Label>
            </FieldWithDescription>
            <TiedStatusSelect
              id="aid-eff-tied-status"
              value={
                formData.tiedStatus === 'untied'         ? '5' :
                formData.tiedStatus === 'partially_tied' ? '3' :
                formData.tiedStatus === 'tied'           ? '4' :
                ''
              }
              onValueChange={(code) => {
                const mapped =
                  code === '5' ? 'untied' :
                  code === '3' ? 'partially_tied' :
                  code === '4' ? 'tied' :
                  '';
                updateField('tiedStatus', mapped);
              }}
              placeholder="Select tied status..."
            />
          </div>
        </div>

        {/* ====== Section 4: Transparency & Timely Reporting ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <h3 className="font-semibold text-foreground">Transparency & Timely Reporting</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicator 4</Badge>
          </div>

          <div className="space-y-0">
            <RadioButtonField
              id="annualFinReportsPublic"
              value={formData.annualFinReportsPublic}
              onValueChange={(value) => updateField('annualFinReportsPublic', value)}
              label="Annual Financial Reports Publicly Accessible"
              tooltip={TOOLTIPS.annualFinReportsPublic}
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
        </div>

        {/* ====== Section 5: Mutual Accountability ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <h3 className="font-semibold text-foreground">Mutual Accountability</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicator 7</Badge>
          </div>

          <div className="space-y-0">
            <RadioButtonField
              id="jointAnnualReview"
              value={formData.jointAnnualReview}
              onValueChange={(value) => updateField('jointAnnualReview', value)}
              label="Joint Annual Review Conducted with Government and Development Partners"
              tooltip={TOOLTIPS.jointAnnualReview}
            />
            <RadioButtonField
              id="mutualAccountabilityFramework"
              value={formData.mutualAccountabilityFramework}
              onValueChange={(value) => updateField('mutualAccountabilityFramework', value)}
              label="Activity Assessed Under a Formal Country-Level Mutual Accountability Framework"
              tooltip={TOOLTIPS.mutualAccountabilityFramework}
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
            <h3 className="font-semibold text-foreground">Civil Society & Private Sector Engagement</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicators 2 & 3</Badge>
          </div>

          <div className="space-y-0">
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
            <h3 className="font-semibold text-foreground">Gender Equality & Inclusion</h3>
            <Badge variant="outline" className="text-helper text-[#F37021] border-[#F37021]/30">GPEDC Indicator 8</Badge>
          </div>

          <div className="space-y-0">
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
            <h3 className="font-semibold text-foreground">Contacts</h3>
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
                    <Label className="text-helper text-muted-foreground">First Name <RequiredDot /></Label>
                    <Input
                      value={formData.editingContact.firstName || ""}
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, firstName: e.target.value })}
                      placeholder="First name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-helper text-muted-foreground">Last Name <RequiredDot /></Label>
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
                    <Label className="text-helper text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={formData.editingContact.email || ""}
                      onChange={(e) => updateField('editingContact', { ...formData.editingContact, email: e.target.value })}
                      placeholder="email@example.com"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-helper text-muted-foreground">Phone</Label>
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
                  <Label className="text-helper text-muted-foreground">Organisation</Label>
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
            <h3 className="font-semibold text-foreground">Supporting Documentation</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-body font-medium text-foreground">Upload Supporting Document</Label>
              <div className="space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isUploading && document.getElementById('doc-upload')?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
                      e.preventDefault();
                      document.getElementById('doc-upload')?.click();
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    docDragActive
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-slate-400",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isUploading) setDocDragActive(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isUploading) setDocDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDocDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDocDragActive(false);
                    if (isUploading) return;
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
                    const lower = file.name.toLowerCase();
                    if (!allowed.some((ext) => lower.endsWith(ext))) {
                      toast.error('Unsupported file type. Use PDF, Word, or Excel.');
                      return;
                    }
                    handleDocumentUpload(file);
                  }}
                >
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(file);
                      if (e.target) e.target.value = '';
                    }}
                    className="hidden"
                    id="doc-upload"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-body text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      {docDragActive ? (
                        <p className="text-body font-medium text-primary">Drop files here</p>
                      ) : (
                        <>
                          <p className="text-body font-medium text-foreground">
                            Drag &amp; drop files here, or click to browse
                          </p>
                          <p className="text-helper text-muted-foreground">
                            PDF, Word, Excel up to 10.0 MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {formData.uploadedDocument && (
                  <div className="relative w-full overflow-x-auto overflow-y-visible">
                    <table className="w-full caption-bottom text-body border border-border rounded-lg">
                      <thead className="bg-surface-muted">
                        <tr>
                          <th className="w-8 p-2" />
                          <th className="text-left p-2 font-medium text-helper">File name</th>
                          <th className="text-right p-2 font-medium text-helper w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr className="hover:bg-muted/50 group">
                          <td className="p-2 align-top">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </td>
                          <td className="p-2 align-top">
                            {isRenamingDoc ? (
                              <input
                                autoFocus
                                value={renameDocValue}
                                onChange={(e) => setRenameDocValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const next = renameDocValue.trim();
                                    if (next) updateField('uploadedDocument', next);
                                    setIsRenamingDoc(false);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setIsRenamingDoc(false);
                                  }
                                }}
                                onBlur={() => {
                                  const next = renameDocValue.trim();
                                  if (next) updateField('uploadedDocument', next);
                                  setIsRenamingDoc(false);
                                }}
                                className="w-full px-2 py-1 text-body font-medium border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            ) : (
                              <div className="min-w-0">
                                <span
                                  className="text-body font-medium truncate block cursor-text"
                                  onDoubleClick={() => {
                                    setRenameDocValue(formData.uploadedDocument || "");
                                    setIsRenamingDoc(true);
                                  }}
                                  title="Double-click to rename"
                                >
                                  {formData.uploadedDocument}
                                </span>
                                <span className="text-helper text-muted-foreground block">
                                  {formatFileSize(formData.uploadedDocumentSize)}
                                  {formData.uploadedDocumentAt && (
                                    <>
                                      {formData.uploadedDocumentSize ? " · " : ""}
                                      Uploaded{" "}
                                      {new Date(formData.uploadedDocumentAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </>
                                  )}
                                  {formData.uploadedDocumentBy && (
                                    <> by {formData.uploadedDocumentBy}</>
                                  )}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-2 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isRenamingDoc && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameDocValue(formData.uploadedDocument || "");
                                    setIsRenamingDoc(true);
                                  }}
                                  title="Rename"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {formData.uploadedDocumentUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(formData.uploadedDocumentUrl, "_blank");
                                  }}
                                  title="Open"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateField('uploadedDocument', undefined);
                                  updateField('uploadedDocumentUrl', undefined);
                                  updateField('uploadedDocumentSize', undefined);
                                  updateField('uploadedDocumentAt', undefined);
                                  updateField('uploadedDocumentBy', undefined);
                                }}
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 w-full">
              <Label className="text-body font-medium text-foreground">External Document Links</Label>
              {(() => {
                // Normalise legacy formats: string OR string[] -> {url, name?}[]
                const raw = formData.externalDocumentLinks;
                const normalised: Array<{ url: string; name?: string }> = Array.isArray(raw)
                  ? raw.map((item: any) =>
                      typeof item === 'string' ? { url: item } : { url: item?.url || '', name: item?.name }
                    ).filter(l => l.url)
                  : [];
                const links =
                  normalised.length === 0 && formData.externalDocumentLink
                    ? [{ url: formData.externalDocumentLink }]
                    : normalised;

                const addLink = () => {
                  const url = externalLinkInput.trim();
                  if (!url) return;
                  if (links.some(l => l.url === url)) {
                    toast.error('That link is already added.');
                    return;
                  }
                  const next = [...links, { url, name: externalLinkNameInput.trim() || undefined }];
                  updateField('externalDocumentLinks', next);
                  updateField('externalDocumentLink', url);
                  setExternalLinkInput("");
                  setExternalLinkNameInput("");
                };
                const removeLink = (idx: number) => {
                  const next = links.filter((_, i) => i !== idx);
                  updateField('externalDocumentLinks', next);
                  updateField('externalDocumentLink', next[next.length - 1]?.url || "");
                };

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 w-full">
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="url"
                          value={externalLinkInput}
                          onChange={(e) => setExternalLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addLink(); }
                          }}
                          placeholder="https://..."
                          className="w-full pl-10"
                        />
                      </div>
                      <Input
                        type="text"
                        value={externalLinkNameInput}
                        onChange={(e) => setExternalLinkNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addLink(); }
                        }}
                        placeholder="Name or context (optional)"
                        className="w-full"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLink}
                        disabled={!externalLinkInput.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add link
                      </Button>
                    </div>
                    {links.length > 0 && (
                      <ul className="space-y-1 border border-border rounded-lg divide-y">
                        {links.map((link, idx) => (
                          <li key={`${link.url}-${idx}`} className="flex items-center gap-2 px-3 py-2">
                            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              {link.name && (
                                <span className="truncate block text-body font-medium text-foreground">
                                  {link.name}
                                </span>
                              )}
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate block text-helper text-muted-foreground no-underline hover:no-underline"
                              >
                                {link.url}
                              </a>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeLink(idx)}
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

        {/* ====== Section 10: Remarks ====== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <h3 className="font-semibold text-foreground">Additional Remarks</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-body font-medium text-foreground flex items-center gap-2">
              Additional Notes
              <HelpTextTooltip content={TOOLTIPS.remarks}>
                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
              </HelpTextTooltip>
            </Label>
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
      <div className="border-t px-6 py-3 bg-muted flex items-center justify-between">
        <p className="text-helper text-muted-foreground">
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
