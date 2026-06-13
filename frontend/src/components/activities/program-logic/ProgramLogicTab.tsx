"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  History,
  Layers,
  Link2,
  Network,
  Pencil,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import type {
  ProgramLogicGraph,
  LogicNodeRow,
  LogicTierRow,
  ValidationReport,
} from "@/lib/program-logic/types";
import { boundaryOrder } from "@/lib/program-logic/service";
import { FRAMEWORK_PRESETS } from "@/lib/program-logic/presets";
import {
  getGraphForActivity,
  getInvestmentActivities,
  deleteNode,
  deleteLogic,
  deleteTier,
  updateNode,
  validate,
  type InvestmentActivity,
} from "./api";
import { PresetPicker } from "./PresetPicker";
import { TierDialog } from "./TierDialog";
import { NodeDialog } from "./NodeDialog";
import { EdgeDialog } from "./EdgeDialog";
import { IndicatorDrawer } from "./IndicatorDrawer";
import { RollupDialog } from "./RollupDialog";
import { SnapshotDialog } from "./SnapshotDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { DiagramDialog } from "./DiagramDialog";

interface ProgramLogicTabProps {
  activityId: string;
  readOnly?: boolean;
}

type Scope = "investment" | string; // 'investment' or an activity id

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  baselined: "Baselined",
  active: "Active",
  closed: "Closed",
};

