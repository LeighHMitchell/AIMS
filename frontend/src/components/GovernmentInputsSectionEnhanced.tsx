import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, FileText, CheckCircle2, Circle, CircleSlash, Wallet, DollarSign, FileCheck, BarChart3, AlertTriangle, ShieldAlert, Loader2, RefreshCw, Lock, Unlock, CalendarRange, SplitSquareHorizontal, Trash2, Info, Package } from "lucide-react";
import { toast } from "sonner";
import { DocumentDropzone, UploadedDocument } from "@/components/ui/document-dropzone";
import { apiFetch } from "@/lib/api-fetch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { convertToUSD } from "@/lib/currency-conversion-api";

// ─── Risk Assessment Types ──────────────────────────────────────────────────

interface RiskAnswer {
  score: number; // 1=Low, 2=Medium, 3=High
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
  };

  riskAssessment?: RiskAssessment;

  evaluationResults?: {
    hasEvaluation?: boolean;
    evaluationDocument?: string;
    inNationalFramework?: boolean;
    nationalIndicatorRef?: string;
  };

  // Legacy fields kept for backward compat (not displayed)
  nationalPlanAlignment?: any;
  technicalCoordination?: any;
  oversightAgreement?: any;
  geographicContext?: any;
  strategicConsiderations?: any;
}

interface GovernmentInputsSectionProps {
  activityId: string;
  governmentInputs: GovernmentInputs;
  onChange: (inputs: GovernmentInputs) => void;
  plannedStartDate?: string;
  plannedEndDate?: string;
  readOnly?: boolean;
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

  // Budget classification completion
  const budgetDimensions = [
    { key: "onPlan", label: "On Plan" },
    { key: "onBudget", label: "On Budget" },
    { key: "onTreasury", label: "On Treasury" },
    { key: "onParliament", label: "On Parliament" },
    { key: "onProcurement", label: "On Procurement" },
    { key: "onAudit", label: "On Accounting/Audit" },
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
      const answered = cat.questions.filter((q) => riskAssessment[q.id]?.score);
      if (answered.length === 0) return { ...cat, avgScore: 0, answered: 0, total: cat.questions.length };
      const sum = answered.reduce((acc, q) => acc + (riskAssessment[q.id]?.score || 0), 0);
      return { ...cat, avgScore: sum / answered.length, answered: answered.length, total: cat.questions.length };
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
        <Tabs defaultValue="budget-finance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="budget-finance" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget & Finance
            </TabsTrigger>
            <TabsTrigger value="risk-assessment" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Risk Assessment
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evaluation
            </TabsTrigger>
          </TabsList>

          {/* ──────────────── Budget & Finance Tab ──────────────── */}
          <TabsContent value="budget-finance" className="space-y-6 mt-6">
            {/* Budget Classification */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Budget Classification</CardTitle>
                      <CardDescription>
                        Assess how this activity aligns with government budget systems
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-body font-medium text-foreground">
                      {completedDimensions} of {budgetDimensions.length} completed
                    </div>
                    <Progress value={budgetProgress} className="w-24 h-2 mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgetDimensions.map((dimension) => (
                  <div key={dimension.key} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground">{dimension.label}</h4>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(
                          typeof governmentInputs.onBudgetClassification?.[
                            dimension.key as keyof typeof governmentInputs.onBudgetClassification
                          ] === "string"
                            ? (governmentInputs.onBudgetClassification[
                                dimension.key as keyof typeof governmentInputs.onBudgetClassification
                              ] as string)
                            : undefined
                        )}
                      </div>
                    </div>
                    <p className="text-body text-muted-foreground mb-3">
                      {getDimensionHelp(dimension.key)}
                    </p>

