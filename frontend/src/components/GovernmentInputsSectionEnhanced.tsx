import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { EnhancedMultiSelect } from "@/components/ui/enhanced-multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, FileText, CheckCircle2, Circle, CircleSlash, Wallet, DollarSign, FileCheck, BarChart3, AlertTriangle, ShieldAlert, Loader2, RefreshCw, Lock, Unlock, CalendarRange, SplitSquareHorizontal, Trash2, Info, Package, Check, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { DocumentDropzone, UploadedDocument } from "@/components/ui/document-dropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api-fetch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { CurrencyValue } from "@/components/ui/currency-value";
import { convertToUSD } from "@/lib/currency-conversion-api";
import { ContributionModal } from "@/components/government/ContributionModal";
import {
  Contribution,
  getContributions,
  contributionAmountLocal,
  contributionAmountUSD,
  IN_KIND_CATEGORY_LABELS,
  OTHER_CATEGORY_LABELS,
} from "@/components/government/contribution-types";

// ─── Risk Assessment Types ──────────────────────────────────────────────────

interface RiskAnswer {
  score?: number;   // 1=Low, 2=Medium, 3=High
  unsure?: boolean; // true if the user explicitly marked the question as "Unsure"
}

interface RiskAssessment {
  [questionId: string]: RiskAnswer;
}

const RISK_CATEGORIES = [
  {
    id: "political",
    label: "Political Risk",
    icon: "🏛️",
    questions: [
      { id: "conflict_affected", text: "Is the activity located in a conflict-affected or fragile area?" },
      { id: "politically_sensitive", text: "Is the activity politically sensitive or subject to government change risk?" },
    ],
  },
  {
    id: "environmental",
    label: "Environmental Risk",
    icon: "🌿",
    questions: [
      { id: "environmental_impact", text: "Does the activity have significant environmental impact?" },
      { id: "land_acquisition", text: "Does the activity require land acquisition or change of land use?" },
    ],
  },
  {
    id: "social",
    label: "Social Risk",
    icon: "👥",
    questions: [
      { id: "resettlement", text: "Does the activity require involuntary resettlement of communities?" },
      { id: "vulnerable_populations", text: "Does the activity affect vulnerable or marginalized populations?" },
    ],
  },
  {
    id: "fiduciary",
    label: "Fiduciary Risk",
    icon: "💰",
    questions: [
      { id: "pfm_systems", text: "Are government public financial management (PFM) systems weak or untested?" },
      { id: "corruption_risk", text: "Is there elevated corruption or misuse-of-funds risk in this sector/region?" },
    ],
  },
  {
    id: "operational",
    label: "Operational Risk",
    icon: "⚙️",
    questions: [
      { id: "remote_access", text: "Is the activity in a remote or hard-to-reach area with access constraints?" },
      { id: "capacity_constraints", text: "Are there significant institutional or human capacity constraints?" },
    ],
  },
];

const RISK_LEVELS = [
  { value: 1, label: "Low", color: "text-[hsl(var(--success-text))] bg-[hsl(var(--success-bg))] border-[hsl(var(--success-border))]" },
  { value: 2, label: "Medium", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: 3, label: "High", color: "text-destructive bg-destructive/10 border-destructive/30" },
];

function getRiskLevel(score: number): { label: string; color: string; badgeClass: string } {
  if (score <= 1.5) return { label: "Low", color: "text-[hsl(var(--success-text))]", badgeClass: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))] border-[hsl(var(--success-border))]" };
  if (score <= 2.2) return { label: "Medium", color: "text-amber-700", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "High", color: "text-destructive", badgeClass: "bg-destructive/10 text-red-800 border-destructive/30" };
}

// ─── Government Inputs Types ────────────────────────────────────────────────

export type InKindItemType = 'staff' | 'facilities' | 'equipment' | 'services' | 'other';

export interface InKindItem {
  id: string;
  type: InKindItemType;
  description: string;
  estimatedValueLocal?: number;
  estimatedValueUSD?: number;
}

export interface OtherContribution {
  id: string;
  description: string;
}

const IN_KIND_TYPE_LABELS: Record<InKindItemType, string> = {
  staff: 'Staff Time',
  facilities: 'Facilities',
  equipment: 'Equipment',
  services: 'Services',
  other: 'Other',
};

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
    currency?: string;
    exchangeRate?: number;
    exchangeRateManual?: boolean;
    distributionMode?: 'lump_sum' | 'annual';
    totalAmountLocal?: number;
    totalAmountUSD?: number;
    valueDate?: string;
    annual?: Array<{
      year: number;
      amountLocal: number;
      amountUSD: number;
    }>;
    // Structured in-kind items (replaces legacy inKindContributions string)
    inKindItems?: InKindItem[];
    /** @deprecated use inKindItems */
    inKindContributions?: string;
    sourceOfFunding?: string;
    otherContributions?: OtherContribution[];
    /** New unified contributions list (supersedes annual / inKindItems / otherContributions). */
    contributions?: Contribution[];
  };

  riskAssessment?: RiskAssessment;

  evaluationResults?: {
    /**
     * "Yes" | "No" | "Unsure". Boolean values from older records are
     * normalised at render time for backward compatibility.
     */
    hasEvaluation?: boolean | "Yes" | "No" | "Unsure";
    evaluationDocument?: string;
    /**
     * Whether the activity is linked to a national plan or strategy.
     * Same YNU pattern as hasEvaluation.
     */
    inNationalFramework?: boolean | "Yes" | "No" | "Unsure";
    /** Legacy free-text reference — kept only for backward compatibility. */
    nationalIndicatorRef?: string;
    /** IDs of linked national plans / strategies from the `national_plans` table. */
    linkedNationalPlanIds?: string[];
  };

  // Legacy fields kept for backward compat (not displayed)
  nationalPlanAlignment?: any;
  technicalCoordination?: any;
  oversightAgreement?: any;
  geographicContext?: any;
  strategicConsiderations?: any;
}

export type GovernmentInputsSection =
  | 'budget-classification'
  | 'financial-contribution'
  | 'risk-assessment'
  | 'evaluation';