export function ProgramLogicTab({ activityId, readOnly = false }: ProgramLogicTabProps) {
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<ProgramLogicGraph | null>(null);
  const [notSetup, setNotSetup] = useState(false);
  const [activities, setActivities] = useState<InvestmentActivity[]>([]);
  const [scope, setScope] = useState<Scope>("investment");
  const [extraScopes, setExtraScopes] = useState<string[]>([]);

  // dialog state
  const [presetOpen, setPresetOpen] = useState(false);
  const [tierDialog, setTierDialog] = useState<{ tier: LogicTierRow | null } | null>(null);
  const [nodeDialog, setNodeDialog] = useState<{ node: LogicNodeRow | null; tierId?: string } | null>(null);
  const [edgeNode, setEdgeNode] = useState<LogicNodeRow | null>(null);
  const [indicatorNode, setIndicatorNode] = useState<LogicNodeRow | null>(null);
  const [rollupNode, setRollupNode] = useState<LogicNodeRow | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);

  const refetch = useCallback(async () => {
    // any edit invalidates a prior "Validated" result
    setValidation(null);
    try {
      const res = await getGraphForActivity(activityId);
      if ((res as any).logic === null) {
        setNotSetup(true);
        setGraph(null);
      } else {
        setNotSetup(false);
        setGraph(res as ProgramLogicGraph);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load program logic");
    }
  }, [activityId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGraphForActivity(activityId)
      .then((res) => {
        if (!active) return;
        if ((res as any).logic === null) setNotSetup(true);
        else setGraph(res as ProgramLogicGraph);
      })
      .catch((e) => toast.error(e.message || "Failed to load program logic"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [activityId]);

  // load investment activities once we have a logic
  useEffect(() => {
    if (!graph) return;
    getInvestmentActivities(graph.logic.id)
      .then((r) => setActivities(r.activities))
      .catch(() => {});
  }, [graph?.logic.id]);

  const activityNames = useMemo(
    () => new Map(activities.map((a) => [a.id, a.title])),
    [activities]
  );

  const tiersAsc = useMemo(
    () => (graph ? [...graph.tiers].sort((a, b) => a.level_order - b.level_order) : []),
    [graph]
  );
  const tiersDesc = useMemo(() => [...tiersAsc].reverse(), [tiersAsc]);
  const bOrder = useMemo(() => boundaryOrder(graph?.tiers ?? []), [graph]);
  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph]
  );

  // scope toggle options
  const scopeActivityIds = useMemo(() => {
    const withNodes = new Set(
      (graph?.nodes ?? [])
        .filter((n) => n.scope === "activity" && n.activity_id)
        .map((n) => n.activity_id as string)
    );
    extraScopes.forEach((id) => withNodes.add(id));
    return Array.from(withNodes);
  }, [graph, extraScopes]);

  // nodes for the current scope, grouped by tier
  const nodesForScope = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) =>
      scope === "investment"
        ? n.scope === "investment"
        : n.scope === "activity" && n.activity_id === scope
    );
  }, [graph, scope]);

  const nodesByTier = useMemo(() => {
    const map = new Map<string, LogicNodeRow[]>();
    nodesForScope
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((n) => {
        if (!map.has(n.tier_id)) map.set(n.tier_id, []);
        map.get(n.tier_id)!.push(n);
      });
    return map;
  }, [nodesForScope]);

  const edgeCounts = useMemo(() => {
    const out = new Map<string, number>();
    const inc = new Map<string, number>();
    (graph?.edges ?? []).forEach((e) => {
      out.set(e.from_node_id, (out.get(e.from_node_id) ?? 0) + 1);
      inc.set(e.to_node_id, (inc.get(e.to_node_id) ?? 0) + 1);
    });
    return { out, inc };
  }, [graph]);

  const indicatorCounts = useMemo(() => {
    const m = new Map<string, number>();
    (graph?.indicator_links ?? []).forEach((l) =>
      m.set(l.node_id, (m.get(l.node_id) ?? 0) + 1)
    );
    return m;
  }, [graph]);

  const canEdit = !readOnly;

  const handleDeleteNode = async (node: LogicNodeRow) => {
    const requiresReason =
      graph!.logic.status !== "draft" &&
      bOrder !== null &&
      (tiersAsc.find((t) => t.id === node.tier_id)?.level_order ?? -1) >= bOrder;
    let reason: string | undefined;
    if (requiresReason) {
      reason =
        window.prompt(
          "This node is at/above the accountability ceiling and the logic is baselined. Enter a revision reason to delete it:"
        ) || undefined;
      if (!reason) return;
    } else if (!window.confirm(`Delete node “${node.statement}”? Its links are removed too.`)) {
      return;
    }
    try {
      await deleteNode(graph!.logic.id, node.id, reason);
      toast.success("Node deleted");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete node");
    }
  };

  const moveNode = async (node: LogicNodeRow, dir: -1 | 1) => {
    const siblings = nodesByTier.get(node.tier_id) ?? [];
    const idx = siblings.findIndex((n) => n.id === node.id);
    const swapWith = siblings[idx + dir];
    if (!swapWith) return;
    try {
      await Promise.all([
        updateNode(graph!.logic.id, node.id, { sort_order: swapWith.sort_order }),
        updateNode(graph!.logic.id, swapWith.id, { sort_order: node.sort_order }),
      ]);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to reorder");
    }
  };

  const runValidation = async () => {
    try {
      const report = await validate(graph!.logic.id);
      setValidation(report);
    } catch (e: any) {
      toast.error(e.message || "Validation failed");
    }
  };

  const handleDeleteLogic = async () => {
    if (!graph) return;
    try {
      await deleteLogic(graph.logic.id);
      toast.success("Program logic deleted. You can create a new one");
      setGraph(null);
      setNotSetup(true);
      setScope("investment");
      setExtraScopes([]);
      setValidation(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete program logic");
      throw e; // keep the confirm dialog open on failure
    }
  };

  const askDeleteLogic = () =>
    setConfirm({
      title: "Delete Program Logic?",
      description: (
        <>
          This permanently removes the entire program logic for this investment:
          every tier, node, contribution link, indicator link and snapshot. This
          cannot be undone. You can then create a new one from any framework.
        </>
      ),
      confirmLabel: "Delete program logic",
      onConfirm: handleDeleteLogic,
    });

  const askDeleteTier = (tier: LogicTierRow) => {
    const count = nodesByTier.get(tier.id)?.length ?? 0;
    setConfirm({
      title: "Delete Tier?",
      description:
        count > 0 ? (
          <>
            “{tier.name}” still has {count} node{count === 1 ? "" : "s"}. Move or
            delete those first; a tier with nodes can't be removed.
          </>
        ) : (
          <>Remove the “{tier.name}” tier from this program logic?</>
        ),
      confirmLabel: "Delete tier",
      onConfirm: async () => {
        await deleteTier(graph!.logic.id, tier.id);
        toast.success("Tier deleted");
        refetch();
      },
    });
  };

  // --- render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (notSetup) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-lg">
        <img
          src="/short-code-icon.png"
          alt=""
          className="h-20 w-auto mx-auto mb-3 object-contain"
        />
        <h3 className="text-lg font-semibold">No program logic yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
          Build a design-level results framework (theory of change) for this
          investment. Pick a framework to seed the tiers, then add and connect your
          statements of change.
        </p>
        {canEdit && (
          <Button className="mt-4" onClick={() => setPresetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create program logic
          </Button>
        )}
        <PresetPicker
          open={presetOpen}
          onOpenChange={setPresetOpen}
          activityId={activityId}
          onCreated={() => {
            setLoading(true);
            refetch().finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  if (!graph) return null;
  const { logic } = graph;
  const presetLabel = FRAMEWORK_PRESETS[logic.framework_preset]?.label ?? logic.framework_preset;
  const nextTierOrder = graph.tiers.length
    ? Math.max(...graph.tiers.map((t) => t.level_order)) + 1
    : 0;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold truncate">{logic.title}</h3>
            <HelpTextTooltip
              size="sm"
              content="A program logic is the design-level theory of change for this investment: tiers of statements (outputs → outcomes → impact) connected by contribution links. It sits above the machine-readable IATI results and is never exported to IATI; only any indicators you link to it export."
            />
            <Badge variant="secondary">{presetLabel}</Badge>
            <HelpTextTooltip
              size="sm"
              content="The framework preset that seeded the tier vocabulary (e.g. DFAT, USAID, World Bank). Tiers stay fully editable after seeding."
            />
            <Badge variant={logic.status === "draft" ? "outline" : "default"}>
              {STATUS_LABEL[logic.status] ?? logic.status}
            </Badge>
            <HelpTextTooltip
              size="sm"
              content="Lifecycle status. Draft = freely editable. Baselined = the design has been locked as a baseline snapshot; later changes should be recorded as revisions. Active / Closed track the investment's life."
            />
          </div>
          {logic.description && (
            <p className="text-sm text-muted-foreground mt-1">{logic.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTierDialog({ tier: null })}
            >
              <Layers className="h-4 w-4 mr-1" /> Add tier
            </Button>
          )}
          {validation && validation.findings.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={runValidation}
              className="border-green-300 text-green-700 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Validated
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={runValidation}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Validate
            </Button>
          )}
          <HelpTextTooltip
            size="sm"
            content="Checks the graph for problems: cycles (blocking), orphan nodes with no links, same-tier or downward edges, reverse cross-scope roll-ups, and nodes above the accountability ceiling reached only by attribution edges. Turns green when there are no issues."
          />
          <Button variant="outline" size="sm" onClick={() => setDiagramOpen(true)}>
            <Network className="h-4 w-4 mr-1" /> Diagram
          </Button>
          <HelpTextTooltip
            size="sm"
            content="View the program logic as a flowchart (Mermaid): activities at the base up to the goal, solid arrows for attribution and dotted for contribution. Copy the Mermaid text or download the SVG."
          />
          <Button variant="outline" size="sm" onClick={() => setSnapshotOpen(true)}>
            <History className="h-4 w-4 mr-1" /> Versions
          </Button>
          <HelpTextTooltip
            size="sm"
            content="Set the baseline (locks the current design) and record named revisions over time. You can compare any two snapshots to see what changed."
          />
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={askDeleteLogic}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <HelpTextTooltip
                size="sm"
                content="Delete this entire program logic (every tier, node, link and snapshot) so you can start afresh with a different framework. This cannot be undone."
              />
            </>
          )}
        </div>
      </div>

      {/* Validation panel — only shown when there are issues to surface */}
      {validation && validation.findings.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${validation.ok ? "text-amber-600" : "text-red-600"}`}
              />
              Validation found {validation.ok ? "issues to review" : "blocking issues"}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setValidation(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {validation.findings.map((f, i) => (
              <li
                key={i}
                className={`text-sm flex items-start gap-2 ${
                  f.severity === "error" ? "text-red-700" : "text-amber-700"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scope toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Scope</span>
        <HelpTextTooltip
          size="sm"
          content="Switch between the umbrella investment logic and an individual activity's sub-logic. Activity nodes can roll up into the investment logic via contribution links. Use ‘+ Add activity sub-logic’ to start building one for a child activity."
        />
        <Button
          variant={scope === "investment" ? "default" : "outline"}
          size="sm"
          onClick={() => setScope("investment")}
        >
          Investment
        </Button>
        {scopeActivityIds.map((id) => (
          <Button
            key={id}
            variant={scope === id ? "default" : "outline"}
            size="sm"
            onClick={() => setScope(id)}
            className="max-w-[200px] truncate"
          >
            {activityNames.get(id) ?? "Activity"}
          </Button>
        ))}
        {canEdit && activities.filter((a) => !a.is_umbrella && !scopeActivityIds.includes(a.id)).length > 0 && (
          <Select
            value=""
            onValueChange={(id) => {
              setExtraScopes((s) => [...s, id]);
              setScope(id);
            }}
          >
            <SelectTrigger className="h-8 w-56 text-sm">
              <SelectValue placeholder="+ Add activity sub-logic" />
            </SelectTrigger>
            <SelectContent>
              {activities
                .filter((a) => !a.is_umbrella && !scopeActivityIds.includes(a.id))
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {scope !== "investment" && (
        <p className="text-xs text-muted-foreground -mt-2">
          Building the activity sub-logic for{" "}
          <span className="font-medium">{activityNames.get(scope) ?? "this activity"}</span>.
          Its nodes can roll up into the investment logic via contribution links.
        </p>
      )}

      {/* Builder legend */}
      {tiersDesc.length > 0 && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center">
          Tiers run impact/goal at the top down to immediate change at the bottom
          <HelpTextTooltip
            size="sm"
            content="Each row is a tier. Cards within a tier are statements of intended change. ‘output / outcome / impact’ badges show how a tier's linked indicators map for IATI export."
          />
        </span>
        <span className="inline-flex items-center">
          <Link2 className="h-3.5 w-3.5 mr-1" /> links
          <HelpTextTooltip
            size="sm"
            content="Open a node's contribution links: pick the higher-tier node(s) it feeds into, and set each link as contribution or attribution. Shows ‘N up · N in’ (outgoing / incoming)."
          />
        </span>
        <span className="inline-flex items-center">
          <Target className="h-3.5 w-3.5 mr-1" /> indicators
          <HelpTextTooltip
            size="sm"
            content="Attach existing IATI result indicators as measurement evidence for a node. Optional, since a node can have zero. Linking never creates an indicator; unlinking never deletes one."
          />
        </span>
        <span className="inline-flex items-center">
          <GitBranch className="h-3.5 w-3.5 mr-1" /> roll-up
          <HelpTextTooltip
            size="sm"
            content="See every node (including activity sub-logic nodes) that contributes to this node directly or transitively."
          />
        </span>
      </div>
      )}

      {/* Tiered builder (top = impact/goal) */}
      <div className="space-y-4">
        {tiersDesc.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h4 className="font-medium">No tiers yet</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              This is a custom logic. Add your tiers (for example Activities, Outputs,
              Outcomes, Impact) from the bottom up, then add nodes within each.
            </p>
            {canEdit && (
              <Button className="mt-3" onClick={() => setTierDialog({ tier: null })}>
                <Plus className="h-4 w-4 mr-1" /> Add your first tier
              </Button>
            )}
          </div>
        )}
        {tiersDesc.map((tier, tierIdx) => {
          const nodes = nodesByTier.get(tier.id) ?? [];
          return (
            <React.Fragment key={tier.id}>
              {tier.attribution_boundary && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-dashed border-amber-400" />
                  <span className="inline-flex items-center text-xs font-medium text-amber-600">
                    Accountability ceiling
                    <HelpTextTooltip
                      size="sm"
                      content="The tier the implementer is accountable to deliver. Links crossing above this line (to higher tiers) default to ‘contribution’, meaning you influence but don't solely cause the higher result. At or below it, ‘attribution’ is allowed."
                    />
                  </span>
                  <div className="flex-1 border-t border-dashed border-amber-400" />
                </div>
              )}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="group flex items-center justify-between bg-muted/40 px-4 py-2 border-b border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {tierIdx + 1}
                    </span>
                    <span className="font-medium text-sm">{tier.name}</span>
                    <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {tier.short_code}
                    </span>
                  </div>
                {canEdit && (
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNodeDialog({ node: null, tierId: tier.id })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add node
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit tier"
                      onClick={() => setTierDialog({ tier })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Delete tier"
                      onClick={() => askDeleteTier(tier)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                {nodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1 py-2">
                    No {tier.name.toLowerCase()} yet.
                  </p>
                ) : (
                  nodes.map((node, idx) => (
                    <div
                      key={node.id}
                      className="group rounded-md border border-border p-3 bg-card"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{node.statement}</p>
                          {node.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {node.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-100"
                              onClick={() => setEdgeNode(node)}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              {edgeCounts.out.get(node.id) ?? 0} up ·{" "}
                              {edgeCounts.inc.get(node.id) ?? 0} in
                            </button>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              onClick={() => setIndicatorNode(node)}
                            >
                              <Target className="h-3.5 w-3.5" />
                              {indicatorCounts.get(node.id) ?? 0} indicators
                            </button>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              onClick={() => setRollupNode(node)}
                            >
                              <GitBranch className="h-3.5 w-3.5" />
                              roll-up
                            </button>
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => moveNode(node, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === nodes.length - 1}
                              onClick={() => moveNode(node, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setNodeDialog({ node })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteNode(node)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Dialogs */}
      {tierDialog && (
        <TierDialog
          open={!!tierDialog}
          onOpenChange={(o) => !o && setTierDialog(null)}
          logicId={logic.id}
          tier={tierDialog.tier}
          nextLevelOrder={nextTierOrder}
          onSaved={refetch}
        />
      )}

      {nodeDialog && (
        <NodeDialog
          open={!!nodeDialog}
          onOpenChange={(o) => !o && setNodeDialog(null)}
          logicId={logic.id}
          logicStatus={logic.status}
          tiers={tiersAsc}
          boundaryLevelOrder={bOrder}
          scope={scope === "investment" ? "investment" : "activity"}
          activityId={scope === "investment" ? undefined : scope}
          node={nodeDialog.node}
          defaultTierId={nodeDialog.tierId}
          onSaved={refetch}
        />
      )}

      <EdgeDialog
        open={!!edgeNode}
        onOpenChange={(o) => !o && setEdgeNode(null)}
        logicId={logic.id}
        source={edgeNode}
        nodes={graph.nodes}
        edges={graph.edges}
        tiers={graph.tiers}
        onChanged={refetch}
      />

      <IndicatorDrawer
        open={!!indicatorNode}
        onOpenChange={(o) => !o && setIndicatorNode(null)}
        logicId={logic.id}
        node={indicatorNode}
        onChanged={refetch}
      />

      <RollupDialog
        open={!!rollupNode}
        onOpenChange={(o) => !o && setRollupNode(null)}
        logicId={logic.id}
        node={rollupNode}
        tiers={graph.tiers}
        activityNames={activityNames}
      />

      <SnapshotDialog
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        logicId={logic.id}
        logic={logic}
        onChanged={refetch}
      />

      <DiagramDialog open={diagramOpen} onOpenChange={setDiagramOpen} graph={graph} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? null}
        confirmLabel={confirm?.confirmLabel}
        destructive
        onConfirm={async () => {
          await confirm?.onConfirm();
        }}
      />
    </div>
  );
}

export default ProgramLogicTab;
