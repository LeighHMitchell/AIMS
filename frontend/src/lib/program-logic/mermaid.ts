/**
 * Render a program-logic graph as a Mermaid flowchart definition (pure string).
 *
 * Direction is bottom-to-top (BT): activities/inputs sit at the base and
 * impact/goal at the top, matching how the tiered builder reads. Each tier is a
 * labelled subgraph band. Edge style encodes link type:
 *   attribution  -> solid arrow  (-->)
 *   contribution -> dotted arrow (-.->)
 *
 * Styling lives here (classDef / style / linkStyle) so every renderer — the
 * profile read-only view and the editor's DiagramDialog — looks identical.
 * Theme/font/spacing are set via mermaid.initialize() at each call site. Nodes
 * are colour-coded by tier on a soft ascending ramp (slate → violet); the
 * accountability-ceiling tier is highlighted in amber.
 */
import type { ProgramLogicGraph, LogicNodeRow } from "./types";

function esc(s: string): string {
  // Mermaid label text inside quotes — strip characters that break parsing.
  return s
    .replace(/"/g, "'")
    .replace(/[\[\]{}|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Curated soft palette, base (bottom tier) → top tier. fill = node interior,
// stroke = node + band border, text = label colour.
const TIER_RAMP: { fill: string; stroke: string; text: string }[] = [
  { fill: "#f1f5f9", stroke: "#94a3b8", text: "#334155" }, // slate
  { fill: "#eff6ff", stroke: "#93c5fd", text: "#1e40af" }, // blue
  { fill: "#ecfeff", stroke: "#67e8f9", text: "#155e75" }, // cyan
  { fill: "#f0fdfa", stroke: "#5eead4", text: "#115e59" }, // teal
  { fill: "#eef2ff", stroke: "#a5b4fc", text: "#3730a3" }, // indigo
  { fill: "#faf5ff", stroke: "#d8b4fe", text: "#6b21a8" }, // violet
];
const CEILING = { fill: "#fffbeb", stroke: "#f59e0b", text: "#92400e" };

export function toMermaid(
  graph: ProgramLogicGraph,
  includeNodeIds?: Set<string>
): string {
  const tiersAsc = [...graph.tiers].sort((a, b) => a.level_order - b.level_order);
  const nodes = graph.nodes.filter(
    (n) => !includeNodeIds || includeNodeIds.has(n.id)
  );

  if (nodes.length === 0) return 'flowchart BT\n  empty["No nodes to display"]';

  const idOf = new Map<string, string>();
  nodes.forEach((n, i) => idOf.set(n.id, `n${i}`));

  const byTier = new Map<string, LogicNodeRow[]>();
  nodes.forEach((n) => {
    const list = byTier.get(n.tier_id) ?? [];
    list.push(n);
    byTier.set(n.tier_id, list);
  });

  const palFor = (tierIndex: number, ceiling: boolean) =>
    ceiling ? CEILING : TIER_RAMP[Math.min(tierIndex, TIER_RAMP.length - 1)];

  const lines: string[] = ["flowchart BT"];

  // Tier bands, bottom (level 0) to top. Rounded nodes "(...)" read softer than
  // sharp rectangles.
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = (byTier.get(tier.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (tierNodes.length === 0) return;
    const ceil = tier.attribution_boundary ? " — accountability ceiling" : "";
    lines.push(`  subgraph T${ti}["${esc(tier.name + ceil)}"]`);
    lines.push("    direction LR");
    tierNodes.forEach((n) => {
      const tag = n.scope === "activity" ? "«activity» " : "";
      lines.push(`    ${idOf.get(n.id)}("${esc(tag + n.statement)}")`);
    });
    lines.push("  end");
  });

  // Edges
  graph.edges.forEach((e) => {
    const a = idOf.get(e.from_node_id);
    const b = idOf.get(e.to_node_id);
    if (!a || !b) return;
    lines.push(`  ${a} ${e.link_type === "contribution" ? "-.->" : "-->"} ${b}`);
  });
  lines.push("  linkStyle default stroke:#94a3b8,stroke-width:1.5px;");

  // Per-tier node colour classes (ceiling tier overrides to amber, bolder border).
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = byTier.get(tier.id) ?? [];
    if (tierNodes.length === 0) return;
    const pal = palFor(ti, tier.attribution_boundary);
    const sw = tier.attribution_boundary ? "2px" : "1px";
    lines.push(
      `  classDef tier${ti} fill:${pal.fill},stroke:${pal.stroke},color:${pal.text},stroke-width:${sw};`
    );
    const ids = tierNodes.map((n) => idOf.get(n.id)).filter(Boolean);
    lines.push(`  class ${ids.join(",")} tier${ti};`);
  });

  // Band styling — white interior so the coloured nodes pop, tier-tinted border
  // + label. Ceiling band gets the amber accent.
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = byTier.get(tier.id) ?? [];
    if (tierNodes.length === 0) return;
    const pal = palFor(ti, tier.attribution_boundary);
    lines.push(
      `  style T${ti} fill:#ffffff,stroke:${pal.stroke},stroke-width:1px,color:${pal.text};`
    );
  });

  return lines.join("\n");
}
