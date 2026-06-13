"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { RequiredDot } from "@/components/ui/required-dot";
import { toast } from "sonner";
import type { LogicNodeRow, LogicTierRow } from "@/lib/program-logic/types";
import { createNode, updateNode } from "./api";

interface NodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  logicStatus: string;
  tiers: LogicTierRow[]; // ascending level_order
  boundaryLevelOrder: number | null;
  /** scope context from the current view */
  scope: "investment" | "activity";
  activityId?: string;
  /** existing node to edit, or null to create */
  node: LogicNodeRow | null;
  /** preselected tier for create */
  defaultTierId?: string;
  onSaved: () => void;
}

export function NodeDialog({
  open,
  onOpenChange,
  logicId,
  logicStatus,
  tiers,
  boundaryLevelOrder,
  scope,
  activityId,
  node,
  defaultTierId,
  onSaved,
}: NodeDialogProps) {
  const isEdit = !!node;
  const [tierId, setTierId] = useState("");
  const [statement, setStatement] = useState("");
  const [description, setDescription] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTierId(node?.tier_id || defaultTierId || tiers[tiers.length - 1]?.id || "");
    setStatement(node?.statement || "");
    setDescription(node?.description || "");
    setRevisionReason("");
  }, [open, node, defaultTierId, tiers]);

  const selectedTier = tiers.find((t) => t.id === tierId);
  // Editing/deleting an at-or-above-ceiling node after baseline requires a reason.
  const requiresRevision = useMemo(() => {
    if (!isEdit || logicStatus === "draft" || boundaryLevelOrder === null) return false;
    return !!selectedTier && selectedTier.level_order >= boundaryLevelOrder;
  }, [isEdit, logicStatus, boundaryLevelOrder, selectedTier]);

  const handleSave = async () => {
    if (!statement.trim()) {
      toast.error("A statement is required");
      return;
    }
    if (!tierId) {
      toast.error("Select a tier");
      return;
    }
    if (requiresRevision && !revisionReason.trim()) {
      toast.error("A revision reason is required to change this node");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateNode(logicId, node!.id, {
          tier_id: tierId,
          statement: statement.trim(),
          description: description.trim() || null,
          ...(requiresRevision ? { revision_reason: revisionReason.trim() } : {}),
        });
        toast.success(requiresRevision ? "Node updated and revision recorded" : "Node updated");
      } else {
        await createNode(logicId, {
          tier_id: tierId,
          statement: statement.trim(),
          description: description.trim() || null,
          scope,
          activity_id: scope === "activity" ? activityId : null,
        });
        toast.success("Node added");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save node");
    } finally {
      setSaving(false);
    }
  };

  // top-to-bottom (impact/goal first) for the tier dropdown
  const tiersDesc = [...tiers].sort((a, b) => b.level_order - a.level_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>{isEdit ? "Edit Node" : "Add Node"}</DialogTitle>
          <DialogDescription>
            Describe a single result in your program logic: its label, level and supporting detail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="inline-flex items-center">
              Tier
              <RequiredDot />
              <HelpTextTooltip
                size="sm"
                content="Which level of the results chain this statement sits at (e.g. Output, Intermediate Outcome). Tiers are listed top-to-bottom from impact/goal down to activities."
              />
            </Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tier" />
              </SelectTrigger>
              <SelectContent>
                {tiersDesc.map((t) => (
                  <React.Fragment key={t.id}>
                    {t.attribution_boundary && (
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <div className="flex-1 border-t border-dashed border-amber-400" />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600">
                          Accountability ceiling
                        </span>
                        <div className="flex-1 border-t border-dashed border-amber-400" />
                      </div>
                    )}
                    <SelectItem value={t.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {t.short_code}
                        </span>
                        {t.name}
                      </span>
                    </SelectItem>
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-statement" className="inline-flex items-center">
              Statement
              <RequiredDot />
              <HelpTextTooltip
                size="sm"
                content="The change you intend at this tier, written as a result, e.g. ‘Smallholder farmers adopt improved practices’. This is a design statement, not an IATI activity record."
              />
            </Label>
            <Textarea
              id="node-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={2}
              placeholder="A statement of intended change at this tier."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-desc">Description</Label>
            <Textarea
              id="node-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {requiresRevision && (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Revision required
              </div>
              <p className="text-xs text-amber-700">
                This node is at or above the accountability ceiling and the logic is
                baselined. Record why it is changing; a revision snapshot will be saved.
              </p>
              <Input
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Reason for this revision"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Add node"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
