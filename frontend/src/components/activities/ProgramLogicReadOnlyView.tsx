"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ProgramLogicGraph } from "@/lib/program-logic/types";
import { toMermaid } from "@/lib/program-logic/mermaid";

interface ProgramLogicReadOnlyViewProps {
  graph: ProgramLogicGraph;
}

/**
 * Read-only presentation of an activity's reported Program Logic as a Mermaid
 * flowchart. Mirrors the rendering in the editor's DiagramDialog but without the
 * dialog chrome — intended to be embedded as a tab on the Activity Profile page.
 *
 * The diagram is bottom-up: activities at the base, the goal/impact at the top.
 * Solid arrows encode attribution, dotted arrows contribution, and the
 * accountability-ceiling tier is highlighted.
 */
export function ProgramLogicReadOnlyView({ graph }: ProgramLogicReadOnlyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(() => toMermaid(graph), [graph]);

  useEffect(() => {
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
        const id = "pl-profile-mermaid-" + Math.random().toString(36).slice(2);
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
  }, [definition]);

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
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-body font-semibold text-foreground">
            {graph.logic.title || "Program Logic"}
          </h2>
          {graph.logic.description && (
            <p className="mt-1 text-helper text-muted-foreground max-w-2xl">
              {graph.logic.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copyDefinition}>
            <Copy className="h-4 w-4 mr-1" /> Copy Mermaid
          </Button>
          <Button variant="outline" size="sm" onClick={downloadSvg}>
            <Download className="h-4 w-4 mr-1" /> SVG
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Bottom-up: activities at the base, goal at the top. Solid arrow =
        attribution · dotted arrow = contribution · highlighted band =
        accountability ceiling.
      </p>

      <div className="mt-3 overflow-auto rounded-lg border border-border bg-white p-4">
        {rendering && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Rendering diagram…
          </div>
        )}
        {error && (
          <div className="text-sm text-red-700">
            Couldn&apos;t render the diagram: {error}
            <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {definition}
            </pre>
          </div>
        )}
        {/* mermaid injects the SVG here */}
        <div ref={containerRef} className={error ? "hidden" : ""} />
      </div>
    </div>
  );
}
