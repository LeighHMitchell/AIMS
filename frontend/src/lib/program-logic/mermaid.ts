/**
 * Render a program-logic graph as a Mermaid flowchart definition (pure string).
 *
 * Direction is bottom-to-top (BT): activities/inputs sit at the base and
 * impact/goal at the top, matching how the tiered builder reads. Each tier is a
 * labelled subgraph band. Edge style encodes link type:
 *   attribution  -> solid arrow  (-->)
 *   contribution -> dotted arrow (-.->)
 * Nodes in the accountability-ceiling tier are highlighted.
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

function truncate(s: string, n = 72): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function toMermaid(
  graph: ProgramLogicGraph,
  includeNodeIds?: Set<string>
): string {
  const tiersAsc = [...graph.tiers].sort((a, b) => a.level_order - b.level_order);
  const nodes = graph.nodes.filter(
    (n) => !includeNodeIds || includeNodeIds.has(n.id)
  );

  if (nodes.length === 0) return "flowchart BT\n  empty[\"No nodes to display\"]";

  const idOf = new Map<string, string>();
  nodes.forEach((n, i) => idOf.set(n.id, `n${i}`));

  const byTier = new Map<string, LogicNodeRow[]>();
  nodes.forEach((n) => {
    const list = byTier.get(n.tier_id) ?? [];
    list.push(n);
    byTier.set(n.tier_id, list);
  });

  const lines: string[] = ["flowchart BT"];

  // Tier bands, bottom (level 0) to top
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = (byTier.get(tier.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (tierNodes.length === 0) return;
    const ceil = tier.attribution_boundary ? " — accountability ceiling" : "";
    lines.push(`  subgraph T${ti}["${esc(tier.short_code + " · " + tier.name + ceil)}"]`);
    lines.push("    direction LR");
    tierNodes.forEach((n) => {
      const tag = n.scope === "activity" ? "«activity» " : "";
      lines.push(`    ${idOf.get(n.id)}["${esc(tag + truncate(n.statement))}"]`);
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

  // Highlight ceiling-tier nodes
  const ceiling = tiersAsc.find((t) => t.attribution_boundary);
  if (ceiling) {
    const ids = (byTier.get(ceiling.id) ?? [])
      .map((n) => idOf.get(n.id))
      .filter(Boolean);
    if (ids.length) {
      lines.push("  classDef ceiling fill:#fef3c7,stroke:#f59e0b,stroke-width:2px;");
      lines.push(`  class ${ids.join(",")} ceiling;`);
    }
  }

  return lines.join("\n");
}
