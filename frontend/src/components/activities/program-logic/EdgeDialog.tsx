"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { toast } from "sonner";
import type {
  LogicNodeRow,
  LogicEdgeRow,
  LogicTierRow,
  EdgeLinkType,
} from "@/lib/program-logic/types";
import { decideLinkType } from "@/lib/program-logic/service";
import { createEdge, deleteEdge, updateEdge } from "./api";

interface EdgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  source: LogicNodeRow | null;
  nodes: LogicNodeRow[];
  edges: LogicEdgeRow[];
  tiers: LogicTierRow[];
  onChanged: () => void;
}

export function EdgeDialog({
  open,
  onOpenChange,
  logicId,
  source,
  nodes,
  edges,
  tiers,
  onChanged,
}: EdgeDialogProps) {
  const [targetId, setTargetId] = useState("");
  const [linkType, setLinkType] = useState<EdgeLinkType | "auto">("auto");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);

  const tierById = useMemo(() => new Map(tiers.map((t) => [t.id, t])), [tiers]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // ceiling preview for the currently-selected target (null-safe so all hooks
  // run unconditionally before the early return below)
  const preview = useMemo(() => {
    if (!source) return null;
    const target = nodeById.get(targetId);
    if (!target) return null;
    return decideLinkType(tiers, source.tier_id, target.tier_id, null);
  }, [targetId, nodeById, tiers, source]);

  if (!source) return null;

  const outgoing = edges.filter((e) => e.from_node_id === source.id);
  const linkedTargetIds = new Set(outgoing.map((e) => e.to_node_id));

  // candidate parents: any other node not already linked from source
  const candidates = nodes
    .filter((n) => n.id !== source.id && !linkedTargetIds.has(n.id))
    .sort((a, b) => {
      const ta = tierById.get(a.tier_id)?.level_order ?? 0;
      const tb = tierById.get(b.tier_id)?.level_order ?? 0;
      return tb - ta; // higher tiers first
    });

  const tierLabel = (node: LogicNodeRow) => {
    const t = tierById.get(node.tier_id);
    return t ? `${t.short_code}` : "?";
  };

  const handleAdd = async () => {
    if (!targetId) {
      toast.error("Select a node to contribute to");
      return;
    }
    setBusy(true);
    try {
      const res = await createEdge(logicId, {
        from_node_id: source.id,
        to_node_id: targetId,
        link_type: linkType === "auto" ? undefined : linkType,
        rationale: rationale.trim() || undefined,
      });
      const d = res.link_type_decision;
      toast.success(
        `Linked as ${d.link_type}${d.crosses_ceiling ? " (crosses the accountability ceiling)" : ""}`
      );
      res.warnings?.forEach((w) => toast.warning(w));
      setTargetId("");
      setLinkType("auto");
      setRationale("");
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to create link");
    } finally {
      setBusy(false);
    }
  };

  const handleLinkTypeChange = async (edge: LogicEdgeRow, value: EdgeLinkType) => {
    try {
      await updateEdge(logicId, edge.id, { link_type: value });
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to update link");
    }
  };

  const handleRationaleBlur = async (edge: LogicEdgeRow, value: string) => {
    if ((edge.rationale || "") === value) return;
    try {
      await updateEdge(logicId, edge.id, { rationale: value || null });
    } catch (e: any) {
      toast.error(e.message || "Failed to save rationale");
    }
  };

  const handleDelete = async (edge: LogicEdgeRow) => {
    try {
      await deleteEdge(logicId, edge.id);
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>Contribution links</DialogTitle>
          <DialogDescription>
            Connect this result to others and set how much each one contributes, so progress rolls up through your program logic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                {tierLabel(source)}
              </Badge>
              This node contributes to:
            </div>
            <p className="text-sm font-medium">{source.statement}</p>
          </div>

          {/* Existing outgoing edges */}
          <div className="space-y-2">
            <Label className="inline-flex items-center">
              Links to higher-tier nodes
              <HelpTextTooltip
                size="sm"
                content="Each link rolls this node up into a higher node. A node may feed several parents and a parent may draw from several children (a many-to-many graph). Set each link as: Contribution (you help cause the higher result alongside others) or Attribution (the higher result is solely down to this node). Add an optional rationale (the if-then assumption)."
              />
            </Label>
            {outgoing.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No links yet. Add one below to roll this node up.
              </p>
            )}
            <div className="space-y-2">
              {outgoing.map((edge) => {
                const target = nodeById.get(edge.to_node_id);
                if (!target) return null;
                return (
                  <div
                    key={edge.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <ArrowUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {tierLabel(target)}
                      </Badge>
                      <span className="text-sm flex-1">{target.statement}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleDelete(edge)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Select
                        value={edge.link_type}
                        onValueChange={(v) =>
                          handleLinkTypeChange(edge, v as EdgeLinkType)
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contribution">Contribution</SelectItem>
                          <SelectItem value="attribution">Attribution</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        defaultValue={edge.rationale || ""}
                        placeholder="Rationale / assumption"
                        className="h-8 flex-1"
                        onBlur={(e) => handleRationaleBlur(edge, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add new link */}
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <Label className="inline-flex items-center">
              Add a contribution link
              <HelpTextTooltip
                size="sm"
                content="Choose the node this one contributes to. ‘Default’ picks the link type automatically: contribution when the link crosses above the accountability ceiling, otherwise your choice. You can always override it. Links that would create a loop are rejected."
              />
            </Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select the node this contributes to" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    [{tierLabel(n)}] {n.statement}
                    {n.scope === "activity" ? " · activity" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {preview && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{preview.explanation}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Select
                value={linkType}
                onValueChange={(v) => setLinkType(v as EdgeLinkType | "auto")}
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Default{preview ? ` (${preview.link_type})` : ""}
                  </SelectItem>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="attribution">Attribution</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Rationale"
                className="h-9 flex-1"
              />
              <Button onClick={handleAdd} disabled={busy || !targetId}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
