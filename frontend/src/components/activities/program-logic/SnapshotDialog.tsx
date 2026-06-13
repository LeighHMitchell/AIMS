"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, GitCompare, History, Loader2, PlusCircle } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { RequiredDot } from "@/components/ui/required-dot";
import { toast } from "sonner";
import type {
  LogicSnapshotRow,
  ProgramLogicRow,
  SnapshotDiff,
} from "@/lib/program-logic/types";
import { listSnapshots, createSnapshot, diffSnapshots } from "./api";

interface SnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  logic: ProgramLogicRow;
  onChanged: () => void;
}

export function SnapshotDialog({
  open,
  onOpenChange,
  logicId,
  logic,
  onChanged,
}: SnapshotDialogProps) {
  const [snapshots, setSnapshots] = useState<LogicSnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { snapshots } = await listSnapshots(logicId);
      setSnapshots(snapshots);
    } catch (e: any) {
      toast.error(e.message || "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      load();
      setDiff(null);
      setRevisionLabel("");
      setRevisionReason("");
    }
  }, [open]);

  const hasBaseline = logic.status !== "draft";

  const handleBaseline = async () => {
    setBusy(true);
    try {
      await createSnapshot(logicId, { snapshot_type: "baseline" });
      toast.success("Baseline set. Status is now ‘baselined’");
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to set baseline");
    } finally {
      setBusy(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionReason.trim()) {
      toast.error("A reason is required for a revision");
      return;
    }
    setBusy(true);
    try {
      await createSnapshot(logicId, {
        snapshot_type: "revision",
        version_label: revisionLabel.trim() || undefined,
        reason: revisionReason.trim(),
      });
      toast.success("Revision recorded");
      setRevisionLabel("");
      setRevisionReason("");
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to record revision");
    } finally {
      setBusy(false);
    }
  };

  const handleDiff = async () => {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Pick two different snapshots to compare");
      return;
    }
    try {
      const d = await diffSnapshots(logicId, fromId, toId);
      setDiff(d);
    } catch (e: any) {
      toast.error(e.message || "Failed to diff snapshots");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>Versions &amp; Snapshots</DialogTitle>
          <DialogDescription>
            Save a point-in-time version of this program logic, then compare or restore earlier snapshots.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 space-y-5">
          {/* Baseline / revision controls */}
          {!hasBaseline ? (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Flag className="h-4 w-4" /> Set the baseline
                <HelpTextTooltip
                  size="sm"
                  content="Saves a full snapshot of the current graph as the baseline and moves status from draft to baselined. Do this once the design is agreed; afterwards, changes are tracked as named revisions."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Locks the current design as the baseline snapshot and moves status from
                draft to baselined. Later changes are captured as revisions.
              </p>
              <Button onClick={handleBaseline} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4 mr-2" />
                )}
                Set baseline
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PlusCircle className="h-4 w-4" /> Record a revision
                <HelpTextTooltip
                  size="sm"
                  content="Captures a new snapshot of the current graph with a label and a required reason: the audit trail for changes after baseline (e.g. ‘Rev 1, Mid-Term Review 2026’). Editing an end-outcome node also prompts for a revision reason."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Version Label</Label>
                <Input
                  value={revisionLabel}
                  onChange={(e) => setRevisionLabel(e.target.value)}
                  placeholder="e.g. Rev 1, MTR 2026"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Reason <RequiredDot />
                </Label>
                <Input
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Why is this revision being recorded?"
                />
              </div>
              <Button onClick={handleRevision} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-2" />
                )}
                Record revision
              </Button>
            </div>
          )}

          <Separator />

          {/* History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Snapshot history
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No snapshots yet.</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border p-3 flex items-start gap-2"
                  >
                    <Badge
                      variant={s.snapshot_type === "baseline" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {s.snapshot_type}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.version_label}</p>
                      {s.reason && (
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diff */}
          {snapshots.length >= 2 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <GitCompare className="h-4 w-4" /> Compare snapshots
                  <HelpTextTooltip
                    size="sm"
                    content="Pick two snapshots to see what changed between them: nodes and edges added, removed, or modified. Useful for showing how the logic evolved from baseline through each revision."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.version_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.version_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleDiff}>
                    Compare
                  </Button>
                </div>

                {diff && (
                  <div className="rounded-lg border border-border p-3 space-y-3 text-sm">
                    <DiffBlock
                      title="Nodes"
                      added={diff.nodes.added.length}
                      removed={diff.nodes.removed.length}
                      changed={diff.nodes.changed.length}
                    />
                    {diff.nodes.added.map((n) => (
                      <DiffLine key={`na-${n.id}`} kind="added" text={n.statement} />
                    ))}
                    {diff.nodes.removed.map((n) => (
                      <DiffLine key={`nr-${n.id}`} kind="removed" text={n.statement} />
                    ))}
                    {diff.nodes.changed.map((n) => (
                      <DiffLine
                        key={`nc-${n.id}`}
                        kind="changed"
                        text={`${n.statement} (${n.changes?.map((c) => c.field).join(", ")})`}
                      />
                    ))}
                    <Separator />
                    <DiffBlock
                      title="Edges"
                      added={diff.edges.added.length}
                      removed={diff.edges.removed.length}
                      changed={diff.edges.changed.length}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffBlock({
  title,
  added,
  removed,
  changed,
}: {
  title: string;
  added: number;
  removed: number;
  changed: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{title}:</span>
      <Badge variant="outline" className="text-xs text-green-700 border-green-300">
        +{added} added
      </Badge>
      <Badge variant="outline" className="text-xs text-red-700 border-red-300">
        −{removed} removed
      </Badge>
      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
        ~{changed} changed
      </Badge>
    </div>
  );
}

function DiffLine({
  kind,
  text,
}: {
  kind: "added" | "removed" | "changed";
  text: string;
}) {
  const color =
    kind === "added"
      ? "text-green-700"
      : kind === "removed"
      ? "text-red-700"
      : "text-amber-700";
  const sign = kind === "added" ? "+" : kind === "removed" ? "−" : "~";
  return (
    <p className={`text-xs ${color} pl-2`}>
      {sign} {text}
    </p>
  );
}
