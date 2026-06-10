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
 * Theme/font/spacing are set via mermaid.initialize() at each call site. The
 * diagram is monochrome (greyscale); the accountability ceiling is drawn as a
 * separate black dotted divider line (see drawAccountabilityCeiling).
 */
import type { ProgramLogicGraph, LogicNodeRow } from "./types";

function esc(s: string): string {
  // Mermaid label text inside quotes — strip characters that break parsing
  // (quotes, backticks, angle brackets, bracket/brace/pipe). We add our own
  // <br> separators after escaping, so stripping < > here is safe.
  return s
    .replace(/["`]/g, "'")
    .replace(/[<>\[\]{}|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Monochrome (greyscale) palette. Nodes = light grey on grey border, bands =
// white with a grey border + near-black title.
const NODE = { fill: "#f1f5f9", stroke: "#94a3b8", text: "#1f2937" };
const BAND = { stroke: "#cbd5e1", text: "#111827" };

// Tier names are used as both band headings (plural when the tier holds several
// nodes) and per-node identifier prefixes (singular). The tier name in the data
// may be either form, so normalise both ways. "Activities / Inputs" keeps only
// its first segment for the singular node prefix ("Activity").
function singularize(name: string): string {
  const head = name.split("/")[0].trim();
  if (/ies$/i.test(head)) return head.replace(/ies$/i, "y"); // Activities → Activity
  if (/ss$/i.test(head)) return head; // ...ss stays (e.g. "Progress")
  if (/s$/i.test(head)) return head.replace(/s$/i, ""); // Outputs → Output
  return head;
}
function pluralize(name: string): string {
  if (/s$/i.test(name)) return name; // already plural ("Outputs")
  if (/y$/i.test(name)) return name.replace(/y$/i, "ies");
  return name + "s"; // Outcome → Outcomes
}

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

  const lines: string[] = ["flowchart BT"];

  // Tier bands, bottom (level 0) to top. Rounded nodes "(...)" read softer than
  // sharp rectangles.
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = (byTier.get(tier.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (tierNodes.length === 0) return;
    const multi = tierNodes.length > 1;
    // Band heading: plural when the tier holds more than one node.
    const heading = multi ? pluralize(tier.name) : tier.name;
    lines.push(`  subgraph T${ti}["${esc(heading)}"]`);
    lines.push("    direction LR");
    // Per-node identifier prefix: singular tier word, numbered only when there
    // is more than one (e.g. "Objective"; "Output 1", "Output 2").
    const singular = singularize(tier.name);
    tierNodes.forEach((n, ni) => {
      const tag = n.scope === "activity" ? "«activity» " : "";
      const code = multi ? `${singular} ${ni + 1}` : singular;
      // Plain (non-markdown) label so Mermaid renders pure SVG <text>, not an
      // HTML <foreignObject> — the latter is unsupported by Preview / Illustrator
      // / most SVG viewers, which is why downloaded files looked broken. The
      // identifier sits on its own line (<br>) and is bolded afterwards by
      // boldNodeIdLabels (a presentation attribute that renders everywhere).
      const label = `${esc(code)}<br>${esc(tag + n.statement)}`;
      lines.push(`    ${idOf.get(n.id)}("${label}")`);
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

  // Single monochrome node class for every node.
  const allIds = nodes.map((n) => idOf.get(n.id)).filter(Boolean);
  lines.push(
    `  classDef node fill:${NODE.fill},stroke:${NODE.stroke},color:${NODE.text},stroke-width:1px;`
  );
  lines.push(`  class ${allIds.join(",")} node;`);

  // Band styling — white interior, grey border + near-black title. The
  // accountability ceiling is drawn separately as a horizontal divider line
  // (see drawAccountabilityCeiling), not a band border.
  tiersAsc.forEach((tier, ti) => {
    const tierNodes = byTier.get(tier.id) ?? [];
    if (tierNodes.length === 0) return;
    lines.push(
      `  style T${ti} fill:#ffffff,stroke:${BAND.stroke},stroke-width:1px,color:${BAND.text};`
    );
  });

  return lines.join("\n");
}

/**
 * The bold identifier strings, in render order, exactly as toMermaid emits them
 * ("Activity 1", … "Objective", "Goal"). Passed to boldNodeIdLabels so it knows
 * how much of each node label is the identifier.
 */
export function getNodeIdLabels(graph: ProgramLogicGraph): string[] {
  const tiers = [...graph.tiers].sort((a, b) => a.level_order - b.level_order);
  const byTier = new Map<string, LogicNodeRow[]>();
  graph.nodes.forEach((n) => {
    const l = byTier.get(n.tier_id) ?? [];
    l.push(n);
    byTier.set(n.tier_id, l);
  });
  const out: string[] = [];
  tiers.forEach((t) => {
    const tn = byTier.get(t.id) ?? [];
    const multi = tn.length > 1;
    const singular = singularize(t.name);
    tn.forEach((_, ni) => out.push(multi ? `${singular} ${ni + 1}` : singular));
  });
  return out;
}

/**
 * Bold the identifier line(s) of each node label in a rendered (pure-SVG-text)
 * diagram. Mermaid renders the label as a <text> with one line-tspan (x="0")
 * per wrapped line; the leading line(s) are the identifier. We set font-weight
 * as a presentation attribute so it renders in every SVG viewer (Preview,
 * Illustrator, browsers). Idempotent.
 */
export function boldNodeIdLabels(
  container: HTMLElement,
  idStrings: string[]
): void {
  const svg = container.querySelector("svg");
  if (!svg) return;
  // Longest first so "Output 1" wins over a hypothetical "Output".
  const ids = idStrings
    .map((s) => s.replace(/\s+/g, ""))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  svg.querySelectorAll<SVGGElement>("g.node").forEach((node) => {
    const text = node.querySelector("text");
    if (!text) return;
    const lines = Array.from(text.children).filter(
      (el) => el.tagName.toLowerCase() === "tspan" && el.getAttribute("x") === "0"
    ) as SVGElement[];
    if (lines.length === 0) return;
    const full = lines.map((l) => l.textContent || "").join("").replace(/\s+/g, "");
    const id = ids.find((i) => full.startsWith(i));
    if (!id) {
      lines[0].setAttribute("font-weight", "700");
      return;
    }
    let acc = "";
    for (const ln of lines) {
      if (acc.length >= id.length) break;
      // Set on the line tspan and every descendant tspan (the actual text often
      // lives in nested word-level tspans that don't reliably inherit weight).
      ln.setAttribute("font-weight", "700");
      ln.querySelectorAll("tspan").forEach((t) =>
        t.setAttribute("font-weight", "700")
      );
      acc += (ln.textContent || "").replace(/\s+/g, "");
    }
  });
}

/**
 * Serialize a rendered Mermaid SVG into a self-contained standalone file string.
 *
 * Two problems are fixed here:
 *  1. Mermaid emits `width="100%"` + `max-width` and no height, which renders
 *     wrong when the .svg is opened outside a sized container (Preview, Figma,
 *     Illustrator, docs). We bake explicit width/height from the viewBox and
 *     drop the responsive sizing.
 *  2. Markdown-string labels render as HTML (`<p>…<br>…`) inside <foreignObject>.
 *     `.outerHTML` serializes void elements like <br> unclosed → invalid XML, so
 *     the file fails to parse in strict viewers. We serialize via XMLSerializer,
 *     which produces well-formed XML (self-closed <br/>).
 * A white background and an XML prolog are also added.
 */
export function serializeStandaloneSvg(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  // Compute the viewBox from the actual rendered content bounds plus a margin,
  // rather than trusting Mermaid's tight viewBox. Other engines (Preview,
  // Illustrator) render text — especially the bold identifiers — slightly wider,
  // which overflowed Mermaid's box and got clipped at the canvas edge. The
  // margin gives slack so nothing is cut off, and reads as padding.
  let minX = 0,
    minY = 0,
    w = 0,
    h = 0;
  try {
    const bb = svgEl.getBBox();
    const m = Math.max(28, bb.width * 0.04);
    minX = bb.x - m;
    minY = bb.y - m;
    w = bb.width + 2 * m;
    h = bb.height + 2 * m;
  } catch {
    const vb = svgEl.getAttribute("viewBox");
    [minX, minY, w, h] = vb ? vb.split(/[\s,]+/).map(Number) : [0, 0, 0, 0];
  }
  if (w && h) {
    clone.setAttribute(
      "viewBox",
      `${minX} ${minY} ${w} ${h}`
    );
    clone.setAttribute("width", String(Math.round(w)));
    clone.setAttribute("height", String(Math.round(h)));
  }
  clone.removeAttribute("style"); // drop max-width:100%
  // Font-family also comes from the <style> block; set it on the root (inherited
  // by all text) so CSS-ignoring viewers don't fall back to serif (which also
  // shifts text metrics and overflows the boxes).
  clone.setAttribute(
    "font-family",
    "ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif"
  );
  if (!clone.getAttribute("xmlns"))
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("xmlns:xlink"))
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  // White background rect so the file isn't transparent in image viewers.
  if (w && h) {
    const NS = "http://www.w3.org/2000/svg";
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", String(minX || 0));
    bg.setAttribute("y", String(minY || 0));
    bg.setAttribute("width", String(Math.round(w)));
    bg.setAttribute("height", String(Math.round(h)));
    bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild);
  }
  // Bake the few styles that Mermaid leaves to the <style> block as presentation
  // attributes, so viewers that ignore embedded CSS (Illustrator, Sketch, Figma,
  // Keynote, etc.) still render correctly. The big one: edge curves are open
  // paths that MUST have fill:none, otherwise they fill solid black.
  clone
    .querySelectorAll(".flowchart-link, .edgePaths path, path.relation")
    .forEach((p) => p.setAttribute("fill", "none"));
  // Arrowheads should be filled with the line colour, not default black.
  clone
    .querySelectorAll(
      "marker .arrowMarkerPath, marker path, marker polygon, marker circle"
    )
    .forEach((m) => m.setAttribute("fill", "#94a3b8"));
  // Empty edge-label backings shouldn't paint a black box.
  clone
    .querySelectorAll("rect.text")
    .forEach((r) => r.setAttribute("fill", "none"));
  // Band titles get their larger+bold size from the <style> themeCSS; bake it so
  // CSS-ignoring viewers keep the heading hierarchy.
  clone
    .querySelectorAll(".cluster-label text, .cluster-label tspan")
    .forEach((t) => {
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-size", "19px");
    });
  // Node + cluster labels are centred via the CSS rule `.node .label text {
  // text-anchor: middle }`. Bake text-anchor so CSS-ignoring viewers don't
  // left-anchor the text (which pushes it off to the right of the box).
  clone
    .querySelectorAll(".node .label text, .cluster-label text")
    .forEach((t) => {
      t.setAttribute("text-anchor", "middle");
      t.querySelectorAll("tspan").forEach((s) =>
        s.setAttribute("text-anchor", "middle")
      );
    });
  const xml = new XMLSerializer().serializeToString(clone);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
}

/**
 * The band heading of the accountability-ceiling tier (attribution_boundary),
 * if any — pluralised exactly as toMermaid renders it, so drawAccountabilityCeiling
 * can match the cluster by its label text.
 */
export function getCeilingTierName(graph: ProgramLogicGraph): string | null {
  const t = graph.tiers.find((tier) => tier.attribution_boundary);
  if (!t) return null;
  const count = graph.nodes.filter((n) => n.tier_id === t.id).length;
  return count > 1 ? pluralize(t.name) : t.name;
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
  line.setAttribute("stroke", "#000000");
  line.setAttribute("stroke-width", "4");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-dasharray", "2 9");
  svg.appendChild(line);

  const label = document.createElementNS(NS, "text");
  label.setAttribute("data-pl-ceiling", "1");
  label.setAttribute("x", String(right.x));
  label.setAttribute("y", String(right.y - 7));
  label.setAttribute("text-anchor", "end");
  label.setAttribute("fill", "#000000");
  // Same size as the tier band headings (e.g. "Goal").
  label.setAttribute("font-size", "19");
  label.setAttribute("font-weight", "700");
  label.textContent = "Accountability Ceiling";
  svg.appendChild(label);
}
