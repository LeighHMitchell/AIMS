"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitBranch } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { toast } from "sonner";
import type { LogicNodeRow, LogicTierRow } from "@/lib/program-logic/types";
import { getRollup } from "./api";

interface RollupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  node: LogicNodeRow | null;
  tiers: LogicTierRow[];
  activityNames?: Map<string, string>;
}

export function RollupDialog({
  open,
  onOpenChange,
  logicId,
  node,
  tiers,
  activityNames,
}: RollupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contributors, setContributors] = useState<LogicNodeRow[]>([]);
  const tierById = new Map(tiers.map((t) => [t.id, t]));

  useEffect(() => {
    if (!open || !node) return;
    setLoading(true);
    getRollup(logicId, node.id)
      .then((r) => setContributors(r.contributors))
      .catch((e) => toast.error(e.message || "Failed to load roll-up"))
      .finally(() => setLoading(false));
  }, [open, node, logicId]);

  const activityContributors = contributors.filter((n) => n.scope === "activity");
  const investmentContributors = contributors.filter((n) => n.scope === "investment");

  const Row = ({ n }: { n: LogicNodeRow }) => {
    const t = tierById.get(n.tier_id);
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border p-3">
        <Badge variant="outline" className="font-mono text-xs shrink-0">
          {t?.short_code ?? "?"}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm">{n.statement}</p>
          {n.scope === "activity" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {n.activity_id
                ? activityNames?.get(n.activity_id) ?? "Activity sub-logic"
                : "Activity sub-logic"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>Roll-up — what contributes to this node</DialogTitle>
        </DialogHeader>

        <div className="pt-2 space-y-5">
          {node && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <GitBranch className="h-3.5 w-3.5" />
                Target node
                <HelpTextTooltip
                  size="sm"
                  content="Everything listed below contributes to this node — directly or through a chain of contribution links. Activity sub-logic nodes appear here once they roll up, which is how an activity shows under an investment outcome."
                />
              </div>
              <p className="text-sm font-medium">{node.statement}</p>
            </div>
          )}

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : contributors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing contributes to this node yet.
            </p>
          ) : (
            <>
              {activityContributors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Contributing activity nodes ({activityContributors.length})
                  </h4>
                  {activityContributors.map((n) => (
                    <Row key={n.id} n={n} />
                  ))}
                </div>
              )}
              {investmentContributors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    Contributing investment nodes ({investmentContributors.length})
                  </h4>
                  {investmentContributors.map((n) => (
                    <Row key={n.id} n={n} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
