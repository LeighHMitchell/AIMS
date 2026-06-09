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
  // Mermaid label text inside quotes / markdown strings — strip characters that
  // break parsing (quotes, backticks, bracket/brace/pipe).
  return s
    .replace(/["`]/g, "'")
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
    lines.push(`  subgraph T${ti}["${esc(tier.name)}"]`);
    lines.push("    direction LR");
    tierNodes.forEach((n, ni) => {
      const tag = n.scope === "activity" ? "«activity» " : "";
      // Markdown-string label: a bold per-tier identifier (e.g. EOPO 1) on the
      // first line, then the statement. Requires backtick-wrapped label.
      const code = `${tier.short_code} ${ni + 1}`;
      const label = `**${esc(code)}**\n${esc(tag + n.statement)}`;
      lines.push(`    ${idOf.get(n.id)}("\`${label}\`")`);
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

  // Band styling — white interior so the coloured nodes pop, tier-tinted solid
  // border + label. The accountability ceiling is drawn separately as a
  // horizontal divider line (see drawAccountabilityCeiling), not a band border.
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

/** The name of the accountability-ceiling tier (attribution_boundary), if any. */
export function getCeilingTierName(graph: ProgramLogicGraph): string | null {
  const t = graph.tiers.find((tier) => tier.attribution_boundary);
  return t ? t.name : null;
}

/**
 * Draw a full-width horizontal dotted "accountability ceiling" divider into an
 * already-rendered Mermaid SVG, positioned in the gap directly above the ceiling
 * tier's band (i.e. between it and the tier above). Mermaid has no primitive for
 * a diagram-spanning rule, so we post-process the SVG.
 *
 * Positioning is done in screen coordinates (getBoundingClientRect) then mapped
 * back into the SVG user space via the screen CTM, so it is robust against
 * Mermaid's internal group transforms and viewBox scaling. Idempotent.
 */
export function drawAccountabilityCeiling(
  container: HTMLElement,
  ceilingLabel: string
): void {
  const svg = container.querySelector("svg");
  if (!svg) return;
  svg.querySelectorAll("[data-pl-ceiling]").forEach((el) => el.remove());

  const clusters = Array.from(
    svg.querySelectorAll<SVGGElement>("g.cluster")
  );
  if (clusters.length === 0) return;

  let target: SVGGElement | null = null;
  for (const c of clusters) {
    const txt = (c.querySelector(".cluster-label")?.textContent || "").trim();
    if (txt === ceilingLabel) {
      target = c;
      break;
    }
  }
  if (!target) return;

  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const inv = ctm.inverse();
  const toUser = (x: number, y: number) => {
    const p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    return p.matrixTransform(inv);
  };

  const trect = target.getBoundingClientRect();
  // Nearest cluster sitting above the ceiling band (its bottom above our top).
  let aboveBottom: number | null = null;
  for (const c of clusters) {
    if (c === target) continue;
    const r = c.getBoundingClientRect();
    if (r.bottom <= trect.top + 1) {
      if (aboveBottom === null || r.bottom > aboveBottom) aboveBottom = r.bottom;
    }
  }
  const yScreen =
    aboveBottom !== null ? (aboveBottom + trect.top) / 2 : trect.top - 14;

  const svgRect = svg.getBoundingClientRect();
  const left = toUser(svgRect.left + 4, yScreen);
  const right = toUser(svgRect.right - 4, yScreen);

  const NS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(NS, "line");
  line.setAttribute("data-pl-ceiling", "1");
  line.setAttribute("x1", String(left.x));
  line.setAttribute("y1", String(left.y));
  line.setAttribute("x2", String(right.x));
  line.setAttribute("y2", String(right.y));
  line.setAttribute("stroke", "#f59e0b");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", "7 5");
  svg.appendChild(line);

  const label = document.createElementNS(NS, "text");
  label.setAttribute("data-pl-ceiling", "1");
  label.setAttribute("x", String(right.x));
  label.setAttribute("y", String(right.y - 6));
  label.setAttribute("text-anchor", "end");
  label.setAttribute("fill", "#b45309");
  label.setAttribute("font-size", "12");
  label.setAttribute("font-weight", "700");
  label.textContent = "Accountability ceiling";
  svg.appendChild(label);
}
