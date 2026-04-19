"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  BookOpen,
  DollarSign,
  Activity,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  NationalPlan,
  AlignmentCoverageData,
  AlignmentCoverageNode,
  AlignedActivity,
} from "@/types/national-priorities";
import { apiFetch } from "@/lib/api-fetch";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// ============================================
// COVERAGE TREE NODE (with click-to-drill)
// ============================================

interface CoverageTreeNodeProps {
  node: AlignmentCoverageNode;
  level: number;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  onNodeClick: (node: AlignmentCoverageNode) => void;
}

function CoverageTreeNode({
  node,
  level,
  expandedIds,
  toggleExpanded,
  onNodeClick,
}: CoverageTreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const hasActivities = node.activityCount > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-3 py-2.5 px-3 border-b last:border-b-0 hover:bg-muted/50 ${
          !hasActivities ? "bg-muted/30" : ""
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpanded(node.id);
          }}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
            hasChildren ? "cursor-pointer hover:bg-muted rounded" : "cursor-default"
          }`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        <span className="flex-shrink-0">
          {hasActivities ? (
            <CheckCircle className="h-4 w-4 text-foreground" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          )}
        </span>

        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
          {node.code}
        </span>

        <Badge variant="outline" className="text-helper flex-shrink-0">
          {node.level === 1 ? "Pillar" : node.level === 2 ? "Outcome" : "Intervention"}
        </Badge>

        <button
          onClick={() => onNodeClick(node)}
          className="text-body flex-1 min-w-0 truncate text-left hover:underline"
        >
          {node.name}
        </button>

        <span className="flex-shrink-0 w-[140px] text-right flex items-center justify-end gap-1">
          {node.principalCount > 0 && (
            <Badge variant="default" className="text-helper" title="Principal alignments">
              {node.principalCount} Principal
            </Badge>
          )}
          {node.significantCount > 0 && (
            <Badge variant="outline" className="text-helper" title="Significant alignments">
              {node.significantCount} Significant
            </Badge>
          )}
          {node.activityCount === 0 && (
            <Badge variant="outline" className="text-helper">0</Badge>
          )}
        </span>

        <span className="flex-shrink-0 w-[100px] text-right text-body font-medium">
          {node.totalFunding > 0 ? formatCurrency(node.totalFunding) : "—"}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <CoverageTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

interface OrgOption { id: string; name: string; acronym?: string | null }
interface SectorOption { code: string; name: string }

export function AlignmentCoverageDashboard() {
  const [plans, setPlans] = useState<NationalPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [coverageData, setCoverageData] = useState<AlignmentCoverageData | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [donorOptions, setDonorOptions] = useState<OrgOption[]>([]);
  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>([]);
  const [selectedDonorId, setSelectedDonorId] = useState<string>("all");
  const [selectedSectorCode, setSelectedSectorCode] = useState<string>("all");

  // Drill-down dialog
  const [drillNode, setDrillNode] = useState<AlignmentCoverageNode | null>(null);

  // Fetch plans
  useEffect(() => {
    (async () => {
      try {
        setLoadingPlans(true);
        const response = await apiFetch("/api/national-plans?activeOnly=true");
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setPlans(result.data);
          // Default to primary plan if it exists
          const primary = result.data.find((p: NationalPlan) => p.isPrimary);
          setSelectedPlanId(primary?.id || result.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  // Fetch donor options
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setDonorOptions(
              data.map((o: any) => ({
                id: o.id,
                name: o.name,
                acronym: o.acronym,
              }))
            );
          }
        }
      } catch (e) {
        console.error("Error fetching donor options:", e);
      }
    })();
  }, []);

  // Fetch sector options (use a simple list from DAC sectors data file)
  useEffect(() => {
    (async () => {
      try {
        const res = await import("@/data/dac-sectors.json");
        const data = res.default || res;
        const flat: SectorOption[] = [];
        // dac-sectors.json structure: { categoryName: [{ code, name }] }
        Object.entries(data as any).forEach(([_cat, items]: [string, any]) => {
          if (Array.isArray(items)) {
            items.forEach((s: any) => {
              if (s.code && s.name) flat.push({ code: s.code, name: s.name });
            });
          }
        });
        setSectorOptions(flat);
      } catch (e) {
        console.error("Error loading sector options:", e);
      }
    })();
  }, []);

  // Fetch coverage data when plan or filters change
  useEffect(() => {
    if (!selectedPlanId) return;

    (async () => {
      try {
        setLoadingCoverage(true);
        const params = new URLSearchParams({ planId: selectedPlanId });
        if (selectedDonorId && selectedDonorId !== "all") params.set("donorId", selectedDonorId);
        if (selectedSectorCode && selectedSectorCode !== "all") params.set("sectorCode", selectedSectorCode);

        const response = await apiFetch(`/api/analytics/alignment-coverage?${params}`);
        const result = await response.json();
        if (result.success) {
          setCoverageData(result.data);
          const topIds = new Set<string>(
            (result.data.tree || []).map((n: AlignmentCoverageNode) => n.id)
          );
          setExpandedIds(topIds);
        }
      } catch (error) {
        console.error("Error fetching coverage:", error);
      } finally {
        setLoadingCoverage(false);
      }
    })();
  }, [selectedPlanId, selectedDonorId, selectedSectorCode]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!coverageData) return;
    const allIds = new Set<string>();
    function collect(nodes: AlignmentCoverageNode[]) {
      nodes.forEach((n) => {
        allIds.add(n.id);
        if (n.children) collect(n.children);
      });
    }
    collect(coverageData.tree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => setExpandedIds(new Set());

  // Gap nodes
  const gapNodes = useMemo(() => {
    if (!coverageData) return [];
    const gaps: AlignmentCoverageNode[] = [];
    function findGaps(nodes: AlignmentCoverageNode[]) {
      nodes.forEach((node) => {
        if (node.activityCount === 0 && node.level >= 2) {
          gaps.push(node);
        }
        if (node.children) findGaps(node.children);
      });
    }
    findGaps(coverageData.tree);
    return gaps;
  }, [coverageData]);

  // Stacked bar data: per pillar, show how many child nodes are covered vs neglected
  const pillarBarData = useMemo(() => {
    if (!coverageData) return [];
    return coverageData.tree.map((pillar) => {
      let covered = 0;
      let neglected = 0;
      function count(nodes: AlignmentCoverageNode[]) {
        nodes.forEach((n) => {
          if (n.children && n.children.length > 0) {
            count(n.children);
          } else {
            if (n.activityCount > 0) covered++;
            else neglected++;
          }
        });
      }
      // Count leaf nodes; if no children, count the pillar itself
      if (pillar.children && pillar.children.length > 0) {
        count(pillar.children);
      } else {
        if (pillar.activityCount > 0) covered = 1;
        else neglected = 1;
      }
      return {
        name: `${pillar.code}`,
        fullName: pillar.name,
        Covered: covered,
        Neglected: neglected,
        funding: pillar.totalFunding,
      };
    });
  }, [coverageData]);

  // Coverage percentage
  const coveragePercent = coverageData
    ? coverageData.totalActivities > 0
      ? Math.round((coverageData.alignedActivities / coverageData.totalActivities) * 100)
      : 0
    : 0;

  // Excel export
  const exportToExcel = () => {
    if (!coverageData) return;

    const rows: any[] = [];
    function flatten(nodes: AlignmentCoverageNode[], parentPath = "") {
      nodes.forEach((n) => {
        const path = parentPath ? `${parentPath} > ${n.name}` : n.name;
        rows.push({
          Code: n.code,
          Name: n.name,
          "Full Path": path,
          Level: n.level === 1 ? "Pillar" : n.level === 2 ? "Outcome" : "Intervention",
          "Activity Count": n.activityCount,
          "Principal": n.principalCount,
          "Significant": n.significantCount,
          "Total Funding (USD)": n.totalFunding,
          Status: n.activityCount > 0 ? "Covered" : "No activities",
        });
        if (n.children) flatten(n.children, path);
      });
    }
    flatten(coverageData.tree);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alignment Coverage");

    const planName = coverageData.plan.acronym || coverageData.plan.name.substring(0, 30);
    XLSX.writeFile(workbook, `alignment-coverage-${planName}-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ============================================
  // RENDER
  // ============================================

  if (loadingPlans) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No development plans configured</h3>
          <p className="text-body">
            An administrator needs to create national plans or sectoral strategies before alignment data can be displayed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Plan</Label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a plan..." />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.acronym && ` (${plan.acronym})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Donor</Label>
          <Select value={selectedDonorId} onValueChange={setSelectedDonorId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All donors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All donors</SelectItem>
              {donorOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.acronym ? `${o.acronym} — ${o.name}` : o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-helper text-muted-foreground">Sector</Label>
          <Select value={selectedSectorCode} onValueChange={setSelectedSectorCode}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {sectorOptions.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <Button variant="outline" onClick={exportToExcel} disabled={!coverageData}>
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </div>

      {loadingCoverage ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : coverageData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Activity className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coverageData.alignedActivities}</p>
                    <p className="text-helper text-muted-foreground">Activities aligned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Target className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coveragePercent}%</p>
                    <p className="text-helper text-muted-foreground">of all activities aligned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <DollarSign className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(coverageData.alignedFunding)}</p>
                    <p className="text-helper text-muted-foreground">Funding aligned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{gapNodes.length}</p>
                    <p className="text-helper text-muted-foreground">Priority areas with no activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stacked Bar Chart by Pillar */}
          {pillarBarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Coverage by Pillar
                </CardTitle>
                <CardDescription>
                  Number of priority areas covered vs neglected within each pillar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pillarBarData} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={50} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d: any = payload[0].payload;
                          return (
                            <div className="bg-white border rounded shadow-lg p-3 text-body">
                              <p className="font-semibold mb-1">{d.fullName}</p>
                              <p className="text-foreground">Covered: {d.Covered}</p>
                              <p className="text-muted-foreground">Neglected: {d.Neglected}</p>
                              <p className="text-muted-foreground mt-1">Funding: {formatCurrency(d.funding)}</p>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Covered" stackId="a" fill="#374151" />
                      <Bar dataKey="Neglected" stackId="a" fill="#d1d5db" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coverage Tree Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" />
                    Alignment Coverage
                  </CardTitle>
                  <CardDescription>
                    Click a priority name to see activities aligned to it
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="text-helper text-muted-foreground hover:text-foreground underline"
                  >
                    Expand all
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    onClick={collapseAll}
                    className="text-helper text-muted-foreground hover:text-foreground underline"
                  >
                    Collapse all
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 border-b font-medium text-section-label text-muted-foreground uppercase">
                <span className="w-5" />
                <span className="w-4" />
                <span className="flex-shrink-0 w-[60px]">Code</span>
                <span className="flex-shrink-0 w-[80px]">Level</span>
                <span className="flex-1">Priority</span>
                <span className="w-[140px] text-right">Alignments</span>
                <span className="w-[100px] text-right">Funding</span>
              </div>

              <div className="border rounded-md mt-1">
                {coverageData.tree.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No priorities defined for this plan yet</p>
                  </div>
                ) : (
                  coverageData.tree.map((node) => (
                    <CoverageTreeNode
                      key={node.id}
                      node={node}
                      level={0}
                      expandedIds={expandedIds}
                      toggleExpanded={toggleExpanded}
                      onNodeClick={setDrillNode}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gap Highlights */}
          {gapNodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Neglected Priority Areas
                </CardTitle>
                <CardDescription>
                  Outcomes and interventions with no activities aligned — potential gaps in development partner coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gapNodes.map((node) => (
                    <div
                      key={node.id}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border">
                          {node.code}
                        </span>
                        <Badge variant="outline" className="text-helper">
                          {node.level === 2 ? "Outcome" : "Intervention"}
                        </Badge>
                      </div>
                      <p className="text-body font-medium">{node.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <h3 className="text-lg font-medium text-foreground mb-2">No alignment data yet</h3>
            <p className="text-body max-w-md mx-auto">
              Activities haven't been mapped to this plan's priority areas yet. Open an activity and add alignments from the <span className="font-medium text-foreground">Alignment</span> tab to see coverage here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Drill-down Dialog */}
      <Dialog open={!!drillNode} onOpenChange={(open) => !open && setDrillNode(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{drillNode?.code}</span>
              {drillNode?.name}
            </DialogTitle>
            <DialogDescription>
              {drillNode?.activityCount || 0} {drillNode?.activityCount === 1 ? "activity" : "activities"} aligned •{" "}
              Total funding {formatCurrency(drillNode?.totalFunding || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {drillNode && coverageData?.activitiesByPriority[drillNode.id]?.length ? (
              <div className="border rounded-md overflow-hidden">
                <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 border-b text-section-label font-medium text-muted-foreground uppercase">
                  <span className="flex-1">Activity</span>
                  <span className="w-[120px] text-right">Disbursed</span>
                  <span className="w-[40px]"></span>
                </div>
                {coverageData.activitiesByPriority[drillNode.id].map((act: AlignedActivity) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 py-2.5 px-3 border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium truncate">{act.title}</p>
                      {act.iati_id && (
                        <p className="text-xs text-muted-foreground font-mono truncate">{act.iati_id}</p>
                      )}
                    </div>
                    <span className="w-[120px] text-right text-body font-medium">
                      {formatCurrency(act.funding)}
                    </span>
                    <a
                      href={`/activities/${act.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-[40px] flex justify-end text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-body text-muted-foreground">
                No activities aligned to this priority
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
