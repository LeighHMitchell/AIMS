"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ProgramLogicGraph } from "@/lib/program-logic/types";
import { toMermaid } from "@/lib/program-logic/mermaid";

interface DiagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: ProgramLogicGraph;
  /** optional subset of node ids to render (defaults to all) */
  includeNodeIds?: Set<string>;
}

export function DiagramDialog({
  open,
  onOpenChange,
  graph,
  includeNodeIds,
}: DiagramDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(
    () => toMermaid(graph, includeNodeIds),
    [graph, includeNodeIds]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setRendering(true);
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        // securityLevel 'strict' makes mermaid sanitize its SVG output (via its
        // bundled DOMPurify) and render labels as plain SVG text, not HTML — so
        // assigning the returned svg to innerHTML below is safe.
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "strict",
          // Tier band titles: larger + bold. Injected into the SVG's <style>;
          // survives securityLevel 'strict' (verified).
          themeCSS:
            ".cluster-label text, .cluster-label tspan, .cluster-label .nodeLabel { font-weight: 700; font-size: 19px; }",
          themeVariables: {
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: "13px",
            lineColor: "#94a3b8",
            primaryColor: "#f1f5f9",
            primaryBorderColor: "#cbd5e1",
            primaryTextColor: "#334155",
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: false,
            curve: "basis",
            nodeSpacing: 45,
            rankSpacing: 70,
            padding: 10,
          },
        });
        const id = "pl-mermaid-" + Math.random().toString(36).slice(2);
        const { svg } = await mermaid.render(id, definition);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to render diagram");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, definition]);

  const copyDefinition = async () => {
    try {
      await navigator.clipboard.writeText(definition);
      toast.success("Mermaid definition copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const downloadSvg = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "program-logic.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-surface-muted -m-6 mb-0 p-6 rounded-t-lg border-b border-border">
          <DialogTitle>Program Logic Diagram</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between pt-3">
          <p className="text-xs text-muted-foreground">
            Bottom-up: activities at the base, goal at the top.{" "}
            <span className="inline-flex items-center gap-1">
              Solid arrow = attribution
            </span>{" "}
            · dotted arrow = contribution · highlighted band = accountability
            ceiling.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={copyDefinition}>
              <Copy className="h-4 w-4 mr-1" /> Copy Mermaid
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSvg}>
              <Download className="h-4 w-4 mr-1" /> SVG
            </Button>
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-auto rounded-lg border border-border bg-white p-4">
          {rendering && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering diagram…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-700">
              Couldn't render the diagram: {error}
              <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {definition}
              </pre>
            </div>
          )}
          {/* mermaid injects the SVG here */}
          <div ref={containerRef} className={error ? "hidden" : ""} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