                    <RadioGroup
                      value={
                        typeof governmentInputs.onBudgetClassification?.[
                          dimension.key as keyof typeof governmentInputs.onBudgetClassification
                        ] === "string"
                          ? (governmentInputs.onBudgetClassification[
                              dimension.key as keyof typeof governmentInputs.onBudgetClassification
                            ] as string)
                          : ""
                      }
                      onValueChange={(value) =>
                        !readOnly && updateField(`onBudgetClassification.${dimension.key}`, value)
                      }
                      disabled={readOnly}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id={`${dimension.key}-yes`} />
                        <label htmlFor={`${dimension.key}-yes`} className="text-body font-medium cursor-pointer">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Partial" id={`${dimension.key}-partial`} />
                        <label htmlFor={`${dimension.key}-partial`} className="text-body font-medium cursor-pointer">
                          Partial
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id={`${dimension.key}-no`} />
                        <label htmlFor={`${dimension.key}-no`} className="text-body font-medium cursor-pointer">
                          No
                        </label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}

                {/* Supporting Documents */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium text-foreground">Supporting Documents</h4>
                    <span className="text-helper bg-muted px-2 py-1 rounded">Optional</span>
                  </div>
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

            {/* Government Financial Contribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
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
                  <h4 className="font-medium text-foreground mb-3">
                    Does the government provide financial contribution?
                  </h4>
                  <RadioGroup
                    value={governmentInputs.rgcContribution?.isProvided ? "yes" : "no"}
                    onValueChange={(value) =>
                      !readOnly && updateField("rgcContribution.isProvided", value === "yes")
                    }
                    disabled={readOnly}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="contrib-yes" />
                      <label htmlFor="contrib-yes" className="text-body font-medium cursor-pointer">
                        Yes, government contributes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="contrib-no" />
                      <label htmlFor="contrib-no" className="text-body font-medium cursor-pointer">
                        No contribution
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Contribution Details */}
                {governmentInputs.rgcContribution?.isProvided && (
                  <>
                    {/* Currency + Value Date */}
                    <div className="p-4 bg-muted border border-border rounded-lg space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <h4 className="font-semibold text-foreground">Contribution Details</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-body font-medium">Currency</Label>
                          <CurrencySelector
                            value={rgc?.currency || undefined}
                            onValueChange={(value) => !readOnly && updateField("rgcContribution.currency", value)}
                            placeholder="Select currency"
                            disabled={readOnly}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-body font-medium">Value Date</Label>
                          <Input
                            type="date"
                            value={rgc?.valueDate || ""}
                            onChange={(e) => !readOnly && updateField("rgcContribution.valueDate", e.target.value)}
                            readOnly={readOnly}
                            className={cn("h-10", readOnly && "bg-muted")}
                          />
                        </div>
                      </div>

                      {/* Exchange Rate Display */}
                      {rgc?.currency && rgc.currency !== 'USD' && (
                        <div className="p-3 border rounded-lg bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-body font-medium flex items-center gap-2">
                              Exchange Rate
                              {!rgc.exchangeRateManual && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={fetchExchangeRate}
                                  disabled={isLoadingRate}
                                >
                                  <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="text-helper text-muted-foreground">
                                {rgc.exchangeRateManual ? 'Manual' : 'API Rate'}
                              </span>
                              <Switch
                                checked={!rgc.exchangeRateManual}
                                onCheckedChange={(checked) => {
                                  updateField("rgcContribution.exchangeRateManual", !checked);
                                  if (checked) {
                                    fetchExchangeRate();
                                  }
                                }}
                              />
                              {rgc.exchangeRateManual ? (
                                <Unlock className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Lock className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.000001"
                              value={exchangeRate || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateField("rgcContribution.exchangeRate", isNaN(val) ? null : val);
                              }}
                              disabled={!rgc.exchangeRateManual || isLoadingRate}
                              className={cn("h-9", !rgc.exchangeRateManual && 'bg-muted')}
                              placeholder={isLoadingRate ? 'Loading...' : 'Enter rate'}
                            />
                            {isLoadingRate && (
                              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {exchangeRate && (
                            <p className="text-helper text-muted-foreground mt-1">
                              1 {rgc.currency} = {exchangeRate.toFixed(6)} USD
                            </p>
                          )}
                          {rateError && (
                            <p className="text-helper text-destructive mt-1">{rateError}</p>
                          )}
                        </div>
                      )}

                      {/* Total Amount */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-body font-medium">
                            Total Amount {rgc?.currency ? `(${rgc.currency})` : '(Local Currency)'}
                          </Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1,000,000"
                            value={rgc?.totalAmountLocal || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateField("rgcContribution.totalAmountLocal", val);
                              // Auto-compute USD
                              if (exchangeRate) {
                                updateField("rgcContribution.totalAmountUSD", Math.round(val * exchangeRate * 100) / 100);
                              }
                            }}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-body font-medium">USD Equivalent</Label>
                          <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium text-green-700">
                            {computedTotalUSD !== null ? (
                              <>$ {computedTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                            ) : (
                              <span className="text-muted-foreground font-normal text-body">
                                {!rgc?.currency ? 'Select a currency' : !exchangeRate ? 'Set value date for rate' : 'Enter amount'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Distribution Mode */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-foreground mb-3">Distribution Mode</h4>
                      <RadioGroup
                        value={rgc?.distributionMode || 'lump_sum'}
                        onValueChange={(value) =>
                          updateField("rgcContribution.distributionMode", value as 'lump_sum' | 'annual')
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="lump_sum" id="dist-lump" />
                          <label htmlFor="dist-lump" className="text-body font-medium cursor-pointer">
                            Lump Sum
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="annual" id="dist-annual" />
                          <label htmlFor="dist-annual" className="text-body font-medium cursor-pointer flex items-center gap-1.5">
                            <SplitSquareHorizontal className="h-3.5 w-3.5" />
                            Annual Breakdown
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Annual Breakdown Table */}
                    {rgc?.distributionMode === 'annual' && (
                      <div className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">Annual Breakdown</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generateYearRows}
                              disabled={!plannedStartDate || !plannedEndDate}
                              className="gap-1.5"
                              title={!plannedStartDate || !plannedEndDate ? 'Set planned start/end dates first' : 'Generate year rows from activity dates'}
                            >
                              <CalendarRange className="h-3.5 w-3.5" />
                              Generate Years
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={distributeEvenly}
                              disabled={!totalLocal || !(rgc?.annual?.length)}
                              className="gap-1.5"
                            >
                              <SplitSquareHorizontal className="h-3.5 w-3.5" />
                              Distribute Evenly
                            </Button>
                          </div>
                        </div>

                        {/* Warning if no planned dates */}
                        {(!plannedStartDate || !plannedEndDate) && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-body text-amber-800">
                              Set planned start and end dates in the Activity Overview section to auto-generate annual breakdown rows. You can still add years manually below.
                            </p>
                          </div>
                        )}

                        {/* Year table */}
                        {(rgc?.annual?.length ?? 0) > 0 && (
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-body">
                              <thead className="bg-surface-muted">
                                <tr className="bg-surface-muted">
                                  <th className="text-left p-2 font-medium text-helper w-24">Year</th>
                                  <th className="text-right p-2 font-medium text-helper">
                                    Amount {rgc?.currency ? `(${rgc.currency})` : '(Local)'}
                                  </th>
                                  <th className="text-right p-2 font-medium text-helper">USD Equivalent</th>
                                  <th className="w-10" />
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {(rgc?.annual || []).map((item, index) => {
                                  const rowUSD = item.amountLocal && exchangeRate
                                    ? Math.round(item.amountLocal * exchangeRate * 100) / 100
                                    : item.amountUSD || 0;
                                  return (
                                    <tr key={index} className="hover:bg-muted/50">
                                      <td className="p-1.5">
                                        <span className="text-body tabular-nums font-medium">{item.year}</span>
                                      </td>
                                      <td className="p-1.5 text-right">
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={item.amountLocal || ''}
                                          onChange={(e) => {
                                            const newAnnual = [...(rgc?.annual || [])];
                                            const amtLocal = parseFloat(e.target.value) || 0;
                                            const amtUSD = exchangeRate ? Math.round(amtLocal * exchangeRate * 100) / 100 : 0;
                                            newAnnual[index] = { ...item, amountLocal: amtLocal, amountUSD: amtUSD };
                                            updateField("rgcContribution.annual", newAnnual);
                                          }}
                                          className="h-7 text-body text-right tabular-nums w-full"
                                        />
                                      </td>
                                      <td className="p-1.5 text-right">
                                        <span className="text-body tabular-nums text-green-700 font-medium">
                                          {rowUSD ? `$ ${rowUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                        </span>
                                      </td>
                                      <td className="p-1.5">
                                        <button
                                          onClick={() => {
                                            const newAnnual = (rgc?.annual || []).filter((_, i) => i !== index);
                                            updateField("rgcContribution.annual", newAnnual);
                                          }}
                                          className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 font-medium bg-muted/30">
                                  <td className="p-2 text-helper">Total</td>
                                  <td className="p-2 text-right tabular-nums text-body">
                                    {(rgc?.annual || []).reduce((sum, r) => sum + (r.amountLocal || 0), 0).toLocaleString()}
                                  </td>
                                  <td className="p-2 text-right tabular-nums text-body text-green-700">
                                    $ {(rgc?.annual || []).reduce((sum, r) => {
                                      const usd = r.amountLocal && exchangeRate ? Math.round(r.amountLocal * exchangeRate * 100) / 100 : (r.amountUSD || 0);
                                      return sum + usd;
                                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}

                        {/* Manual Add Year */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentAnnual = rgc?.annual || [];
                            const lastYear = currentAnnual.length > 0
                              ? Math.max(...currentAnnual.map(r => r.year))
                              : new Date().getFullYear() - 1;
                            updateField("rgcContribution.annual", [
                              ...currentAnnual,
                              { year: lastYear + 1, amountLocal: 0, amountUSD: 0 },
                            ]);
                          }}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Year
                        </Button>
                      </div>
                    )}

                    {/* Source of Funding */}
                    <div>
                      <label className="block text-body font-medium text-foreground mb-2">
                        Source of Funding
                      </label>
                      {readOnly ? (
                        <p className="text-body text-foreground">
                          {rgc?.sourceOfFunding || <span className="text-muted-foreground">—</span>}
                        </p>
                      ) : (
                        <Textarea
                          placeholder="Specify the government budget line or funding source"
                          value={rgc?.sourceOfFunding || ""}
                          onChange={(e) => updateField("rgcContribution.sourceOfFunding", e.target.value)}
                          rows={3}
                        />
                      )}
                    </div>

                    {/* In-Kind Contributions */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium text-foreground">In-Kind Contributions</h4>
                        </div>
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const items = rgc?.inKindItems || [];
                              updateField("rgcContribution.inKindItems", [
                                ...items,
                                { id: crypto.randomUUID(), type: 'staff' as InKindItemType, description: '', estimatedValueLocal: undefined, estimatedValueUSD: undefined },
                              ]);
                            }}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Item
                          </Button>
                        )}
                      </div>

                      {(!rgc?.inKindItems || rgc.inKindItems.length === 0) && (
                        <p className="text-body text-muted-foreground">
                          {readOnly ? 'No in-kind contributions recorded.' : 'No in-kind contributions added yet. Click "Add Item" to begin.'}
                        </p>
                      )}

                      {(rgc?.inKindItems || []).map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg border">
                          {readOnly ? (
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-helper">{IN_KIND_TYPE_LABELS[item.type]}</Badge>
                                {item.estimatedValueLocal != null && item.estimatedValueLocal > 0 && (
                                  <span className="text-helper text-muted-foreground">
                                    {rgc?.currency ? `${item.estimatedValueLocal.toLocaleString()} ${rgc.currency}` : item.estimatedValueLocal.toLocaleString()}
                                    {item.estimatedValueUSD ? ` ($ ${item.estimatedValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-body">{item.description}</p>
                            </div>
                          ) : (
                            <>
                              <div className="w-36 shrink-0">
                                <Select
                                  value={item.type}
                                  onValueChange={(val) => {
                                    const updated = [...(rgc?.inKindItems || [])];
                                    updated[idx] = { ...item, type: val as InKindItemType };
                                    updateField("rgcContribution.inKindItems", updated);
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-body">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.entries(IN_KIND_TYPE_LABELS) as [InKindItemType, string][]).map(([v, l]) => (
                                      <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Input
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...(rgc?.inKindItems || [])];
                                  updated[idx] = { ...item, description: e.target.value };
                                  updateField("rgcContribution.inKindItems", updated);
                                }}
                                className="h-9 flex-1"
                              />
                              <div className="w-32 shrink-0">
                                <Input
                                  type="number"
                                  placeholder={`Value${rgc?.currency ? ` (${rgc.currency})` : ''}`}
                                  value={item.estimatedValueLocal ?? ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || undefined;
                                    const usd = val && exchangeRate ? Math.round(val * exchangeRate * 100) / 100 : undefined;
                                    const updated = [...(rgc?.inKindItems || [])];
                                    updated[idx] = { ...item, estimatedValueLocal: val, estimatedValueUSD: usd };
                                    updateField("rgcContribution.inKindItems", updated);
                                  }}
                                  className="h-9 text-right tabular-nums"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  updateField("rgcContribution.inKindItems", (rgc?.inKindItems || []).filter((_, i) => i !== idx));
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors mt-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {/* In-kind totals */}
                      {(rgc?.inKindItems || []).some(i => i.estimatedValueLocal) && (
                        <div className="flex justify-between text-body font-medium pt-1 border-t">
                          <span>Total In-Kind (estimated)</span>
                          <span className="tabular-nums">
                            {(rgc?.inKindItems || []).reduce((s, i) => s + (i.estimatedValueLocal || 0), 0).toLocaleString()}
                            {rgc?.currency ? ` ${rgc.currency}` : ''}
                            {exchangeRate ? ` ($ ${(rgc?.inKindItems || []).reduce((s, i) => s + (i.estimatedValueUSD || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Other Contributions */}
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">Other Contributions</h4>
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const items = rgc?.otherContributions || [];
                              updateField("rgcContribution.otherContributions", [
                                ...items,
                                { id: crypto.randomUUID(), description: '' },
                              ]);
                            }}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        )}
                      </div>
                      <p className="text-body text-muted-foreground -mt-1">
                        e.g. policy support, coordination, technical advice
                      </p>

                      {(!rgc?.otherContributions || rgc.otherContributions.length === 0) && (
                        <p className="text-body text-muted-foreground">
                          {readOnly ? 'No other contributions recorded.' : 'None added yet.'}
                        </p>
                      )}

                      {(rgc?.otherContributions || []).map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-center">
                          {readOnly ? (
                            <p className="text-body flex-1">{item.description}</p>
                          ) : (
                            <>
                              <Input
                                placeholder="Describe this contribution"
                                value={item.description}
                                onChange={(e) => {
                                  const updated = [...(rgc?.otherContributions || [])];
                                  updated[idx] = { ...item, description: e.target.value };
                                  updateField("rgcContribution.otherContributions", updated);
                                }}
                                className="h-9 flex-1"
                              />
                              <button
                                onClick={() => {
                                  updateField("rgcContribution.otherContributions", (rgc?.otherContributions || []).filter((_, i) => i !== idx));
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────── Risk Assessment Tab ──────────────── */}
          <TabsContent value="risk-assessment" className="space-y-6 mt-6">
            {/* Overall Risk Summary */}
            <div className="border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Risk Summary</h3>
                    <p className="text-body text-muted-foreground">
                      {totalAnswered} of {totalQuestions} questions answered
                    </p>
                  </div>
                </div>
                {totalAnswered > 0 && (
                  <Badge
                    variant="outline"
                    className={cn("text-body px-3 py-1", getRiskLevel(overallRiskScore).badgeClass)}
                  >
                    Overall: {getRiskLevel(overallRiskScore).label} Risk
                  </Badge>
                )}
              </div>

              {/* Category summary bars */}
              {totalAnswered > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {categoryScores.map((cat) => {
                    const level = cat.avgScore > 0 ? getRiskLevel(cat.avgScore) : null;
                    return (
                      <div key={cat.id} className="text-center">
                        <div className="text-helper text-muted-foreground mb-1">{cat.label.replace(" Risk", "")}</div>
                        {level ? (
                          <Badge variant="outline" className={cn("text-helper", level.badgeClass)}>
                            {level.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-helper text-muted-foreground border-border">
                            --
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {totalAnswered === 0 && (
                <p className="text-body text-muted-foreground text-center py-2">
                  Answer the questions below to generate a risk profile for this activity.
                </p>
              )}
            </div>

            {/* Risk Category Questions */}
            {RISK_CATEGORIES.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.questions.map((question) => {
                    const currentScore = riskAssessment[question.id]?.score;
                    return (
                      <div key={question.id} className="p-4 border rounded-lg bg-white">
                        <p className="text-body font-medium text-foreground mb-3">{question.text}</p>
                        <RadioGroup
                          value={currentScore?.toString() || ""}
                          onValueChange={(value) =>
                            !readOnly && updateField(`riskAssessment.${question.id}`, { score: parseInt(value) })
                          }
                          disabled={readOnly}
                          className="flex gap-6"
                        >
                          {RISK_LEVELS.map((level) => (
                            <div key={level.value} className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={level.value.toString()}
                                id={`${question.id}-${level.value}`}
                              />
                              <label
                                htmlFor={`${question.id}-${level.value}`}
                                className={cn(
                                  "text-body font-medium cursor-pointer",
                                  currentScore === level.value && level.color.split(" ")[0]
                                )}
                              >
                                {level.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ──────────────── Evaluation Tab ──────────────── */}
          <TabsContent value="evaluation" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
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
                  <h4 className="font-medium text-foreground mb-3">
                    Has this activity been evaluated by government?
                  </h4>
                  <RadioGroup
                    value={governmentInputs.evaluationResults?.hasEvaluation ? "yes" : "no"}
                    onValueChange={(value) =>
                      !readOnly && updateField("evaluationResults.hasEvaluation", value === "yes")
                    }
                    disabled={readOnly}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="eval-yes" />
                      <label htmlFor="eval-yes" className="text-body font-medium cursor-pointer">
                        Yes, evaluated
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="eval-no" />
                      <label htmlFor="eval-no" className="text-body font-medium cursor-pointer">
                        Not evaluated
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {governmentInputs.evaluationResults?.hasEvaluation && (
                  <div className="space-y-4">
                    {/* Evaluation Documents */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">Evaluation Documents</span>
                      </div>
                      <p className="text-body text-muted-foreground mb-3">
                        Upload the government evaluation report(s)
                      </p>
                      <DocumentDropzone
                        activityId={activityId}
                        category="evaluation"
                        documents={evaluationDocs}
                        onDocumentsChange={setEvaluationDocs}
                        disabled={readOnly}
                      />
                    </div>

                    {/* National Results Framework */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-foreground mb-3">
                        Is this included in national results framework?
                      </h4>
                      <RadioGroup
                        value={governmentInputs.evaluationResults?.inNationalFramework ? "yes" : "no"}
                        onValueChange={(value) =>
                          !readOnly && updateField("evaluationResults.inNationalFramework", value === "yes")
                        }
                        disabled={readOnly}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="framework-yes" />
                          <label htmlFor="framework-yes" className="text-body font-medium cursor-pointer">
                            Yes, in national framework
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="framework-no" />
                          <label htmlFor="framework-no" className="text-body font-medium cursor-pointer">
                            Not in framework
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {governmentInputs.evaluationResults?.inNationalFramework && (
                      <div>
                        <label className="block text-body font-medium text-foreground mb-2">
                          National Indicator Reference
                        </label>
                        <Input
                          placeholder="e.g., NRF-2.3.1"
                          value={governmentInputs.evaluationResults?.nationalIndicatorRef || ""}
                          onChange={(e) =>
                            !readOnly && updateField("evaluationResults.nationalIndicatorRef", e.target.value)
                          }
                          readOnly={readOnly}
                          className={readOnly ? 'bg-muted' : ''}
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
