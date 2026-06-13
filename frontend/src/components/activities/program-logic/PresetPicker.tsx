"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { RequiredDot } from "@/components/ui/required-dot";
import { toast } from "sonner";
import {
  FRAMEWORK_PRESETS,
  FRAMEWORK_PRESET_KEYS,
  type FrameworkPreset,
} from "@/lib/program-logic/presets";
import { createLogic } from "./api";

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  defaultTitle?: string;
  onCreated: () => void;
}

export function PresetPicker({
  open,
  onOpenChange,
  activityId,
  defaultTitle,
  onCreated,
}: PresetPickerProps) {
  const [preset, setPreset] = useState<FrameworkPreset>("dac_default");
  const [title, setTitle] = useState(defaultTitle || "Program Logic");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = FRAMEWORK_PRESETS[preset];

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("A title is required");
      return;
    }
    setSaving(true);
    try {
      await createLogic({
        activityId,
        framework_preset: preset,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Program logic created");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create program logic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>Set up a program logic</DialogTitle>
          <DialogDescription>
            Pick a starting template and name your results framework before you begin adding nodes and links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pl-title">
              Title <RequiredDot />
            </Label>
            <Input
              id="pl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Theory of change for this investment"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pl-desc">Description</Label>
            <Textarea
              id="pl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="A short note on what this program logic represents."
            />
          </div>

          <div className="space-y-2">
            <Label className="inline-flex items-center">
              Framework
              <RequiredDot />
              <HelpTextTooltip
                size="sm"
                content="Every agency uses the same underlying results chain and differs only in how it names and cuts the tiers. Pick the one closest to your reporting; ‘Custom’ starts with no tiers so you can define your own."
              />
            </Label>
            <p className="text-sm text-muted-foreground">
              Pick a framework to seed the tier vocabulary. Tiers stay fully
              editable afterward.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FRAMEWORK_PRESET_KEYS.map((key) => {
                const def = FRAMEWORK_PRESETS[key];
                const active = key === preset;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      active
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{def.label}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {def.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier preview */}
          <div className="space-y-2">
            <Label className="inline-flex items-center">
              Tiers seeded by “{selected.label}”
              {selected.tiers.length === 0 && " (none yet, you'll add your own)"}
              <HelpTextTooltip
                size="sm"
                content="Preview of the tiers this preset creates, shown top (impact/goal) to bottom (activities/inputs). The ‘accountability ceiling’ tag marks the level the implementer is held to deliver; ‘output/outcome/impact’ tags map a tier's linked indicators for IATI export."
              />
            </Label>
            {selected.tiers.length > 0 && (
              <div className="rounded-lg border border-border divide-y divide-border">
                {[...selected.tiers]
                  .sort((a, b) => b.level_order - a.level_order)
                  .map((t) => (
                    <div
                      key={t.short_code}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {t.short_code}
                      </Badge>
                      <span className="flex-1">{t.name}</span>
                      {t.iati_result_type !== "none" && (
                        <Badge variant="secondary" className="text-xs">
                          {t.iati_result_type}
                        </Badge>
                      )}
                      {t.attribution_boundary && (
                        <Badge className="text-xs">accountability ceiling</Badge>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create program logic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