interface GovernmentInputsSectionProps {
  activityId: string;
  governmentInputs: GovernmentInputs;
  onChange: (inputs: GovernmentInputs) => void;
  plannedStartDate?: string;
  plannedEndDate?: string;
  readOnly?: boolean;
  section?: GovernmentInputsSection;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function getDimensionHelp(key: string): string {
  const helpTexts: Record<string, string> = {
    onPlan: "Reflected in government strategic planning documents or sector strategies",
    onBudget: "Included in the government budget documentation (national budget book)",
    onTreasury: "Funds are disbursed through the government's main Treasury system",
    onParliament: "Subject to parliamentary scrutiny (appropriated or reported in public financial statements)",
    onProcurement: "Uses national procurement systems and follows national procurement rules",
    onAudit: "Reported through the government's accounting system and audited by national audit systems",
  };
  return helpTexts[key] || "";
}

function getRiskCategoryImportance(categoryId: string): string {
  const importance: Record<string, string> = {
    political:
      "Political context — conflict, instability, or changes of government — can delay implementation, block approvals, or put staff and beneficiaries at risk. Capturing it lets teams sequence activities and build contingency plans.",
    environmental:
      "Activities with environmental impact may trigger safeguard policies, require environmental assessments, or attract community opposition. Early identification lets project teams incorporate mitigation and avoid costly redesigns.",
    social:
      "Activities affecting communities, indigenous groups, or vulnerable populations can cause unintended harm if not planned carefully. Assessing social risks informs safeguards, consultation processes, and grievance mechanisms.",
    fiduciary:
      "Weak public financial management or corruption risk threatens the proper use of funds. Identifying fiduciary exposure shapes disbursement modalities, audit arrangements, and oversight intensity.",
    operational:
      "Remote locations, weak institutions, or capacity gaps can stall delivery even when other risks are managed. Flagging operational constraints informs logistics, staffing, and realistic timelines.",
  };
  return importance[categoryId] || "";
}

function getRiskQuestionDetail(questionId: string): string {
  const details: Record<string, string> = {
    conflict_affected:
      "Select ‘High’ if the activity operates in areas with active conflict or recent armed violence. ‘Medium’ for post-conflict or fragile contexts still affected by tensions. ‘Low’ for generally stable areas.",
    politically_sensitive:
      "Select ‘High’ if the activity touches contested policy areas or is tied to a specific political faction. ‘Medium’ if a change of government could affect its continuation. ‘Low’ if policy-neutral and apolitical.",
    environmental_impact:
      "Select ‘High’ for large-scale infrastructure, extractive work, or emissions-intensive activities. ‘Medium’ for mid-scale works with a manageable footprint. ‘Low’ for studies, training, or policy work with minimal physical footprint.",
    land_acquisition:
      "Select ‘High’ if private land must be purchased, expropriated, or re-zoned. ‘Medium’ for partial or shared-use arrangements. ‘Low’ for activities using existing public land or no land at all.",
    resettlement:
      "Select ‘High’ for activities that will physically relocate households or disrupt livelihoods. ‘Medium’ for temporary economic displacement or voluntary relocation. ‘Low’ if residence and livelihoods are unaffected.",
    vulnerable_populations:
      "Select ‘High’ if the activity directly affects indigenous peoples, refugees, or other marginalised groups needing safeguards. ‘Medium’ if vulnerable groups are secondary stakeholders. ‘Low’ if primary beneficiaries are not in protected categories.",
    pfm_systems:
      "Select ‘High’ if national PFM systems score weak on PEFA or similar assessments. ‘Medium’ for systems under active reform with mixed performance. ‘Low’ for well-rated systems meeting international standards.",
    corruption_risk:
      "Select ‘High’ for sectors or regions with documented corruption concerns, including reports from anti-corruption agencies. ‘Medium’ for mixed track records. ‘Low’ for sectors with strong integrity frameworks and independent oversight.",
    remote_access:
      "Select ‘High’ for areas with no road access, security restrictions, or seasonal-only access. ‘Medium’ for areas reachable with logistical effort. ‘Low’ for urban or easily accessible locations.",
    capacity_constraints:
      "Select ‘High’ if implementing institutions lack the staff, systems, or experience to deliver. ‘Medium’ for partial capacity requiring technical assistance. ‘Low’ for well-resourced institutions with a track record of delivery.",
  };
  return details[questionId] || "";
}

function getDimensionDetail(key: string): string {
  const detailTexts: Record<string, string> = {
    onPlan:
      "Select ‘Yes’ if this activity appears by name or reference code in the country’s national development plan, sector strategy, or multi-year investment plan. Select ‘Partial’ where the sector is reflected but the specific activity is not named. Select ‘No’ if the activity falls outside current national planning instruments.",
    onBudget:
      "Select ‘Yes’ if the activity’s funds — whether contributed by the donor or the government — appear as a line item or identifiable reporting category in the formal national budget book approved by the legislature. ‘Partial’ applies where only a portion of the funds is reflected. ‘No’ means the funds are entirely off-budget.",
    onTreasury:
      "Select ‘Yes’ if activity funds flow through the government’s Treasury Single Account (TSA) or equivalent central treasury system, meaning the government executes payments. ‘Partial’ if some funds move through the TSA while others use parallel accounts. ‘No’ if all funds are disbursed directly by the donor to implementers.",
    onParliament:
      "Select ‘Yes’ if the activity is specifically appropriated by the national parliament and reported in the end-of-year financial statements submitted to parliament. ‘Partial’ where only the sector-level appropriation is visible or reporting is incomplete. ‘No’ if the activity sits entirely outside parliamentary appropriation and reporting.",
    onProcurement:
      "Select ‘Yes’ if goods, works, and services for the activity are procured through the country’s national procurement system, following national procurement laws, thresholds, and regulations. ‘Partial’ if a subset of procurement uses national systems. ‘No’ if all procurement is conducted using donor or agency procurement rules.",
    onAudit:
      "Select ‘Yes’ if activity expenditure is recorded in the government’s integrated financial management information system and audited by the Supreme Audit Institution under national audit standards. ‘Partial’ if only some financial flows are captured or audited by national systems. ‘No’ if accounting and audit are conducted entirely through donor or parallel systems.",
  };
  return detailTexts[key] || "";
}

function getStatusIcon(status: string | undefined) {
  switch (status) {
    case "Yes":
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    case "Partial":
      return <CircleSlash className="h-4 w-4 text-muted-foreground" />;
    case "No":
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function GovernmentInputsSectionEnhanced({
  activityId,
  governmentInputs,
  onChange,
  plannedStartDate,
  plannedEndDate,
  readOnly = false,
  section,
}: GovernmentInputsSectionProps) {
  // Migrate legacy inKindContributions string → inKindItems on first render
  useEffect(() => {
    const rgc = governmentInputs.rgcContribution;
    if (rgc?.inKindContributions && typeof rgc.inKindContributions === 'string' && !rgc.inKindItems?.length) {
      const migrated = { ...rgc };
      migrated.inKindItems = [{ id: crypto.randomUUID(), type: 'other' as InKindItemType, description: rgc.inKindContributions }];
      delete migrated.inKindContributions;
      onChange({ ...governmentInputs, rgcContribution: migrated });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (path: string, value: any) => {
    const keys = path.split(".");
    // Clone every object along the path so downstream `useMemo` / React
    // equality checks see fresh references and actually re-run.
    const newInputs: any = { ...governmentInputs };

    let current: any = newInputs;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const existing = current[key];
      current[key] =
        existing && typeof existing === "object" && !Array.isArray(existing)
          ? { ...existing }
          : existing && typeof existing === "object"
            ? [...existing]
            : {};
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    onChange(newInputs);
  };

  // ─── Contributions List + Modal State ──────────────────────────────────────
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);

  const contributions = getContributions(governmentInputs.rgcContribution);

  const saveContribution = (c: Contribution) => {
    const current = getContributions(governmentInputs.rgcContribution);
    const idx = current.findIndex(x => x.id === c.id);
    const next = idx >= 0
      ? [...current.slice(0, idx), c, ...current.slice(idx + 1)]
      : [...current, c];
    updateField('rgcContribution.contributions', next);
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmNoContributionOpen, setConfirmNoContributionOpen] = useState(false);

  const requestSelectNoContribution = () => {
    if (readOnly) return;
    // If user already has contributions recorded, confirm before clearing them.
    if (contributions.length > 0) {
      setConfirmNoContributionOpen(true);
      return;
    }
    updateField("rgcContribution.isProvided", false);
  };

  const confirmSelectNoContribution = () => {
    updateField("rgcContribution.contributions", []);
    updateField("rgcContribution.isProvided", false);
    setConfirmNoContributionOpen(false);
  };

  const requestDeleteContribution = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDeleteContribution = () => {
    if (!pendingDeleteId) return;
    const current = getContributions(governmentInputs.rgcContribution);
    const removed = current.find(c => c.id === pendingDeleteId);
    if (!removed) {
      setPendingDeleteId(null);
      return;
    }
    const removedIdx = current.findIndex(c => c.id === pendingDeleteId);
    const next = current.filter(c => c.id !== pendingDeleteId);
    updateField('rgcContribution.contributions', next);
    setPendingDeleteId(null);

    const label = removed.description?.trim() || 'Contribution';
    toast(`${label} deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          // Re-insert at its original position
          const currentAfter = getContributions(governmentInputs.rgcContribution);
          const restored = [...currentAfter];
          const insertAt = Math.min(removedIdx, restored.length);
          restored.splice(insertAt, 0, removed);
          updateField('rgcContribution.contributions', restored);
        },
      },
      duration: 6000,
    });
  };

  const openNewContribution = () => {
    setEditingContribution(null);
    setContribModalOpen(true);
  };

  const openEditContribution = (c: Contribution) => {
    setEditingContribution(c);
    setContribModalOpen(true);
  };

  // ─── Exchange Rate State & Logic ───────────────────────────────────────────
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const rgc = governmentInputs.rgcContribution;
  const currentCurrency = rgc?.currency;
  const currentValueDate = rgc?.valueDate;
  const currentExchangeRateManual = rgc?.exchangeRateManual;

  const fetchExchangeRate = useCallback(async () => {
    if (!currentCurrency || currentCurrency === 'USD') {
      updateField('rgcContribution.exchangeRate', 1);
      setRateError(null);
      return;
    }

    if (!currentValueDate) {
      setRateError('Please set a value date first');
      return;
    }

    setIsLoadingRate(true);
    setRateError(null);

    try {
      const result = await convertToUSD(1, currentCurrency, new Date(currentValueDate));
      if (result.success && result.exchange_rate) {
        updateField('rgcContribution.exchangeRate', result.exchange_rate);
        setRateError(null);
      } else {
        setRateError(result.error || 'Failed to fetch exchange rate');
      }
    } catch (err) {
      console.error('[GovContribution] Error fetching exchange rate:', err);
      setRateError('Failed to fetch exchange rate');
    } finally {
      setIsLoadingRate(false);
    }
  }, [currentCurrency, currentValueDate]);

  // Auto-fetch exchange rate when currency or date changes (only if not manual)
  useEffect(() => {
    if (!currentExchangeRateManual && currentCurrency && currentCurrency !== 'USD') {
      if (currentValueDate) {
        fetchExchangeRate();
      }
    } else if (currentCurrency === 'USD') {
      updateField('rgcContribution.exchangeRate', 1);
      setRateError(null);
    }
  }, [currentCurrency, currentValueDate, currentExchangeRateManual]);

  // Computed USD values
  const exchangeRate = rgc?.exchangeRate || null;
  const totalLocal = rgc?.totalAmountLocal || 0;
  const computedTotalUSD = totalLocal && exchangeRate
    ? Math.round(totalLocal * exchangeRate * 100) / 100
    : null;

  // ─── Year Generation & Distribution Helpers ────────────────────────────────

  const generateYearRows = useCallback(() => {
    if (!plannedStartDate || !plannedEndDate) return;
    const startYear = new Date(plannedStartDate).getFullYear();
    const endYear = new Date(plannedEndDate).getFullYear();
    if (isNaN(startYear) || isNaN(endYear) || endYear < startYear) return;

    const existingAnnual = rgc?.annual || [];
    const generated: Array<{ year: number; amountLocal: number; amountUSD: number }> = [];
    for (let y = startYear; y <= endYear; y++) {
      const existing = existingAnnual.find(r => r.year === y);
      generated.push(existing || { year: y, amountLocal: 0, amountUSD: 0 });
    }
    updateField('rgcContribution.annual', generated);
  }, [plannedStartDate, plannedEndDate, rgc?.annual]);

  const distributeEvenly = useCallback(() => {
    const rows = rgc?.annual;
    if (!rows || rows.length === 0 || !totalLocal) return;
    const rate = exchangeRate || 0;
    const perRow = Math.round(totalLocal / rows.length);
    let remaining = totalLocal;

    const updated = rows.map((row, idx) => {
      const isLast = idx === rows.length - 1;
      const amountLocal = isLast ? remaining : perRow;
      remaining -= perRow;
      return {
        ...row,
        amountLocal,
        amountUSD: rate ? Math.round(amountLocal * rate * 100) / 100 : 0,
      };
    });
    updateField('rgcContribution.annual', updated);
  }, [rgc?.annual, totalLocal, exchangeRate]);

  // Document state
  const [budgetDocs, setBudgetDocs] = useState<UploadedDocument[]>([]);
  const [evaluationDocs, setEvaluationDocs] = useState<UploadedDocument[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);

  // National plans / strategies (for the Evaluation → "linked national plans" selector).
  const [nationalPlans, setNationalPlans] = useState<
    Array<{
      id: string;
      name: string;
      acronym?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const fetchPlans = async () => {
      try {
        const response = await apiFetch("/api/national-plans?activeOnly=true");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.success && Array.isArray(data.data)) {
          setNationalPlans(
            data.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              acronym: p.acronym || null,
              startDate: p.startDate || p.start_date || null,
              endDate: p.endDate || p.end_date || null,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load national plans:", err);
      }
    };
    fetchPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activityId || docsLoaded) return;

    const fetchDocs = async () => {
      try {
        const response = await apiFetch(
          `/api/activities/${activityId}/government-input-documents`
        );
        if (response.ok) {
          const data = await response.json();
          const docs: UploadedDocument[] = data.documents || [];
          setBudgetDocs(docs.filter((d) => d.category === "budget-supporting"));
          setEvaluationDocs(docs.filter((d) => d.category === "evaluation"));
        }
      } catch (err) {
        console.error("Failed to load government input documents:", err);
      } finally {
        setDocsLoaded(true);
      }
    };

    fetchDocs();
  }, [activityId, docsLoaded]);

  // Which dimensions currently have their detailed explanation expanded.
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());
  const toggleDimensionDetail = (key: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Which risk questions currently have their detailed explanation expanded.
  const [expandedRiskQuestions, setExpandedRiskQuestions] = useState<Set<string>>(new Set());
  const toggleRiskQuestionDetail = (key: string) => {
    setExpandedRiskQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Risk Assessment "Clear all" confirmation.
  const [confirmClearRiskOpen, setConfirmClearRiskOpen] = useState(false);
  const clearAllRiskAnswers = () => {
    updateField("riskAssessment", {});
    setConfirmClearRiskOpen(false);
  };

  // Budget Classification "Clear all" confirmation.
  const [confirmClearBudgetOpen, setConfirmClearBudgetOpen] = useState(false);
  const clearAllBudgetClassification = () => {
    updateField("onBudgetClassification", {});
    setConfirmClearBudgetOpen(false);
  };

  // Evaluation "Clear all" confirmation.
  const [confirmClearEvalOpen, setConfirmClearEvalOpen] = useState(false);
  const clearAllEvaluation = () => {
    // Clear the Yes/No/Unsure answers and the indicator reference. Uploaded
    // evaluation documents are left alone — users can remove those
    // individually from the document table if they want to.
    updateField("evaluationResults", {});
    setConfirmClearEvalOpen(false);
  };

  // Budget classification completion
  const budgetDimensions = [
    { key: "onPlan",        label: "On Plan",              image: "/images/budget-class-on-plan.png",        metaphor: "The Rebar" },
    { key: "onBudget",      label: "On Budget",            image: "/images/budget-class-on-budget.png",      metaphor: "The Concrete Slab" },
    { key: "onTreasury",    label: "On Treasury",          image: "/images/budget-class-on-treasury.png",    metaphor: "The Conduit" },
    { key: "onParliament",  label: "On Parliament",        image: "/images/budget-class-on-parliament.png",  metaphor: "The Pillar" },
    { key: "onProcurement", label: "On Procurement",       image: "/images/budget-class-on-procurement.png", metaphor: "The Formwork" },
    { key: "onAudit",       label: "On Accounting/Audit",  image: "/images/budget-class-on-audit.png",       metaphor: "The Plumb Line" },
  ];

  const completedDimensions = budgetDimensions.filter((dim) => {
    const value =
      governmentInputs.onBudgetClassification?.[
        dim.key as keyof typeof governmentInputs.onBudgetClassification
      ];
    return typeof value === "string" && value.length > 0;
  }).length;

  const budgetProgress = (completedDimensions / budgetDimensions.length) * 100;

  // Risk assessment calculations
  const riskAssessment = governmentInputs.riskAssessment || {};

  const categoryScores = useMemo(() => {
    return RISK_CATEGORIES.map((cat) => {
      // A question is "answered" if it has a numeric score OR is marked Unsure.
      const answered = cat.questions.filter((q) => {
        const a = riskAssessment[q.id];
        return a && (a.score != null || a.unsure === true);
      });
      // Only numeric scores feed into the risk average — Unsure is excluded.
      const scored = cat.questions.filter((q) => riskAssessment[q.id]?.score != null);
      const avgScore = scored.length
        ? scored.reduce((acc, q) => acc + (riskAssessment[q.id]?.score || 0), 0) / scored.length
        : 0;
      return {
        ...cat,
        avgScore,
        answered: answered.length,
        total: cat.questions.length,
      };
    });
  }, [riskAssessment]);

  const overallRiskScore = useMemo(() => {
    const answeredCategories = categoryScores.filter((c) => c.answered > 0);
    if (answeredCategories.length === 0) return 0;
    return answeredCategories.reduce((acc, c) => acc + c.avgScore, 0) / answeredCategories.length;
  }, [categoryScores]);

  const totalAnswered = categoryScores.reduce((acc, c) => acc + c.answered, 0);
  const totalQuestions = categoryScores.reduce((acc, c) => acc + c.total, 0);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {readOnly && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-body text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>This section is view-only. Government staff and donor partners can edit these fields.</span>
          </div>
        )}
        {(!section || section === 'budget-classification') && (
          <div className="space-y-6">
            {/* Clear-all action, sits outside the card on the right */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={readOnly || completedDimensions === 0}
                onClick={() => setConfirmClearBudgetOpen(true)}
              >
                Clear all
              </Button>
            </div>

            {/* Budget Classification */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Budget Classification</CardTitle>
                    <CardDescription>
                      Assess how this activity aligns with government budget systems
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-body font-medium text-foreground">
                      {completedDimensions} of {budgetDimensions.length} completed
                    </div>
                    <Progress value={budgetProgress} className="w-24 h-2 mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {budgetDimensions.map((dimension) => {
                  const currentValue =
                    typeof governmentInputs.onBudgetClassification?.[
                      dimension.key as keyof typeof governmentInputs.onBudgetClassification
                    ] === "string"
                      ? (governmentInputs.onBudgetClassification[
                          dimension.key as keyof typeof governmentInputs.onBudgetClassification
                        ] as string)
                      : "";
                  const setValue = (next: string) =>
                    !readOnly &&
                    updateField(
                      `onBudgetClassification.${dimension.key}`,
                      currentValue === next ? "" : next
                    );
                  return (
                    <div key={dimension.key} className="flex items-start gap-4 py-4 border-t border-border first:border-t-0 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground">
                          {dimension.label}
                        </h4>
                        <p className="text-body text-muted-foreground mt-0.5">
                          {getDimensionHelp(dimension.key)}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleDimensionDetail(dimension.key)}
                          aria-expanded={expandedDimensions.has(dimension.key)}
                          aria-controls={`${dimension.key}-detail`}
                          className="mt-2 inline-flex items-center gap-1 text-helper text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              expandedDimensions.has(dimension.key) && "rotate-180"
                            )}
                          />
                          {expandedDimensions.has(dimension.key) ? "Hide details" : "Show details"}
                        </button>
                        {expandedDimensions.has(dimension.key) && (
                          <p
                            id={`${dimension.key}-detail`}
                            className="text-helper text-muted-foreground mt-2 leading-relaxed"
                          >
                            {getDimensionDetail(dimension.key)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-5 shrink-0 pt-0.5">
                        {(["Yes", "Partial", "No", "Unsure"] as const).map((opt) => {
                          const id = `${dimension.key}-${opt.toLowerCase()}`;
                          return (
                            <label
                              key={opt}
                              htmlFor={id}
                              className={cn(
                                "flex items-center gap-2 text-body font-medium",
                                readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                              )}
                            >
                              <Checkbox
                                id={id}
                                checked={currentValue === opt}
                                disabled={readOnly}
                                onCheckedChange={() => setValue(opt)}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Supporting Documents */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-medium text-foreground mb-1">Supporting Documents</h4>
                  <p className="text-body text-muted-foreground mb-3">
                    Upload documents that support your &quot;Yes&quot; or &quot;Partial&quot; classifications
                  </p>
                  <DocumentDropzone
                    activityId={activityId}
                    category="budget-supporting"
                    documents={budgetDocs}
                    onDocumentsChange={setBudgetDocs}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>

            <AlertDialog
              open={confirmClearBudgetOpen}
              onOpenChange={setConfirmClearBudgetOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all budget classification answers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your {completedDimensions} of {budgetDimensions.length} answered
                    {completedDimensions === 1 ? " dimension" : " dimensions"} (On Plan, On Budget, and the
                    rest). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllBudgetClassification}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {(!section || section === 'financial-contribution') && (
          <div className="space-y-6">
            {/* Government Financial Contribution */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Is Government Contributing */}
                <h4 className="font-medium text-foreground mb-3">
                  Does the government provide financial contribution?
                </h4>
                <div className="flex items-center gap-4">
                  {/* Yes Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (readOnly) return;
                      const wasProvided = governmentInputs.rgcContribution?.isProvided === true;
                      updateField("rgcContribution.isProvided", true);
                      // If the user is switching from No/undecided to Yes and has no
                      // contributions yet, open the Add Contribution modal automatically.
                      if (!wasProvided && contributions.length === 0) {
                        openNewContribution();
                      }
                    }}
                    disabled={readOnly}
                    aria-pressed={governmentInputs.rgcContribution?.isProvided === true}
                    className={cn(
                      "relative flex flex-col justify-end w-[220px] h-[220px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
                      governmentInputs.rgcContribution?.isProvided === true
                        ? "ring-border bg-primary/5"
                        : "ring-border bg-background hover:bg-muted",
                      readOnly && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Image
                      src="/images/government-contribution-yes.png"
                      alt="Yes, government contributes"
                      fill
                      className="object-contain object-top p-3 opacity-70 mix-blend-multiply"
                    />
                    {governmentInputs.rgcContribution?.isProvided === true && (
                      <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="relative z-10 p-3">
                      <h4 className="text-body font-semibold">Yes, government contributes</h4>
                      <p className="mt-1 text-helper text-muted-foreground">
                        Record co-financing amounts and details
                      </p>
                    </div>
                  </button>

                  {/* No Card */}
                  <button
                    type="button"
                    onClick={requestSelectNoContribution}
                    disabled={readOnly}
                    aria-pressed={governmentInputs.rgcContribution?.isProvided === false}
                    className={cn(
                      "relative flex flex-col justify-end w-[220px] h-[220px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden",
                      governmentInputs.rgcContribution?.isProvided === false
                        ? "ring-border bg-primary/5"
                        : "ring-border bg-background hover:bg-muted",
                      readOnly && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Image
                      src="/images/government-contribution-no.png"
                      alt="No contribution"
                      fill
                      className="object-contain object-top p-3 opacity-70 mix-blend-multiply"
                    />
                    {governmentInputs.rgcContribution?.isProvided === false && (
                      <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="relative z-10 p-3">
                      <h4 className="text-body font-semibold">No contribution</h4>
                      <p className="mt-1 text-helper text-muted-foreground">
                        Government is not co-financing this activity
                      </p>
                    </div>
                  </button>
                </div>

                {/* Contributions list (shown when government is contributing) */}
                {governmentInputs.rgcContribution?.isProvided && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">Government Contributions</h4>
                      {!readOnly && (
                        <Button size="sm" onClick={openNewContribution} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Add Contribution
                        </Button>
                      )}
                    </div>

                    {contributions.length === 0 ? (
                      <div className="p-6 border border-dashed rounded-lg text-center">
                        <p className="text-body text-muted-foreground">
                          {readOnly
                            ? 'No contributions recorded.'
                            : 'No contributions added yet. Click “Add Contribution” to record a cash, in-kind, or other contribution.'}
                        </p>
                      </div>
                    ) : (
                      <div className="relative w-full overflow-x-auto overflow-y-visible">
                        <table className="w-full caption-bottom text-body border border-border dark:border-gray-700 rounded-lg">
                          <thead className="bg-surface-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-helper w-28">Type</th>
                              <th className="text-left p-2 font-medium text-helper w-40">Category</th>
                              <th className="text-left p-2 font-medium text-helper">Description</th>
                              <th className="text-right p-2 font-medium text-helper w-40">Original Value</th>
                              <th className="text-right p-2 font-medium text-helper w-32">USD Value</th>
                              <th className="w-24" />
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {contributions.map((c) => {
                              const local = contributionAmountLocal(c);
                              const usd = contributionAmountUSD(c);
                              const categoryLabel =
                                c.type === 'financial' ? '—' :
                                c.type === 'in_kind' ? IN_KIND_CATEGORY_LABELS[c.category] :
                                OTHER_CATEGORY_LABELS[c.category];
                              return (
                                <tr key={c.id} className="hover:bg-muted/50">
                                  <td className="p-2 text-body align-top text-left">
                                    {c.type === 'financial' ? 'Financial' : c.type === 'in_kind' ? 'In-Kind' : 'Other'}
                                  </td>
                                  <td className="p-2 text-body align-top text-left">
                                    {categoryLabel === '—'
                                      ? <span className="text-muted-foreground">—</span>
                                      : categoryLabel}
                                  </td>
                                  <td className="p-2 align-top text-left">
                                    <div className="text-body">{c.description || <span className="text-muted-foreground">—</span>}</div>
                                    {c.type === 'financial' && c.sourceOfFunding && (
                                      <div className="text-helper text-muted-foreground mt-0.5">{c.sourceOfFunding}</div>
                                    )}
                                    {c.type === 'other' && c.legalReference && (
                                      <div className="text-helper text-muted-foreground mt-0.5">{c.legalReference}</div>
                                    )}
                                  </td>
                                  <td className="p-2 text-right tabular-nums">
                                    {local != null ? (
                                      <>
                                        {c.currency && (
                                          <span className="text-muted-foreground text-helper">{c.currency}</span>
                                        )}
                                        {c.currency ? ' ' : ''}
                                        {local.toLocaleString()}
                                      </>
                                    ) : '—'}
                                  </td>
                                  <td className="p-2 text-right tabular-nums">
                                    {usd != null ? <CurrencyValue amount={usd} variant="full" /> : '—'}
                                  </td>
                                  <td className="p-2 text-right">
                                    {!readOnly && (
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditContribution(c)}
                                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                          aria-label="Edit contribution"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => requestDeleteContribution(c.id)}
                                          className="text-destructive hover:text-destructive/80 transition-colors p-1"
                                          aria-label="Delete contribution"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-medium bg-muted/30">
                              <td className="p-2 text-helper" colSpan={4}>Total</td>
                              <td className="p-2 text-right tabular-nums">
                                <CurrencyValue
                                  amount={contributions.reduce((s, c) => s + (contributionAmountUSD(c) ?? 0), 0)}
                                  variant="full"
                                />
                              </td>
                              <td className="p-2" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <ContributionModal
                  open={contribModalOpen}
                  onOpenChange={setContribModalOpen}
                  initial={editingContribution}
                  defaultCurrency={governmentInputs.rgcContribution?.currency}
                  plannedStartDate={plannedStartDate}
                  plannedEndDate={plannedEndDate}
                  onSave={saveContribution}
                />

                <AlertDialog
                  open={!!pendingDeleteId}
                  onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete contribution?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the contribution from the list. You&rsquo;ll have a few seconds to undo the delete from the toast notification.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={confirmDeleteContribution}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog
                  open={confirmNoContributionOpen}
                  onOpenChange={setConfirmNoContributionOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove all contributions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You&rsquo;ve recorded {contributions.length} {contributions.length === 1 ? 'contribution' : 'contributions'} for this activity.
                        Selecting <strong>No contribution</strong> will permanently delete {contributions.length === 1 ? 'it' : 'all of them'} and mark the government as not co-financing this activity.
                        This action cannot be undone. Do you want to proceed?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={confirmSelectNoContribution}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, remove all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>


              </CardContent>
            </Card>
          </div>
        )}

        {(!section || section === 'risk-assessment') && (
          <div className="space-y-6">
            {/* Clear-all action, sits outside the card on the right */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={readOnly || totalAnswered === 0}
                onClick={() => setConfirmClearRiskOpen(true)}
              >
                Clear all
              </Button>
            </div>

            {/* Risk Questions — single card, same layout as Budget Classification */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Risk Assessment</CardTitle>
                    <CardDescription>
                      Rate each risk for this activity. Scores feed into the Risk Summary below.
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-body font-medium text-foreground">
                      {totalAnswered} of {totalQuestions} answered
                    </div>
                    <Progress
                      value={(totalAnswered / totalQuestions) * 100}
                      className="w-24 h-2 mt-1"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {RISK_CATEGORIES.map((category, catIdx) => {
                  const catAnswered = category.questions.filter((q) => {
                    const a = riskAssessment[q.id];
                    return a && (a.score != null || a.unsure === true);
                  }).length;
                  return (
                    <div
                      key={category.id}
                      className={cn(
                        catIdx > 0 && "pt-6 border-t border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-body font-semibold text-foreground">
                            {category.label}
                          </h3>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={`Why ${category.label} matters`}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm">
                              {getRiskCategoryImportance(category.id)}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-helper text-muted-foreground">
                          {catAnswered} of {category.questions.length} answered
                        </span>
                      </div>
                      <div className="space-y-0">
                        {category.questions.map((question, qIdx) => {
                          const answer = riskAssessment[question.id];
                          const currentScore = answer?.score;
                          const isUnsure = answer?.unsure === true;
                          const setScore = (next: number) =>
                            !readOnly &&
                            updateField(
                              `riskAssessment.${question.id}`,
                              currentScore === next && !isUnsure ? undefined : { score: next }
                            );
                          const toggleUnsure = () =>
                            !readOnly &&
                            updateField(
                              `riskAssessment.${question.id}`,
                              isUnsure ? undefined : { unsure: true }
                            );
                          return (
                            <div
                              key={question.id}
                              className="flex items-start gap-4 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-foreground">
                                  {question.text}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => toggleRiskQuestionDetail(question.id)}
                                  aria-expanded={expandedRiskQuestions.has(question.id)}
                                  aria-controls={`${question.id}-detail`}
                                  className="mt-1 inline-flex items-center gap-1 text-helper text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <ChevronDown
                                    className={cn(
                                      "h-3.5 w-3.5 transition-transform",
                                      expandedRiskQuestions.has(question.id) && "rotate-180"
                                    )}
                                  />
                                  {expandedRiskQuestions.has(question.id) ? "Hide details" : "Show details"}
                                </button>
                                {expandedRiskQuestions.has(question.id) && (
                                  <p
                                    id={`${question.id}-detail`}
                                    className="text-helper text-muted-foreground mt-1.5 leading-relaxed"
                                  >
                                    {getRiskQuestionDetail(question.id)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-5 shrink-0 pt-0.5">
                                {RISK_LEVELS.map((level) => {
                                  const id = `${question.id}-${level.value}`;
                                  const isChecked = !isUnsure && currentScore === level.value;
                                  return (
                                    <label
                                      key={level.value}
                                      htmlFor={id}
                                      className={cn(
                                        "flex items-center gap-2 text-body font-medium",
                                        readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                      )}
                                    >
                                      <Checkbox
                                        id={id}
                                        checked={isChecked}
                                        disabled={readOnly}
                                        onCheckedChange={() => setScore(level.value)}
                                      />
                                      {level.label}
                                    </label>
                                  );
                                })}
                                <label
                                  htmlFor={`${question.id}-unsure`}
                                  className={cn(
                                    "flex items-center gap-2 text-body font-medium",
                                    readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                  )}
                                >
                                  <Checkbox
                                    id={`${question.id}-unsure`}
                                    checked={isUnsure}
                                    disabled={readOnly}
                                    onCheckedChange={toggleUnsure}
                                  />
                                  Unsure
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Risk Summary — table, shown below the questions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Risk Summary</h3>
                {overallRiskScore > 0 && (
                  <span className="flex items-center gap-2 text-body font-medium text-foreground">
                    Overall:
                    <Badge
                      variant="outline"
                      className={cn("text-body px-3 py-1", getRiskLevel(overallRiskScore).badgeClass)}
                    >
                      {getRiskLevel(overallRiskScore).label} Risk
                    </Badge>
                  </span>
                )}
              </div>

              <div className="relative w-full overflow-x-auto overflow-y-visible">
                <table className="w-full caption-bottom text-body border border-border dark:border-gray-700 rounded-lg">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="text-left p-2 font-medium text-helper">Category</th>
                      <th className="text-right p-2 font-medium text-helper w-32">Answered</th>
                      <th className="text-right p-2 font-medium text-helper w-40">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categoryScores.map((cat) => {
                      const level = cat.avgScore > 0 ? getRiskLevel(cat.avgScore) : null;
                      return (
                        <tr key={cat.id} className="hover:bg-muted/50">
                          <td className="p-2 text-body">{cat.label}</td>
                          <td className="p-2 text-right tabular-nums text-body">
                            {cat.answered} / {cat.total}
                          </td>
                          <td className="p-2 text-right">
                            {level ? (
                              <Badge variant="outline" className={cn("text-helper", level.badgeClass)}>
                                {level.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-medium bg-muted/30">
                      <td className="p-2 text-helper">Overall</td>
                      <td className="p-2 text-right tabular-nums">
                        {totalAnswered} / {totalQuestions}
                      </td>
                      <td className="p-2 text-right">
                        {overallRiskScore > 0 ? (
                          <Badge
                            variant="outline"
                            className={cn("text-helper", getRiskLevel(overallRiskScore).badgeClass)}
                          >
                            {getRiskLevel(overallRiskScore).label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalAnswered === 0 && (
                <p className="text-body text-muted-foreground mt-3">
                  Answer the questions above to generate a risk profile for this activity.
                </p>
              )}
            </div>

            <AlertDialog
              open={confirmClearRiskOpen}
              onOpenChange={setConfirmClearRiskOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all risk answers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your {totalAnswered} of {totalQuestions} answered
                    {totalAnswered === 1 ? " response" : " responses"} across every category.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllRiskAnswers}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {(!section || section === 'evaluation') && (() => {
          const normalizeYNU = (v: unknown): "Yes" | "No" | "Unsure" | "" => {
            if (v === true) return "Yes";
            if (v === false) return "No";
            if (v === "Yes" || v === "No" || v === "Unsure") return v;
            return "";
          };
          const hasEvalValue = normalizeYNU(governmentInputs.evaluationResults?.hasEvaluation);
          const inFrameworkValue = normalizeYNU(governmentInputs.evaluationResults?.inNationalFramework);
          const evalQuestions: Array<{
            key: "hasEvaluation" | "inNationalFramework";
            label: string;
            help: string;
            value: "Yes" | "No" | "Unsure" | "";
            visible: boolean;
          }> = [
            {
              key: "hasEvaluation",
              label: "Has this activity been evaluated by government?",
              help: "An evaluation is any structured government-led assessment of the activity's relevance, effectiveness, efficiency, impact, or sustainability.",
              value: hasEvalValue,
              visible: true,
            },
            {
              key: "inNationalFramework",
              label: "Is this activity linked to a national plan or strategy?",
              help: "Links an activity to government-led national development plans, sector strategies, or thematic strategies managed by the administration.",
              value: inFrameworkValue,
              visible: hasEvalValue === "Yes",
            },
          ];
          const answeredCount = evalQuestions.filter((q) => q.visible && q.value !== "").length;
          const visibleCount = evalQuestions.filter((q) => q.visible).length;
          const hasAnyEvalData = Boolean(
            hasEvalValue ||
            inFrameworkValue ||
            (governmentInputs.evaluationResults?.nationalIndicatorRef || "").trim()
          );
          return (
            <div className="space-y-6">
              {/* Clear-all action, sits outside the card on the right */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly || !hasAnyEvalData}
                  onClick={() => setConfirmClearEvalOpen(true)}
                >
                  Clear all
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Evaluation & Results Framework</CardTitle>
                      <CardDescription>
                        Link this activity to government monitoring, evaluation, and results systems.
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-body font-medium text-foreground">
                        {answeredCount} of {visibleCount} answered
                      </div>
                      <Progress
                        value={visibleCount > 0 ? (answeredCount / visibleCount) * 100 : 0}
                        className="w-24 h-2 mt-1"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0">
                  {evalQuestions
                    .filter((q) => q.visible)
                    .map((q, qIdx) => {
                      const setValue = (next: "Yes" | "No" | "Unsure") =>
                        !readOnly &&
                        updateField(
                          `evaluationResults.${q.key}`,
                          q.value === next ? undefined : next
                        );
                      return (
                        <div
                          key={q.key}
                          className="flex items-start gap-4 py-4 border-t border-border first:border-t-0 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-foreground">{q.label}</h4>
                            <p className="text-body text-muted-foreground mt-0.5">{q.help}</p>
                          </div>
                          <div className="flex items-center gap-5 shrink-0 pt-0.5">
                            {(["Yes", "No", "Unsure"] as const).map((opt) => {
                              const id = `${q.key}-${opt.toLowerCase()}`;
                              return (
                                <label
                                  key={opt}
                                  htmlFor={id}
                                  className={cn(
                                    "flex items-center gap-2 text-body font-medium",
                                    readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                  )}
                                >
                                  <Checkbox
                                    id={id}
                                    checked={q.value === opt}
                                    disabled={readOnly}
                                    onCheckedChange={() => setValue(opt)}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                  {inFrameworkValue === "Yes" && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <label className="block text-body font-medium text-foreground mb-1">
                        Linked National Plans & Strategies
                      </label>
                      <p className="text-body text-muted-foreground mb-2">
                        Select the national plans, sector strategies, or thematic strategies this activity contributes to.
                      </p>
                      <EnhancedMultiSelect
                        showCode={false}
                        groups={[
                          {
                            label: "Active plans & strategies",
                            options: nationalPlans.map((p) => {
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
                                code: p.id, // internal value (UUID)
                                // Acronym shown in the code pill
                                displayCode: p.acronym || undefined,
                                // Main label: full name (+ acronym) + year range
                                name: `${base}${years}`,
                              };
                            }),
                          },
                        ]}
                        value={governmentInputs.evaluationResults?.linkedNationalPlanIds || []}
                        onValueChange={(next) =>
                          !readOnly &&
                          updateField("evaluationResults.linkedNationalPlanIds", next)
                        }
                        placeholder={
                          nationalPlans.length === 0
                            ? "No active national plans configured"
                            : "Select national plans & strategies…"
                        }
                        searchPlaceholder="Search plans & strategies…"
                        disabled={readOnly || nationalPlans.length === 0}
                      />
                    </div>
                  )}

                  {(hasEvalValue === "Yes" || evaluationDocs.length > 0) && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-medium text-foreground mb-1">Evaluation Documents</h4>
                      <p className="text-body text-muted-foreground mb-3">
                        Upload the government evaluation report(s).
                      </p>
                      <DocumentDropzone
                        activityId={activityId}
                        category="evaluation"
                        documents={evaluationDocs}
                        onDocumentsChange={(docs) => {
                          setEvaluationDocs(docs);
                          // If the user uploads an evaluation document but hasn't
                          // set "Has this activity been evaluated?" to Yes yet,
                          // infer it so the answer and the evidence stay in sync
                          // (and so the dropzone remains visible after refresh even
                          // before the parent Save is pressed).
                          if (docs.length > 0 && hasEvalValue !== "Yes" && !readOnly) {
                            updateField("evaluationResults.hasEvaluation", "Yes");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <AlertDialog
                open={confirmClearEvalOpen}
                onOpenChange={setConfirmClearEvalOpen}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all evaluation answers?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear the Yes / No / Unsure responses and the national indicator reference.
                      Any uploaded evaluation documents will be left in place — remove those from the document table if needed.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearAllEvaluation}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })()}
      </div>
    </TooltipProvider>
  );
}
