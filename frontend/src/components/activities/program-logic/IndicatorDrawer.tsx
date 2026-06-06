"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link2, Loader2, Search, Trash2, Target } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { toast } from "sonner";
import type { LogicNodeRow } from "@/lib/program-logic/types";
import {
  getNodeIndicators,
  searchIndicators,
  linkIndicator,
  unlinkIndicator,
  type LinkedIndicator,
  type IndicatorSearchResult,
} from "./api";

interface IndicatorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicId: string;
  node: LogicNodeRow | null;
  onChanged: () => void;
}

export function IndicatorDrawer({
  open,
  onOpenChange,
  logicId,
  node,
  onChanged,
}: IndicatorDrawerProps) {
  const [linked, setLinked] = useState<LinkedIndicator[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<IndicatorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadLinked = useCallback(async () => {
    if (!node) return;
    setLoadingLinked(true);
    try {
      const { links } = await getNodeIndicators(logicId, node.id);
      setLinked(links);
    } catch (e: any) {
      toast.error(e.message || "Failed to load linked indicators");
    } finally {
      setLoadingLinked(false);
    }
  }, [logicId, node]);

  useEffect(() => {
    if (open && node) {
      loadLinked();
      setQ("");
      setResults([]);
    }
  }, [open, node, loadLinked]);

  // debounced search
  useEffect(() => {
    if (!open || !node) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const { indicators } = await searchIndicators(logicId, q.trim());
        setResults(indicators);
      } catch (e: any) {
        toast.error(e.message || "Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, open, node, logicId]);

  const linkedIds = new Set(linked.map((l) => l.link.indicator_id));

  const handleLink = async (ind: IndicatorSearchResult) => {
    if (!node) return;
    try {
      await linkIndicator(logicId, node.id, ind.id);
      toast.success("Indicator linked");
      await loadLinked();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to link indicator");
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!node) return;
    try {
      await unlinkIndicator(logicId, node.id, linkId);
      toast.success("Indicator unlinked (the indicator itself is untouched)");
      await loadLinked();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to unlink indicator");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
        <SheetHeader className="bg-surface-muted p-6 border-b border-border">
          <SheetTitle>Measurement indicators</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {node && (
            <p className="text-sm text-muted-foreground">
              Link existing IATI result indicators as measurement evidence for{" "}
              <span className="font-medium text-foreground">“{node.statement}”</span>.
              Linking never creates an indicator; unlinking never deletes one.
            </p>
          )}

          {/* Linked */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold inline-flex items-center">
              Linked indicators
              <HelpTextTooltip
                size="sm"
                content="Indicators already attached to this node, with their latest baseline, target and actual shown read-only (edit these in the activity's Results tab). Removing a link here only detaches it — the indicator itself is untouched."
              />
            </h4>
            {loadingLinked ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : linked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet. A node with zero linked indicators is valid.
              </p>
            ) : (
              <div className="space-y-2">
                {linked.map((l) => {
                  const latest = l.periods[l.periods.length - 1];
                  return (
                    <div
                      key={l.link.id}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-sm flex-1 font-medium">
                          {localizedTitle(l.indicator?.title) || "(untitled indicator)"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleUnlink(l.link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs pl-6">
                        <Metric label="Baseline" value={l.baseline?.value} />
                        <Metric label="Target" value={latest?.target_value} />
                        <Metric label="Actual" value={latest?.actual_value} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Search */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold inline-flex items-center">
              Find indicators
              <HelpTextTooltip
                size="sm"
                content="Search indicators that already exist on this investment's activities (the umbrella activity and its children). The badges show the IATI result type and the result they belong to — handy when an agency separates, e.g., PDO from intermediate-results indicators."
              />
            </h4>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search this investment's indicators…"
                className="pl-9"
              />
            </div>
            {searching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <div className="space-y-2">
              {results
                .filter((r) => !linkedIds.has(r.id))
                .map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border p-3 flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.title || "(untitled indicator)"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {r.result_type && (
                          <Badge variant="secondary" className="text-xs">
                            {r.result_type}
                          </Badge>
                        )}
                        {r.reference_code && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {r.reference_code}
                          </Badge>
                        )}
                        {r.result_title && (
                          <span className="text-xs text-muted-foreground truncate">
                            {r.result_title}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleLink(r)}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      Link
                    </Button>
                  </div>
                ))}
              {!searching && results.filter((r) => !linkedIds.has(r.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No matching indicators in this investment's activities.
                </p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">
        {value === null || value === undefined ? "—" : value}
      </span>
    </span>
  );
}

function localizedTitle(title: any): string {
  if (!title) return "";
  if (typeof title === "string") return title;
  return title.en ?? (Object.values(title)[0] as string) ?? "";
}
