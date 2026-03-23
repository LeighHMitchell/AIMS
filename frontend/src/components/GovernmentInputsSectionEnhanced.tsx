import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, FileText, CheckCircle2, Circle, CircleSlash, Wallet, DollarSign, FileCheck, BarChart3, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { DocumentDropzone, UploadedDocument } from "@/components/ui/document-dropzone";
import { apiFetch } from "@/lib/api-fetch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  { value: 1, label: "Low", color: "text-green-700 bg-green-50 border-green-200" },
  { value: 2, label: "Medium", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: 3, label: "High", color: "text-red-700 bg-red-50 border-red-200" },
];

function getRiskLevel(score: number): { label: string; color: string; badgeClass: string } {
  if (score <= 1.5) return { label: "Low", color: "text-green-700", badgeClass: "bg-green-100 text-green-800 border-green-200" };
  if (score <= 2.2) return { label: "Medium", color: "text-amber-700", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "High", color: "text-red-700", badgeClass: "bg-red-100 text-red-800 border-red-200" };
}

// ─── Government Inputs Types ────────────────────────────────────────────────

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
    totalAmountLocal?: number;
    totalAmountUSD?: number;
    valueDate?: string;
    annual?: Array<{
      year: number;
      amountLocal: number;
      amountUSD: number;
    }>;
    inKindContributions?: string;
    sourceOfFunding?: string;
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
      return <CheckCircle2 className="h-4 w-4 text-gray-600" />;
    case "Partial":
      return <CircleSlash className="h-4 w-4 text-gray-500" />;
    case "No":
      return <Circle className="h-4 w-4 text-gray-400" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300" />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function GovernmentInputsSectionEnhanced({
  activityId,
  governmentInputs,
  onChange,
}: GovernmentInputsSectionProps) {
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
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileCheck className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Budget Classification</CardTitle>
                      <CardDescription>
                        Assess how this activity aligns with government budget systems
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">
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
                      <h4 className="font-medium text-slate-900">{dimension.label}</h4>
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
                    <p className="text-sm text-muted-foreground mb-3">
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
                        updateField(`onBudgetClassification.${dimension.key}`, value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Yes" id={`${dimension.key}-yes`} />
                        <label htmlFor={`${dimension.key}-yes`} className="text-sm font-medium cursor-pointer">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Partial" id={`${dimension.key}-partial`} />
                        <label htmlFor={`${dimension.key}-partial`} className="text-sm font-medium cursor-pointer">
                          Partial
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="No" id={`${dimension.key}-no`} />
                        <label htmlFor={`${dimension.key}-no`} className="text-sm font-medium cursor-pointer">
                          No
                        </label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}

                {/* Supporting Documents */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h4 className="font-medium text-slate-900">Supporting Documents</h4>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">Optional</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Upload documents that support your &quot;Yes&quot; or &quot;Partial&quot; classifications
                  </p>
                  <DocumentDropzone
                    activityId={activityId}
                    category="budget-supporting"
                    documents={budgetDocs}
                    onDocumentsChange={setBudgetDocs}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Government Financial Contribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-gray-600" />
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
                  <h4 className="font-medium text-slate-900 mb-3">
                    Does the government provide financial contribution?
                  </h4>
                  <RadioGroup
                    value={governmentInputs.rgcContribution?.isProvided ? "yes" : "no"}
                    onValueChange={(value) =>
                      updateField("rgcContribution.isProvided", value === "yes")
                    }
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="contrib-yes" />
                      <label htmlFor="contrib-yes" className="text-sm font-medium cursor-pointer">
                        Yes, government contributes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="contrib-no" />
                      <label htmlFor="contrib-no" className="text-sm font-medium cursor-pointer">
                        No contribution
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Contribution Details */}
                {governmentInputs.rgcContribution?.isProvided && (
                  <>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">Total Government Contribution</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Local Currency Amount
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g., 1,000,000"
                            value={governmentInputs.rgcContribution?.totalAmountLocal || ""}
                            onChange={(e) =>
                              updateField("rgcContribution.totalAmountLocal", parseFloat(e.target.value) || 0)
                            }
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            USD Equivalent
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g., 250,000"
                            value={governmentInputs.rgcContribution?.totalAmountUSD || ""}
                            onChange={(e) =>
                              updateField("rgcContribution.totalAmountUSD", parseFloat(e.target.value) || 0)
                            }
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Value Date
                          </label>
                          <Input
                            type="date"
                            value={governmentInputs.rgcContribution?.valueDate || ""}
                            onChange={(e) => updateField("rgcContribution.valueDate", e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Annual Breakdown */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-900">Annual Breakdown</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentAnnual = governmentInputs.rgcContribution?.annual || [];
                            const newYear = new Date().getFullYear() + currentAnnual.length;
                            updateField("rgcContribution.annual", [
                              ...currentAnnual,
                              { year: newYear, amountLocal: 0, amountUSD: 0 },
                            ]);
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Year
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(governmentInputs.rgcContribution?.annual || []).map((item, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded">
                            <Input
                              type="number"
                              placeholder="Year"
                              value={item.year}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, year: parseInt(e.target.value) || 0 };
                                updateField("rgcContribution.annual", newAnnual);
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Local amount"
                              value={item.amountLocal}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, amountLocal: parseFloat(e.target.value) || 0 };
                                updateField("rgcContribution.annual", newAnnual);
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="USD amount"
                              value={item.amountUSD}
                              onChange={(e) => {
                                const newAnnual = [...(governmentInputs.rgcContribution?.annual || [])];
                                newAnnual[index] = { ...item, amountUSD: parseFloat(e.target.value) || 0 };
                                updateField("rgcContribution.annual", newAnnual);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAnnual = (governmentInputs.rgcContribution?.annual || []).filter(
                                  (_, i) => i !== index
                                );
                                updateField("rgcContribution.annual", newAnnual);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          In-Kind Contributions
                        </label>
                        <Textarea
                          placeholder="Describe any in-kind contributions (staff time, facilities, equipment, etc.)"
                          value={governmentInputs.rgcContribution?.inKindContributions || ""}
                          onChange={(e) => updateField("rgcContribution.inKindContributions", e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Source of Funding
                        </label>
                        <Textarea
                          placeholder="Specify the government budget line or funding source"
                          value={governmentInputs.rgcContribution?.sourceOfFunding || ""}
                          onChange={(e) => updateField("rgcContribution.sourceOfFunding", e.target.value)}
                          rows={3}
                        />
                      </div>
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
                  <ShieldAlert className="h-5 w-5 text-slate-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Risk Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalAnswered} of {totalQuestions} questions answered
                    </p>
                  </div>
                </div>
                {totalAnswered > 0 && (
                  <Badge
                    variant="outline"
                    className={cn("text-sm px-3 py-1", getRiskLevel(overallRiskScore).badgeClass)}
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
                        <div className="text-xs text-muted-foreground mb-1">{cat.label.replace(" Risk", "")}</div>
                        {level ? (
                          <Badge variant="outline" className={cn("text-xs", level.badgeClass)}>
                            {level.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
                            --
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {totalAnswered === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
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
                        <p className="text-sm font-medium text-slate-900 mb-3">{question.text}</p>
                        <RadioGroup
                          value={currentScore?.toString() || ""}
                          onValueChange={(value) =>
                            updateField(`riskAssessment.${question.id}`, { score: parseInt(value) })
                          }
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
                                  "text-sm font-medium cursor-pointer",
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
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-gray-600" />
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
                  <h4 className="font-medium text-slate-900 mb-3">
                    Has this activity been evaluated by government?
                  </h4>
                  <RadioGroup
                    value={governmentInputs.evaluationResults?.hasEvaluation ? "yes" : "no"}
                    onValueChange={(value) =>
                      updateField("evaluationResults.hasEvaluation", value === "yes")
                    }
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="eval-yes" />
                      <label htmlFor="eval-yes" className="text-sm font-medium cursor-pointer">
                        Yes, evaluated
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="eval-no" />
                      <label htmlFor="eval-no" className="text-sm font-medium cursor-pointer">
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
                        <FileText className="h-5 w-5 text-slate-500" />
                        <span className="font-medium text-slate-900">Evaluation Documents</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Upload the government evaluation report(s)
                      </p>
                      <DocumentDropzone
                        activityId={activityId}
                        category="evaluation"
                        documents={evaluationDocs}
                        onDocumentsChange={setEvaluationDocs}
                      />
                    </div>

                    {/* National Results Framework */}
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-3">
                        Is this included in national results framework?
                      </h4>
                      <RadioGroup
                        value={governmentInputs.evaluationResults?.inNationalFramework ? "yes" : "no"}
                        onValueChange={(value) =>
                          updateField("evaluationResults.inNationalFramework", value === "yes")
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="framework-yes" />
                          <label htmlFor="framework-yes" className="text-sm font-medium cursor-pointer">
                            Yes, in national framework
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="framework-no" />
                          <label htmlFor="framework-no" className="text-sm font-medium cursor-pointer">
                            Not in framework
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {governmentInputs.evaluationResults?.inNationalFramework && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          National Indicator Reference
                        </label>
                        <Input
                          placeholder="e.g., NRF-2.3.1"
                          value={governmentInputs.evaluationResults?.nationalIndicatorRef || ""}
                          onChange={(e) =>
                            updateField("evaluationResults.nationalIndicatorRef", e.target.value)
                          }
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
