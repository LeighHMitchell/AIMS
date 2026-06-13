"use client";

import React, { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { RequiredDot } from "@/components/ui/required-dot";
import { toast } from "sonner";
import type { LogicTierRow } from "@/lib/program-logic/types";
import type { IatiResultType } from "@/lib/program-logic/presets";
import { createTier, updateTier } from "./api";

interface TierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  /** existing tier to edit, or null to create */
  tier: LogicTierRow | null;
  /** default level_order for a new tier (max existing + 1) */
  nextLevelOrder: number;
  onSaved: () => void;
}

// IATI result/@type codes: Output=1, Outcome=2, Impact=3; None has no IATI code.
const IATI_OPTIONS: { value: IatiResultType; label: string; code: string }[] = [
  { value: "none", label: "None", code: "—" },
  { value: "output", label: "Output", code: "1" },
  { value: "outcome", label: "Outcome", code: "2" },
  { value: "impact", label: "Impact", code: "3" },
];

export function TierDialog({
  open,
  onOpenChange,
  logicId,
  tier,
  nextLevelOrder,
  onSaved,
}: TierDialogProps) {
  const isEdit = !!tier;
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [levelOrder, setLevelOrder] = useState(0);
  const [iati, setIati] = useState<IatiResultType>("none");
  const [boundary, setBoundary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(tier?.name || "");
    setShortCode(tier?.short_code || "");
    setLevelOrder(tier ? tier.level_order : nextLevelOrder);
    setIati(tier?.iati_result_type || "none");
    setBoundary(tier?.attribution_boundary || false);
  }, [open, tier, nextLevelOrder]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("A tier name is required");
      return;
    }
    if (!shortCode.trim()) {
      toast.error("A short code is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        short_code: shortCode.trim(),
        level_order: levelOrder,
        iati_result_type: iati,
        attribution_boundary: boundary,
      };
      if (isEdit) {
        await updateTier(logicId, tier!.id, body);
        toast.success("Tier updated");
      } else {
        await createTier(logicId, body);
        toast.success("Tier added");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      if (e.status === 409) {
        toast.error("Another tier already uses that position or short code");
      } else {
        toast.error(e.message || "Failed to save tier");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>{isEdit ? "Edit Tier" : "Add Tier"}</DialogTitle>
          <DialogDescription>
            Name a level in your results hierarchy and choose whether it aggregates progress from the tier below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="tier-name">
                Name <RequiredDot />
              </Label>
              <Input
                id="tier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. End-of-Program Outcome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-code" className="inline-flex items-center">
                Short Code
                <RequiredDot />
                <HelpTextTooltip
                  size="sm"
                  content="A short tag shown beside the tier name (e.g. EOPO, OUT, ACT). Must be unique within this logic."
                />
              </Label>
              <Input
                id="tier-code"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="EOPO"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-order" className="inline-flex items-center">
                Position
                <HelpTextTooltip
                  size="sm"
                  content="Order in the chain: 0 = most immediate (activities/inputs); higher numbers sit nearer impact/goal at the top. Each position must be unique."
                />
              </Label>
              <Input
                id="tier-order"
                type="number"
                value={levelOrder}
                onChange={(e) => setLevelOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="inline-flex items-center">
              IATI Result Type
              <HelpTextTooltip
                size="sm"
                content="Used only to map this tier's linked indicators when they export to IATI (Output=1, Outcome=2, Impact=3). ‘None’ for design-only tiers like inputs/objective/goal."
              />
            </Label>
            <Select value={iati} onValueChange={(v) => setIati(v as IatiResultType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IATI_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {o.code}
                      </span>
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label className="inline-flex items-center">
                Accountability Ceiling
                <HelpTextTooltip
                  size="sm"
                  content="Mark the tier the implementer is held accountable to deliver. Links crossing above it default to ‘contribution’. Typically only one tier carries this."
                />
              </Label>
              <p className="text-xs text-muted-foreground">
                The accountability boundary of the chain.
              </p>
            </div>
            <Switch checked={boundary} onCheckedChange={setBoundary} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Add tier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
